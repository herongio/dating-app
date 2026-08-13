import { Alert, ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useDiscoverPool } from "../hooks/useDiscoverPool";
import { performSwipe } from "../firebase/swipes";
import SwipeCard from "../components/SwipeCard";
import { colors } from "../theme";

export default function SwipeScreen() {
  const { currentUser } = useAuth();
  const { profiles, loading, removeProfile } = useDiscoverPool(currentUser);

  async function handleSwiped(profile, direction) {
    removeProfile(profile.id);
    try {
      const matched = await performSwipe(currentUser.id, profile.id, direction);
      if (direction === "like" && matched) {
        Alert.alert("매칭 성공! 💕", `${profile.name}님과 매칭됐어요. 채팅 탭에서 대화를 시작해보세요.`);
      }
    } catch {
      Alert.alert("오류", "스와이프를 처리하지 못했어요. 다시 시도해주세요.");
    }
  }

  const visible = profiles.slice(0, 2);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>둘러보기</Text>

      <View style={styles.deck}>
        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : visible.length === 0 ? (
          <Text style={styles.empty}>더 이상 프로필이 없어요.{"\n"}나중에 다시 확인해보세요!</Text>
        ) : (
          visible
            .slice()
            .reverse()
            .map((profile, i) => (
              <SwipeCard
                key={profile.id}
                profile={profile}
                isTop={i === visible.length - 1}
                onSwiped={(direction) => handleSwiped(profile, direction)}
              />
            ))
        )}
      </View>

      {visible.length > 0 && (
        <View style={styles.buttons}>
          <Pressable
            style={[styles.button, styles.pass]}
            onPress={() => handleSwiped(visible[0], "pass")}
          >
            <Text style={styles.buttonText}>Pass</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.like]}
            onPress={() => handleSwiped(visible[0], "like")}
          >
            <Text style={styles.buttonText}>Like</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 16,
  },
  deck: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    fontSize: 16,
    textAlign: "center",
    color: colors.textMuted,
  },
  buttons: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 26,
  },
  pass: {
    backgroundColor: colors.border,
  },
  like: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
