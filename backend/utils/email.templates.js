function formatDate(dateStr, timeStr) {
  try {
    return `${dateStr} ${String(timeStr).slice(0,5)}`;
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
};

