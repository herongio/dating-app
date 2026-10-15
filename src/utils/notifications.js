import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function projectId() {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId ?? null
  );
}

// Returns an Expo push token, or null when pushes aren't available — a
// simulator, a denied permission, or a project without an EAS id. Every
// caller treats null as "this device just won't get pushes", so nothing
// here should throw.
export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "기본",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    const { status } =
      existing === "granted" ? { status: existing } : await Notifications.requestPermissionsAsync();
    if (status !== "granted") return null;

    const id = projectId();
    const { data } = await Notifications.getExpoPushTokenAsync(id ? { projectId: id } : undefined);
    return data;
  } catch {
    return null;
  }
}
