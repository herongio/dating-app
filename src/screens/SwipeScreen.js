import { Alert, ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useDiscoverPool } from "../hooks/useDiscoverPool";
import { recordSwipe } from "../firebase/swipes";
import SwipeCard from "../components/SwipeCard";
import { colors } from "../theme";

export default function SwipeScreen() {
  const navigation = useNavigation();
  const { currentUser } = useAuth();
  const { candidates, loading, hasTrips, removeCandidate } = useDiscoverPool();

  // A mutual like is matched by a Cloud Function, so there's nothing to
  // announce here — MatchesProvider alerts when the match arrives.
  async function handleSwiped(candidate, direction) {
    removeCandidate(candidate.user.id);
    try {
      await recordSwipe(currentUser.id, candidate.user.id, direction);
    } catch {
      Alert.alert("오류", "스와이프를 처리하지 못했어요. 다시 시도해주세요.");
    }
  }

  const visible = candidates.slice(0, 2);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>둘러보기</Text>
      <Text style={styles.subtitle}>내 여행과 일정이 겹치는 사람들이에요</Text>

      <View style={styles.deck}>
        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : !hasTrips ? (
          <View style={styles.emptyBox}>
            <Text style={styles.empty}>
              먼저 여행을 등록해주세요.{"\n"}같은 날 같은 곳에 가는 사람을 찾아드려요 ✈️
            </Text>
            <Pressable
              style={styles.emptyButton}
              onPress={() => navigation.navigate("Trips", { screen: "TripForm" })}
            >
              <Text style={styles.emptyButtonText}>여행 등록하러 가기</Text>
            </Pressable>
          </View>
        ) : visible.length === 0 ? (
          <Text style={styles.empty}>
            지금은 일정이 겹치는 사람이 없어요.{"\n"}여행을 더 등록하거나 나중에 다시 확인해보세요!
          </Text>
        ) : (
          visible
            .slice()
            .reverse()
            .map((candidate, i) => (
              <SwipeCard
                key={candidate.user.id}
                candidate={candidate}
                isTop={i === visible.length - 1}
                onSwiped={(direction) => handleSwiped(candidate, direction)}
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
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  deck: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    // The cards inside are absolutely positioned from the top of this box.
    paddingTop: 8,
  },
  emptyBox: {
    alignItems: "center",
  },
  empty: {
    fontSize: 16,
    textAlign: "center",
    color: colors.textMuted,
    lineHeight: 24,
  },
  emptyButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
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
