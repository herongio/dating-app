import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { BlockProvider } from "./src/context/BlockContext";
import { MatchesProvider } from "./src/context/MatchesContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BlockProvider>
          <MatchesProvider>
            <StatusBar style="auto" />
            <RootNavigator />
          </MatchesProvider>
        </BlockProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
