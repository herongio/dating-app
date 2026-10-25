import { NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import AuthStack from "./AuthStack";
import MainTabs from "./MainTabs";
import VerifyPhoneScreen from "../screens/VerifyPhoneScreen";
import { colors } from "../theme";

export default function RootNavigator() {
  const { isReady, currentUser } = useAuth();

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // Three states, not two: signed out, signed in but unverified, and in. The
  // middle one is a whole screen rather than a banner because an unverified
  // account can't post, swipe or message — the Firestore rules refuse it — so
  // letting it into the tabs would only show four screens of dead ends.
  function screen() {
    if (!currentUser) return <AuthStack />;
    if (!currentUser.phoneVerified) return <VerifyPhoneScreen />;
    return <MainTabs />;
  }

  return <NavigationContainer>{screen()}</NavigationContainer>;
}
