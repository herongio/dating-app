import { Pressable, StyleSheet, Text, View } from "react-native";
import Avatar from "./Avatar";
import ModerationButton from "./ModerationButton";
import { destinationById } from "../data/destinations";
import { budgetLabel, paceLabel } from "../data/travelStyles";
import { formatTripDates, intentLabel } from "../utils/trips";
import { colors } from "../theme";

export default function TravelerCard({ candidate, status, onSendRequest }) {
  const { user, trip, overlapDays } = candidate;
  const destination = destinationById(trip.destinationId);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar user={user} size={52} />
        <View style={styles.info}>
          <Text style={styles.name}>
            {user.name}, {user.age}
          </Text>
          <Text style={styles.overlap}>
            {destination?.emoji} {destination?.name}에서 {overlapDays}일 겹쳐요
          </Text>
        </View>
        <ModerationButton user={user} />
      </View>

      <Text style={styles.dates}>{formatTripDates(trip)}</Text>
      <View style={styles.tags}>
        {[intentLabel(trip.intent), budgetLabel(user.budget), paceLabel(user.pace)]
          .concat(user.travelStyles ?? [])
          .filter(Boolean)
          .map((label) => (
            <View key={label} style={styles.tag}>
              <Text style={styles.tagText}>{label}</Text>
            </View>
          ))}
      </View>

      {trip.note ? (
        <Text style={styles.note} numberOfLines={3}>
          {trip.note}
        </Text>
      ) : null}

      {status === "matched" ? (
        <View style={[styles.action, styles.matched]}>
          <Text style={styles.matchedText}>연결됨 · 채팅 탭에서 대화해보세요</Text>
        </View>
      ) : status === "pending" ? (
        <View style={[styles.action, styles.pending]}>
          <Text style={styles.pendingText}>신청함 · 답장을 기다리는 중</Text>
        </View>
      ) : (
        <Pressable style={[styles.action, styles.request]} onPress={onSendRequest}>
          <Text style={styles.requestText}>같이 가요 신청</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
  },
  overlap: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  dates: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 12,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  tag: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  note: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 10,
    lineHeight: 20,
  },
  action: {
    marginTop: 14,
    borderRadius: 20,
    paddingVertical: 11,
    alignItems: "center",
  },
  request: {
    backgroundColor: colors.primary,
  },
  requestText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  matched: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.success,
  },
  matchedText: {
    color: colors.success,
    fontWeight: "600",
    fontSize: 13,
  },
  pending: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingText: {
    color: colors.textFaint,
    fontWeight: "600",
    fontSize: 13,
  },
});
