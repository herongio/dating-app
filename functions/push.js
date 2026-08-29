const { Expo } = require("expo-server-sdk");

const expo = new Expo();

// Push tokens live in `pushTokens/{uid}` rather than on the user profile,
// because profiles are readable by every signed-in user and a token is
// enough to spoof notifications at someone.
async function sendPushTo(db, uid, { title, body, data }) {
  const snap = await db.collection("pushTokens").doc(uid).get();
  const token = snap.exists ? snap.data().token : null;
  if (!Expo.isExpoPushToken(token)) return;

  const tickets = await expo.sendPushNotificationsAsync([
    { to: token, sound: "default", title, body, data },
  ]);

  // A token goes stale when the app is uninstalled or reinstalled. Drop it
  // so we stop paying for pushes that can never be delivered.
  if (tickets[0]?.details?.error === "DeviceNotRegistered") {
    await snap.ref.delete();
  }
}

module.exports = { sendPushTo };
