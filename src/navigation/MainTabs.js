import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";
import SwipeScreen from "../screens/SwipeScreen";
import TripsScreen from "../screens/TripsScreen";
import TripFormScreen from "../screens/TripFormScreen";
import TripTravelersScreen from "../screens/TripTravelersScreen";
import ChatListScreen from "../screens/ChatListScreen";
import ChatRoomScreen from "../screens/ChatRoomScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ModerationButton from "../components/ModerationButton";
import { destinationById } from "../data/destinations";
import { colors } from "../theme";

const Tab = createBottomTabNavigator();
const TripStackNav = createNativeStackNavigator();
const ChatStackNav = createNativeStackNavigator();

const TAB_ICONS = {
  Swipe: "🧭",
  Trips: "✈️",
  Chats: "💬",
  Profile: "👤",
};

function TripStack() {
  return (
    <TripStackNav.Navigator>
      <TripStackNav.Screen
        name="TripList"
        component={TripsScreen}
        options={{ headerShown: false }}
      />
      <TripStackNav.Screen
        name="TripForm"
        component={TripFormScreen}
        options={({ route }) => ({ title: route.params?.trip ? "여행 수정" : "여행 추가" })}
      />
      <TripStackNav.Screen
        name="TripTravelers"
        component={TripTravelersScreen}
        options={({ route }) => ({
          title: `${destinationById(route.params.trip.destinationId)?.name ?? "여행"} 동행 찾기`,
        })}
      />
    </TripStackNav.Navigator>
  );
}

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
        options={({ route }) => ({
          title: route.params.profile.name,
          headerRight: () => <ModerationButton user={route.params.profile} />,
        })}
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
      <Tab.Screen name="Trips" component={TripStack} options={{ title: "내 여행" }} />
      <Tab.Screen name="Chats" component={ChatStack} options={{ title: "채팅" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "프로필" }} />
    </Tab.Navigator>
  );
}
