import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useMatches } from "../context/MatchesContext";
import { useTripCandidates } from "../hooks/useTripCandidates";
import { getSentRequestStatusMap, sendTripRequest } from "../firebase/tripRequests";
import TravelerCard from "../components/TravelerCard";
import { destinationById } from "../data/destinations";
import { formatTripDates } from "../utils/trips";
import { colors } from "../theme";

export default function TripTravelersScreen({ route }) {
  const { trip } = route.params;
  const { currentUser } = useAuth();
  const matches = useMatches();
  const { candidates, loading, refresh } = useTripCandidates([trip]);
  const [sentStatus, setSentStatus] = useState({});
  const destination = destinationById(trip.destinationId);

  const refreshSentStatus = useCallback(async () => {
    if (!currentUser) return;
    setSentStatus(await getSentRequestStatusMap(currentUser.id));
  }, [currentUser]);

  useEffect(() => {
    refreshSentStatus();
  }, [refreshSentStatus]);

  const matchedIds = new Set(matches.map((m) => m.profile.id));

  async function handleSendRequest(candidate) {
    try {
      await sendTripRequest({
        fromUserId: currentUser.id,
        toUserId: candidate.user.id,
        fromTripId: trip.id,
        toTripId: candidate.trip.id,
      });
      setSentStatus((prev) => ({ ...prev, [candidate.user.id]: "pending" }));
      Alert.alert("신청 완료", `${candidate.user.name}님에게 동행 신청을 보냈어요.`);
    } catch {
      Alert.alert("오류", "신청을 보내지 못했어요. 다시 시도해주세요.");
    }
  }

  function statusFor(userId) {
    if (matchedIds.has(userId)) return "matched";
    if (sentStatus[userId] === "pending") return "pending";
    return "none";
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        {destination?.emoji} {destination?.name} · {formatTripDates(trip)}
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={styles.loading} />
      ) : (
        <FlatList
          data={candidates}
          keyExtractor={(item) => item.user.id}
          contentContainerStyle={styles.list}
          onRefresh={() => {
            refresh();
            refreshSentStatus();
          }}
          refreshing={false}
          renderItem={({ item }) => (
            <TravelerCard
              candidate={item}
              status={statusFor(item.user.id)}
              onSendRequest={() => handleSendRequest(item)}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              아직 이 일정과 겹치는 사람이 없어요.{"\n"}날짜를 조금 넓혀보거나 나중에 다시 확인해보세요.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 16,
  },
  loading: {
    marginTop: 40,
  },
  list: {
    paddingBottom: 24,
  },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: 60,
    lineHeight: 24,
  },
});
