// Trip dates are stored as "YYYY-MM-DD" strings rather than timestamps: a
// trip is a calendar range, not an instant, so comparing them lexically is
// both correct and free of timezone drift between travellers.

export const TRIP_INTENTS = [
  {
    value: "companion",
    label: "동행만 구해요",
    hint: "같이 다닐 사람만 찾아요 · 만남을 찾는 분과는 매칭되지 않아요",
  },
  { value: "dating", label: "만남 열려있어요", hint: "여행지에서 좋은 사람을 만나고 싶어요" },
  { value: "both", label: "둘 다 좋아요", hint: "동행이든 만남이든 열려있어요" },
];

// The companion pool is closed, not merely preferred. Someone who ticked
// "동행만" is never shown to — and never shown — anyone open to dating.
export const CLOSED_INTENT = "companion";

export function intentLabel(value) {
  return TRIP_INTENTS.find((i) => i.value === value)?.label ?? value;
}

// "동행만" is a separate pool: it matches only itself, and "둘 다" does not
// bridge into it. Letting "둘 다" through would halve the wait for a match but
// hand every companion-seeker the one experience they opted out of — and in a
// service where strangers travel together, that is the failure that empties
// the app. "만남"과 "둘 다" are mutually compatible as before.
export function intentsOverlap(a, b) {
  if (a === CLOSED_INTENT || b === CLOSED_INTENT) return a === b;
  return true;
}

// Gender preference is a dating concern; applying it to a pure
// companion-finding match would filter out perfectly good travel buddies.
// With the closed pool above, a mixed companion/dating pair can no longer
// reach this function at all — it stays symmetric so the rule holds even if
// the pools are ever reopened.
export function isDatingMatch(a, b) {
  return a !== CLOSED_INTENT && b !== CLOSED_INTENT;
}

export function toDateKey(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function todayKey() {
  return toDateKey(new Date());
}

export function addDays(key, days) {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function nightsBetween(startKey, endKey) {
  return Math.round((fromDateKey(endKey) - fromDateKey(startKey)) / 86400000);
}

export function datesOverlap(a, b) {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

// The number of calendar days two trips share — the headline number on a
// card, since a one-day overlap is a very different proposition from a week.
export function overlapDays(a, b) {
  const start = a.startDate > b.startDate ? a.startDate : b.startDate;
  const end = a.endDate < b.endDate ? a.endDate : b.endDate;
  return nightsBetween(start, end) + 1;
}

export function tripsMatch(mine, theirs) {
  return (
    mine.destinationId === theirs.destinationId &&
    datesOverlap(mine, theirs) &&
    intentsOverlap(mine.intent, theirs.intent)
  );
}

export function formatDateKey(key) {
  const date = fromDateKey(key);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function formatTripDates({ startDate, endDate }) {
  const nights = nightsBetween(startDate, endDate);
  const span = nights === 0 ? "당일" : `${nights}박 ${nights + 1}일`;
  return `${formatDateKey(startDate)} – ${formatDateKey(endDate)} · ${span}`;
}

// "3일 뒤 출발" / "여행 중" / "지난 여행" — enough context to sort a list by
// urgency without reading every date.
export function tripStatus(trip, today = todayKey()) {
  if (trip.endDate < today) return { label: "지난 여행", past: true };
  if (trip.startDate <= today) return { label: "여행 중", past: false };
  const days = nightsBetween(today, trip.startDate);
  return { label: days === 1 ? "내일 출발" : `${days}일 뒤 출발`, past: false };
}
