import { useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { useAppData } from "../context/AppDataContext";
import NearbyUserCard from "../components/NearbyUserCard";
import { colors } from "../theme";

const RADIUS_KM = 5;

export default function NearbyScreen() {
  const { getNearbyUsers, sendFriendRequest, getMatches } = useAppData();
  const [refreshKey, setRefreshKey] = useState(0);

  const nearby = getNearbyUsers(RADIUS_KM);
  const matchedIds = new Set(getMatches().map((m) => m.userId));

  function handleSendRequest(user) {
    const match = sendFriendRequest(user);
    setRefreshKey((k) => k + 1);
    if (match) {
      Alert.alert(
        "친구 신청 수락됨! 💕",
        `${user.name}님이 친구 신청을 수락했어요. 채팅 탭에서 대화를 시작해보세요.`
      );
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>내 주변 이상형</Text>
      <Text style={styles.subtitle}>{RADIUS_KM}km 이내에서 찾은 프로필이에요</Text>

      <FlatList
        key={refreshKey}
        data={nearby}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <NearbyUserCard
            user={item}
            status={matchedIds.has(item.id) ? "matched" : "none"}
            onSendRequest={() => handleSendRequest(item)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>근처에서 이상형을 찾지 못했어요.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 16,
  },
  list: {
    paddingBottom: 24,
  },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: 40,
  },
});
