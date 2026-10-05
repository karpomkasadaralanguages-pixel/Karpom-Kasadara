// Every timestamp in the app is shown in India Standard Time (IST, UTC+05:30),
// no matter where the viewer's browser or device is set. The server stores
// UTC; these helpers do the conversion at display time.
const IST = 'Asia/Kolkata';

const dateTimeFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST,
  day: '2-digit', month: 'short', year: 'numeric',
  hour: 'numeric', minute: '2-digit', hour12: true,
});

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST,
  day: '2-digit', month: 'short', year: 'numeric',
});

const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: IST }); // YYYY-MM-DD

function valid(value) {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** e.g. "04 Oct 2026, 9:42 pm IST" */
export function formatIST(value) {
  const d = valid(value);
  return d ? `${dateTimeFmt.format(d)} IST` : '—';
}

/** e.g. "04 Oct 2026" (the calendar date in IST) */
export function formatISTDate(value) {
  const d = valid(value);
  return d ? dateFmt.format(d) : '—';
}

/** "YYYY-MM-DD" for the IST calendar day — used to group/filter by day. */
export function istDayKey(value) {
  const d = valid(value);
  return d ? dayKeyFmt.format(d) : '';
}
