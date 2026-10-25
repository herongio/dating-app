import { httpsCallable } from "firebase/functions";
import { functions } from "./config";

const start = httpsCallable(functions, "startPhoneVerification");
const confirm = httpsCallable(functions, "confirmPhoneVerification");

// The callables own the whole flow — the code is generated, hashed and checked
// server-side — so there is nothing here but the call and its error message.
// `message` on a Firebase callable error is the HttpsError message the
// function chose, which is already written for the person reading it.
function friendly(err) {
  return new Error(err?.message || "잠시 후 다시 시도해주세요.");
}

export async function requestVerificationCode(phone) {
  try {
    const { data } = await start({ phone });
    return data;
  } catch (err) {
    throw friendly(err);
  }
}

export async function submitVerificationCode(code) {
  try {
    const { data } = await confirm({ code });
    return data;
  } catch (err) {
    throw friendly(err);
  }
}
