import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";
import SwipeScreen from "../screens/SwipeScreen";
import NearbyScreen from "../screens/NearbyScreen";
import ChatListScreen from "../screens/ChatListScreen";
import ChatRoomScreen from "../screens/ChatRoomScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { colors } from "../theme";

const Tab = createBottomTabNavigator();
const ChatStackNav = createNativeStackNavigator();

const TAB_ICONS = {
  Swipe: "🔥",
  Nearby: "📍",
  Chats: "💬",
  Profile: "👤",
};

function ChatStack() {
  return (
    <ChatStackNav.Navigator>
      <ChatStackNav.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ headerShown: false }}
      />
      <ChatStackNav.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({ title: route.params.profile.name })}
      />
    </ChatStackNav.Navigator>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarIcon: () => <Text style={{ fontSize: 20 }}>{TAB_ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Swipe" component={SwipeScreen} options={{ title: "둘러보기" }} />
      <Tab.Screen name="Nearby" component={NearbyScreen} options={{ title: "내 주변" }} />
      <Tab.Screen name="Chats" component={ChatStack} options={{ title: "채팅" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "프로필" }} />
    </Tab.Navigator>
  );
}
