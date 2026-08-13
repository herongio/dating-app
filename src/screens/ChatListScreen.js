import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useAppData } from "../context/AppDataContext";
import { colors } from "../theme";

export default function ChatListScreen({ navigation }) {
  const { getMatches, getChatMessages } = useAppData();
  const matches = getMatches();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>채팅</Text>

      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const messages = getChatMessages(item.id);
          const lastMessage = messages[messages.length - 1];
          return (
            <Pressable
              style={styles.row}
              onPress={() =>
                navigation.navigate("ChatRoom", { matchId: item.id, profile: item.profile })
              }
            >
              <Text style={styles.avatar}>{item.profile.avatar}</Text>
              <View style={styles.info}>
                <Text style={styles.name}>{item.profile.name}</Text>
                <Text style={styles.preview} numberOfLines={1}>
                  {lastMessage ? lastMessage.text : "매칭됐어요! 먼저 인사해보세요 👋"}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            아직 매칭이 없어요.{"\n"}둘러보기나 내 주변 탭에서 매칭을 만들어보세요!
          </Text>
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
    marginBottom: 16,
  },
  list: {
    paddingBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 14,
  },
  avatar: {
    fontSize: 36,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  preview: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: 40,
    lineHeight: 22,
  },
});
