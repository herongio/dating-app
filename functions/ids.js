// Match, swipe, friend-request and block-pair doc ids are all built from
// two uids. Firebase Auth uids never contain "_", so joining on it is safe
// to split back apart.

// Sorted, so both users derive the same id regardless of who acts first.
// `matches/{id}` and `blockPairs/{id}` share this id shape, which lets the
// Firestore rules check "is this pair blocked?" with a single exists().
function pairId(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

// Directional — "{actor}_{target}", used by swipes, friendRequests, blocks.
function directedId(fromUid, toUid) {
  return `${fromUid}_${toUid}`;
}

module.exports = { pairId, directedId };
