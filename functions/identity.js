// 본인인증 integration point.
//
// Verifying that someone *holds* a phone number (verification.js) is a
// different and weaker claim than 본인인증, which returns a carrier-confirmed
// name, birthdate and gender. The difference matters here: an age gate built
// on a self-reported number is a checkbox, while one built on a carrier
// birthdate is a gate.
//
// This module is the seam. With no provider configured it returns null and
// the age gate falls back to the self-reported profile age (enforced in
// firestore.rules). Wire PASS / NICE / KCB in by implementing `resolve` to
// exchange the provider's one-time receipt for the verified identity; the
// callers already store whatever it returns as server-trusted and recompute
// adulthood from it.
const PROVIDER = process.env.IDENTITY_PROVIDER ?? "none";

const MIN_ADULT_AGE = 19;

// Korean age gate for a service with dating intent: 만 19세.
function ageFromBirthDate(birthDate, today = new Date()) {
  const [y, m, d] = birthDate.split("-").map(Number);
  let age = today.getFullYear() - y;
  const beforeBirthday =
    today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

function isAdultBirthDate(birthDate, today = new Date()) {
  return ageFromBirthDate(birthDate, today) >= MIN_ADULT_AGE;
}

// Returns { name, birthDate: "YYYY-MM-DD", gender } or null when no provider
// is configured. `receipt` is whatever one-time token the provider hands the
// client after its own flow.
async function resolve(receipt) {
  if (PROVIDER === "none" || !receipt) return null;
  throw new Error(`IDENTITY_PROVIDER "${PROVIDER}" is set but no resolver is implemented`);
}

module.exports = { resolve, isAdultBirthDate, ageFromBirthDate, MIN_ADULT_AGE, PROVIDER };
