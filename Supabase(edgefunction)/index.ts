// @deno-types="https://esm.sh/@supabase/supabase-js@2.45.4?dts"
/// <reference path="./supabase-url-imports.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// Minimal Deno typings so the TypeScript language service in VS Code
// understands the global Deno object when editing locally.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
};

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for(let i = 0; i < len; i++)binary += String.fromCharCode(bytes[i]);
  // deno-lint-ignore no-explicit-any                                                                                                                  
  return btoa(binary);
}
async function verifySignature(
  secret: string,
  body: ArrayBuffer,
  header: string | null
): Promise<boolean> {
  if (!secret || !header) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {
    name: 'HMAC',
    hash: 'SHA-256'
  }, false, [
    'sign'
  ]);
  const sig = await crypto.subtle.sign('HMAC', key, body);
  const digest = toBase64(new Uint8Array(sig));
  return digest === header;
}
async function getSettings(supabase: any, restaurantId?: number | null) {
  if (restaurantId) {
    const r = await supabase.from('reservation_settings').select('cancellation_window_hours,reservation_duration_minutes').eq('restaurant_id', restaurantId).order('updated_at', {
      ascending: false
    }).limit(1).maybeSingle();
    if (r.data) return r.data;
  }
  const g = await supabase.from('reservation_settings').select('cancellation_window_hours,reservation_duration_minutes').is('restaurant_id', null).order('updated_at', {
    ascending: false
  }).limit(1).maybeSingle();
  return g.data || {
    cancellation_window_hours: 12,
    reservation_duration_minutes: 90
  };
}
async function confirmReservation(
  supabase: any,
  reservation: any,
  paymentId: string
): Promise<{ ok: boolean; message?: string }> {
  if (reservation.expires_at && new Date(reservation.expires_at) < new Date()) {
    await supabase.from('reservations').update({
      status: 'expired',
      updated_at: new Date().toISOString()
    }).eq('id', reservation.id);
    return {
      ok: false,
      message: 'expired'
    };
  }
  const settings = await getSettings(supabase, reservation.restaurant_id);
  const rpc = await supabase.rpc('check_reservation_conflicts', {
    p_reservation_id: reservation.id,
    p_table_id: reservation.table_id,
    p_reservation_date: reservation.reservation_date,
    p_reservation_time: reservation.reservation_time,
    p_buffer_minutes: settings.reservation_duration_minutes
  });
  if (rpc.data && rpc.data.length > 0) {
    await supabase.from('reservations').update({
      status: 'expired',
      updated_at: new Date().toISOString()
    }).eq('id', reservation.id);
    return {
      ok: false,
      message: 'conflict'
    };
  }
  const upd = await supabase.from('reservations').update({
    status: 'confirmed',
    payment_id: paymentId,
    confirmed_at: new Date().toISOString(),
    expires_at: null,
    updated_at: new Date().toISOString()
  }).eq('id', reservation.id).select('id, table_id').maybeSingle();
  const row = upd.data;
  if (row?.table_id) {
    await supabase.from('tables').update({
      status: 'reserved',
      updated_at: new Date().toISOString()
    }).eq('id', row.table_id);
  }
  return {
    ok: true
  };
}
async function cancelByPaymentId(
  supabase: any,
  paymentId: string
): Promise<{ ok: boolean; message?: string }> {
  const r = await supabase.from('reservations').select('*').eq('payment_id', paymentId).limit(1).maybeSingle();
  const reservation = r.data;
  if (!reservation) return {
    ok: true,
    message: 'no matching reservation'
  };
  if (![
    'confirmed',
    'tentative'
  ].includes(reservation.status)) return {
    ok: true,
    message: 'status not cancellable'
  };
  const upd = await supabase.from('reservations').update({
    status: 'cancelled',
    updated_at: new Date().toISOString()
  }).eq('id', reservation.id).select('id, table_id').maybeSingle();
  const row = upd.data;
  if (row?.table_id) {
    const count = await supabase.from('reservations').select('id', {
      count: 'exact',
      head: true
    }).eq('table_id', row.table_id).eq('status', 'seated');
    if ((count.count || 0) === 0) {
      await supabase.from('tables').update({
        status: 'available',
        updated_at: new Date().toISOString()
      }).eq('id', row.table_id);
    }
  }
  return {
    ok: true
  };
}
// deno-lint-ignore no-explicit-any                                                                                                                  
function getReservationIdFromPayment(payment: any): number | null {
  const ref = payment?.reference_id || payment?.order_id || payment?.note || null;
  if (ref) {
    const m = String(ref).match(/reservation[_:-]?([0-9]+)/i);
    if (m) return parseInt(m[1], 10);
    if (/^\d+$/.test(String(ref))) return parseInt(String(ref), 10);
  }
  // deno-lint-ignore no-explicit-any                                                                                                                  
  const md = payment?.metadata;
  if (md?.reservation_id) return parseInt(String(md.reservation_id), 10);
  return null;
}
Deno.serve(async (req: Request) => {
  try {
    const secret = Deno.env.get('SQUARE_WEBHOOK_SIGNATURE_KEY') || '';
    const url = new URL(req.url);
    if (url.pathname !== '/square-webhook') return new Response('Not found', {
      status: 404
    });
    const headerSig = req.headers.get('x-square-hmacsha256-signature');
    const bodyBuf = await req.arrayBuffer();
    const valid = await verifySignature(secret, bodyBuf, headerSig);
    if (!valid) return new Response(JSON.stringify({
      success: false,
      message: 'Invalid signature'
    }), {
      status: 400
    });
    const event = JSON.parse(new TextDecoder().decode(new Uint8Array(bodyBuf)));
    const type = event?.type || event?.event_type || '';
    const isPaymentEvent = /payments\.(created|updated)/i.test(type);
    const isRefundEvent = /refunds\.(created|updated)/i.test(type);
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    if (isRefundEvent) {
      const refund = event?.data?.object?.refund || event?.data?.refund || {};
      const refundStatus = refund?.status || '';
      const refundPaymentId = refund?.payment_id || null;
      if (/COMPLETED/i.test(refundStatus) && refundPaymentId) {
        const res = await cancelByPaymentId(supabase, refundPaymentId);
        return new Response(JSON.stringify({
          success: res.ok,
          message: 'refund processed'
        }), {
          status: 200
        });
      }
      return new Response(JSON.stringify({
        success: true,
        message: 'ignored refund event'
      }), {
        status: 200
      });
    }
    if (isPaymentEvent) {
      const payment = event?.data?.object?.payment || event?.data?.payment || {};
      const paymentId = payment?.id || null;
      const status = payment?.status || payment?.payment_status || '';
      if (!/COMPLETED/i.test(status)) return new Response(JSON.stringify({
        success: true,
        message: 'ignored non-completed payment'
      }), {
        status: 200
      });
      const rid = getReservationIdFromPayment(payment);
      let reservation = null;
      if (rid) {
        const r = await supabase.from('reservations').select('*').eq('id', rid).limit(1).maybeSingle();
        reservation = r.data || null;
      }
      if (!reservation && paymentId) {
        const r = await supabase.from('reservations').select('*').eq('payment_id', paymentId).limit(1).maybeSingle();
        reservation = r.data || null;
      }
      if (!reservation) return new Response(JSON.stringify({
        success: true,
        message: 'no matching reservation'
      }), {
        status: 200
      });
      if (reservation.status === 'confirmed') return new Response(JSON.stringify({
        success: true,
        message: 'already confirmed'
      }), {
        status: 200
      });
      if (reservation.status !== 'tentative') return new Response(JSON.stringify({
        success: true,
        message: `skip status ${reservation.status}`
      }), {
        status: 200
      });
      const res = await confirmReservation(supabase, reservation, paymentId || '');
      return new Response(JSON.stringify({
        success: res.ok,
        message: res.ok ? 'confirmed' : res.message
      }), {
        status: 200
      });
    }
    return new Response(JSON.stringify({
      success: true,
      message: 'ignored event',
      type
    }), {
      status: 200
    });
  } catch (e: any) {
    return new Response(JSON.stringify({
      success: false,
      message: e.message
    }), {
      status: 500
    });
  }
});
