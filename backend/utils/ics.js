// Simple iCalendar (.ics) generator for reservation confirmations
// Creates a 90-minute event starting at reservation_date + reservation_time

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toUTCString(dt) {
  const yyyy = dt.getUTCFullYear();
  const mm = pad(dt.getUTCMonth() + 1);
  const dd = pad(dt.getUTCDate());
  const hh = pad(dt.getUTCHours());
  const mi = pad(dt.getUTCMinutes());
  const ss = pad(dt.getUTCSeconds());
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

function buildReservationICS({ reservation, restaurant }) {
  try {
    const dateStr = reservation.reservation_date; // YYYY-MM-DD
    const timeStr = String(reservation.reservation_time).slice(0, 5); // HH:MM
    const [y, m, d] = dateStr.split('-').map((x) => parseInt(x, 10));
    const [H, M] = timeStr.split(':').map((x) => parseInt(x, 10));

    // Build local Date then convert to UTC string
    const start = new Date(Date.UTC(y, (m - 1), d, H, M, 0));
    const end = new Date(start.getTime() + 90 * 60 * 1000);

    const dtstamp = toUTCString(new Date());
    const dtstart = toUTCString(start);
    const dtend = toUTCString(end);

    const summary = `Reservation at ${restaurant?.name || 'Restaurant'}`;
    const description = `Party: ${reservation.party_size}\nName: ${reservation.customer_name || ''}`;
    const location = restaurant?.address ? restaurant.address.replace(/\n/g, ' ') : '';
    const uid = `${reservation.id || Date.now()}@ordereasy.app`;

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OrderEasy//Reservation//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${summary}`,
      location ? `LOCATION:${location}` : '',
      `DESCRIPTION:${description}`,
      'END:VEVENT',
      'END:VCALENDAR',
      ''
    ].filter(Boolean);

    const content = lines.join('\r\n');
    return {
      filename: 'reservation.ics',
      content,
      contentType: 'text/calendar; charset=utf-8; method=PUBLISH'
    };
  } catch (e) {
    return null;
  }
}

module.exports = { buildReservationICS };

