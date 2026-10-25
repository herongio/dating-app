const { createHash, randomInt, timingSafeEqual } = require("node:crypto");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue } = require("firebase-admin/firestore");
const { HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { sendVerificationCode, isEmulator } = require("./sms");
const { resolve: resolveIdentity, isAdultBirthDate } = require("./identity");

const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

// Korean mobile numbers, normalised to E.164 so the same handset always
// hashes to the same value no matter how its owner typed it.
function normalizePhone(raw) {
  const digits = String(raw ?? "").replace(/[^\d+]/g, "");
  if (/^01\d{8,9}$/.test(digits)) return `+82${digits.slice(1)}`;
  if (/^\+8210\d{7,8}$/.test(digits)) return digits;
  if (/^8210\d{7,8}$/.test(digits)) return `+${digits}`;
  return null;
}

// The phone number itself is never stored. A hash is enough for the only
// question we ask of it later — "has this handset already verified another
// account?" — and a leaked collection of hashes is not a leaked contact list.
// Peppered so the hashes aren't a rainbow-table lookup over all 100M Korean
// mobile numbers, which a bare SHA-256 of a phone number would be.
function phoneHash(phone) {
  const pepper = process.env.PHONE_HASH_PEPPER ?? "dev-pepper";
  return createHash("sha256").update(`${pepper}:${phone}`).digest("hex");
}

function codeHash(uid, code) {
  return createHash("sha256").update(`${uid}:${code}`).digest("hex");
}

function equalHashes(a, b) {
  const bufA = Buffer.from(String(a), "utf8");
  const bufB = Buffer.from(String(b), "utf8");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function requireUid(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요해요.");
  return uid;
}

async function start(db, request) {
  const uid = requireUid(request);
  const phone = normalizePhone(request.data?.phone);
  if (!phone) {
    throw new HttpsError("invalid-argument", "휴대폰 번호를 다시 확인해주세요.");
  }

  const ref = db.doc(`phoneVerifications/${uid}`);
  const existing = await ref.get();
  // Rate limit before generating anything: otherwise a loop on this endpoint
  // is a way to send someone else a hundred texts on our bill.
  if (existing.exists) {
    const sentAt = existing.data().sentAt?.toMillis?.() ?? 0;
    const waitMs = RESEND_COOLDOWN_MS - (Date.now() - sentAt);
    if (waitMs > 0) {
      throw new HttpsError(
        "resource-exhausted",
        `${Math.ceil(waitMs / 1000)}초 후에 다시 시도해주세요.`
      );
    }
  }

  const hash = phoneHash(phone);
  const claimed = await db.doc(`phoneHashes/${hash}`).get();
  if (claimed.exists && claimed.data().uid !== uid) {
    throw new HttpsError(
      "already-exists",
      "이미 다른 계정에서 인증된 번호예요. 기존 계정으로 로그인해주세요."
    );
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await ref.set({
    phoneHash: hash,
    codeHash: codeHash(uid, code),
    attempts: 0,
    sentAt: FieldValue.serverTimestamp(),
    expiresAt: Date.now() + CODE_TTL_MS,
  });

  try {
    await sendVerificationCode(phone, code);
  } catch (err) {
    // Clear the pending doc, or a provider outage leaves the person rate
    // limited for a minute with no code to show for it.
    await ref.delete();
    logger.error("SMS delivery failed", { uid, message: err.message });
    throw new HttpsError("unavailable", "인증번호를 보내지 못했어요. 잠시 후 다시 시도해주세요.");
  }
  logger.info("Verification code sent", { uid });

  return {
    sent: true,
    expiresInSeconds: CODE_TTL_MS / 1000,
    // Only ever populated against the emulator, where no SMS is sent.
    ...(isEmulator() ? { devCode: code } : {}),
  };
}

async function confirm(db, request) {
  const uid = requireUid(request);
  const code = String(request.data?.code ?? "").trim();

  const ref = db.doc(`phoneVerifications/${uid}`);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("failed-precondition", "인증번호를 먼저 요청해주세요.");
  }

  const { codeHash: expected, attempts = 0, expiresAt, phoneHash: hash } = snap.data();
  if (Date.now() > expiresAt) {
    await ref.delete();
    throw new HttpsError("deadline-exceeded", "인증번호가 만료됐어요. 다시 요청해주세요.");
  }
  if (attempts >= MAX_ATTEMPTS) {
    throw new HttpsError("resource-exhausted", "시도 횟수를 초과했어요. 다시 요청해주세요.");
  }
  if (!equalHashes(expected, codeHash(uid, code))) {
    await ref.update({ attempts: FieldValue.increment(1) });
    const left = MAX_ATTEMPTS - attempts - 1;
    throw new HttpsError(
      "invalid-argument",
      left > 0 ? `인증번호가 맞지 않아요. (${left}번 더 시도할 수 있어요)` : "시도 횟수를 초과했어요."
    );
  }

  // Re-checked at confirm time, not just at send time: two accounts can have
  // a code in flight for the same handset at once, and only the first to
  // confirm may claim it.
  const claimed = await db.doc(`phoneHashes/${hash}`).get();
  if (claimed.exists && claimed.data().uid !== uid) {
    await ref.delete();
    throw new HttpsError("already-exists", "이미 다른 계정에서 인증된 번호예요.");
  }

  // When a 본인인증 provider is wired in, its carrier-confirmed birthdate is
  // what decides adulthood; with no provider the gate is the self-reported
  // age enforced in firestore.rules. See functions/identity.js.
  const identity = await resolveIdentity(request.data?.identityReceipt).catch((err) => {
    logger.error("Identity provider failed", { uid, message: err.message });
    throw new HttpsError("internal", "본인인증 확인에 실패했어요. 다시 시도해주세요.");
  });
  if (identity && !isAdultBirthDate(identity.birthDate)) {
    throw new HttpsError("permission-denied", "만 19세 이상만 이용할 수 있어요.");
  }

  const user = await getAuth().getUser(uid);
  await getAuth().setCustomUserClaims(uid, {
    ...(user.customClaims ?? {}),
    verified: true,
    ...(identity ? { adult: true } : {}),
  });

  await db.doc(`phoneHashes/${hash}`).set({ uid, verifiedAt: FieldValue.serverTimestamp() });
  await db.doc(`users/${uid}`).set(
    {
      phoneVerified: true,
      phoneVerifiedAt: FieldValue.serverTimestamp(),
      ...(identity
        ? { name: identity.name, gender: identity.gender, birthDate: identity.birthDate, identityVerified: true }
        : {}),
    },
    { merge: true }
  );
  await ref.delete();

  logger.info("Phone verified", { uid, identityProvider: Boolean(identity) });
  return { verified: true };
}

module.exports = { start, confirm, normalizePhone, phoneHash, CODE_TTL_MS, MAX_ATTEMPTS };
