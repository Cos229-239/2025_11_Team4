function formatDate(dateStr, timeStr) {
  try {
    return `${dateStr} ${String(timeStr).slice(0, 5)}`;
  } catch {
    return `${dateStr} ${timeStr}`;
  }
}

function reservationCreated({ reservation, restaurant }) {
  const when = formatDate(reservation.reservation_date, reservation.reservation_time);
  const title = `Your reservation at ${restaurant?.name || 'our restaurant'}`;
  const lines = [
    title,
    '',
    `Hi ${reservation.customer_name || 'Guest'},`,
    `Your reservation is confirmed for ${when}.`,
    `Party size: ${reservation.party_size}`,
    restaurant?.name ? `Restaurant: ${restaurant.name}` : null,
    restaurant?.address ? `Address: ${restaurant.address}` : null,
    reservation.table_id ? `Table: #${reservation.table_id}` : null,
    '',
    'We look forward to serving you!',
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin:auto;">
      <h2>${title}</h2>
      <p>Hi ${reservation.customer_name || 'Guest'},</p>
      <p>Your reservation is confirmed for <strong>${when}</strong>.</p>
      <ul>
        <li>Party size: ${reservation.party_size}</li>
        ${restaurant?.name ? `<li>Restaurant: ${restaurant.name}</li>` : ''}
        ${restaurant?.address ? `<li>Address: ${restaurant.address}</li>` : ''}
        ${reservation.table_id ? `<li>Table: #${reservation.table_id}</li>` : ''}
      </ul>
      <p>We look forward to serving you!</p>
    </div>
  `;

  return { subject: `Reservation confirmed — ${restaurant?.name || 'OrderEasy'}`, text: lines, html };
}

module.exports = {
  reservationCreated,
  paymentReceipt
};

function paymentReceipt({ order, items, tip_amount, total }) {
  const date = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString();

  const itemsHtml = items.map(item => `
    <li style="margin-bottom: 8px;">
      <div style="display: flex; justify-content: space-between;">
        <span>${item.quantity}x ${item.menu_item_name}</span>
        <span>$${parseFloat(item.subtotal).toFixed(2)}</span>
      </div>
      ${item.special_instructions ? `<div style="font-size: 12px; color: #666;">Note: ${item.special_instructions}</div>` : ''}
    </li>
  `).join('');

  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
  const tip = parseFloat(tip_amount || 0);

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="text-align: center; color: #FA6C01;">Order Receipt</h2>
      <p style="text-align: center; color: #666;">Thank you for dining with us!</p>
      
      <div style="margin: 20px 0; border-top: 1px dashed #ccc; border-bottom: 1px dashed #ccc; padding: 10px 0;">
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${itemsHtml}
        </ul>
      </div>
      
      <div style="margin-top: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>Subtotal</span>
          <span>$${subtotal.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>Tip</span>
          <span>$${tip.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px;">
          <span>Total</span>
          <span>$${parseFloat(total).toFixed(2)}</span>
        </div>
      </div>
      
      <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #999;">
        <p>Order #${order.id} • ${date} ${time}</p>
        <p>If you have any questions, please contact us.</p>
      </div>
    </div>
  `;

  const text = `
    Order Receipt
    Order #${order.id}
    
    ${items.map(i => `${i.quantity}x ${i.menu_item_name} - $${i.subtotal}`).join('\n')}
    
    Subtotal: $${subtotal.toFixed(2)}
    Tip: $${tip.toFixed(2)}
    Total: $${parseFloat(total).toFixed(2)}
    
    Thank you for your business!
  `;

  return { subject: `Receipt for Order #${order.id}`, html, text };
}

