// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

// Declare Deno for TypeScript if environment doesn't have it
declare const Deno: {
    env: { get(key: string): string | undefined };
    serve: (handler: (req: Request) => Promise<Response>) => void;
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    // @ts-ignore: Version mismatch with types
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req: Request) => {
    const signature = req.headers.get('Stripe-Signature');
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
        return new Response('Missing signature or secret', { status: 400 });
    }

    let event;
    try {
        event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            webhookSecret,
            undefined,
            cryptoProvider
        );
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new Response(err.message, { status: 400 });
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    try {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);

                const { reservationId, tipAmount } = paymentIntent.metadata || {};

                // 1. Handle Reservation Confirmation
                if (reservationId) {
                    const { data: reservation, error: fetchError } = await supabase
                        .from('reservations')
                        .select('*')
                        .eq('id', reservationId)
                        .single();

                    if (fetchError || !reservation) {
                        console.warn(`Reservation ${reservationId} not found`);
                    } else if (reservation.status === 'tentative') {
                        const { error: updateError } = await supabase
                            .from('reservations')
                            .update({
                                status: 'confirmed',
                                payment_id: paymentIntent.id,
                                confirmed_at: new Date().toISOString(),
                                expires_at: null,
                                updated_at: new Date().toISOString(),
                            })
                            .eq('id', reservationId);

                        if (updateError) {
                            console.error('Failed to update reservation:', updateError);
                        } else {
                            // Update table status if assigned
                            if (reservation.table_id) {
                                await supabase
                                    .from('tables')
                                    .update({ status: 'reserved', updated_at: new Date().toISOString() })
                                    .eq('id', reservation.table_id);
                            }
                            console.log(`Reservation ${reservationId} confirmed`);
                        }
                    }
                }

                // 2. Handle Order Confirmation (Find order by payment_intent_id)
                // Note: Orders might be created BEFORE or AFTER payment depending on flow.
                // If created BEFORE, we update it here.
                const { data: order, error: orderError } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('payment_intent_id', paymentIntent.id)
                    .maybeSingle();

                if (order) {
                    const updateData: any = {
                        payment_status: 'completed',
                        updated_at: new Date().toISOString(),
                    };

                    if (tipAmount) {
                        updateData.tip_amount = parseFloat(tipAmount);
                        // Update total_amount to include tip if not already included
                        // Assuming original total_amount didn't include tip yet if it was pending
                        if (order.total_amount) {
                            updateData.total_amount = parseFloat(order.total_amount) + parseFloat(tipAmount);
                        }
                    }

                    const { error: updateOrderError } = await supabase
                        .from('orders')
                        .update(updateData)
                        .eq('id', order.id);

                    if (updateOrderError) {
                        console.error('Failed to update order:', updateOrderError);
                    } else {
                        console.log(`Order ${order.id} payment confirmed`);
                    }
                }

                break;
            }
            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                console.log(`PaymentIntent failed: ${paymentIntent.id}`);
                // Optional: Handle failure (e.g., release reservation)
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err: any) {
        console.error('Error processing webhook:', err);
        return new Response(
            JSON.stringify({ error: 'Internal Server Error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});
