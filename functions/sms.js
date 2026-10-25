const { logger } = require("firebase-functions");

// The one place an SMS provider gets wired in. Everything above this file is
// provider-agnostic, so swapping NHN Cloud / Twilio / 알리고 in means editing
// `deliver` and nothing else.
//
// In the emulator there is no provider and no cost, so the code is logged and
// also handed back to the caller (see `devCode` in verification.js) — that is
// what makes the flow testable end to end. In production a missing provider
// throws rather than silently pretending to have sent anything.
const isEmulator = () => process.env.FUNCTIONS_EMULATOR === "true";

async function deliver(phone, text) {
  if (isEmulator()) {
    logger.info("[sms:emulator] would send", { phone, text });
    return;
  }

  const endpoint = process.env.SMS_ENDPOINT;
  const apiKey = process.env.SMS_API_KEY;
  const sender = process.env.SMS_SENDER;
  if (!endpoint || !apiKey || !sender) {
    throw new Error("SMS provider is not configured (SMS_ENDPOINT / SMS_API_KEY / SMS_SENDER)");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ to: phone, from: sender, text }),
  });
  if (!response.ok) {
    throw new Error(`SMS provider returned ${response.status}`);
  }
}

async function sendVerificationCode(phone, code) {
  await deliver(phone, `[여행메이트] 인증번호 ${code} (5분 내 입력)`);
}

module.exports = { sendVerificationCode, isEmulator };
