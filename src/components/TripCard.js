import { Pressable, StyleSheet, Text, View } from "react-native";
import { destinationById } from "../data/destinations";
import { formatTripDates, intentLabel, tripStatus } from "../utils/trips";
import { colors } from "../theme";

export default function TripCard({ trip, onPress, onEdit }) {
  const destination = destinationById(trip.destinationId);
  const status = tripStatus(trip);

  return (
    <Pressable style={[styles.card, status.past && styles.past]} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{destination?.emoji ?? "✈️"}</Text>
        <View style={styles.headings}>
          <Text style={styles.name}>{destination?.name ?? "알 수 없는 여행지"}</Text>
          <Text style={styles.dates}>{formatTripDates(trip)}</Text>
        </View>
        <Pressable hitSlop={10} onPress={onEdit}>
          <Text style={styles.edit}>수정</Text>
        </Pressable>
      </View>

      <View style={styles.tags}>
        <View style={[styles.tag, !status.past && styles.tagActive]}>
          <Text style={[styles.tagText, !status.past && styles.tagTextActive]}>
            {status.label}
          </Text>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{intentLabel(trip.intent)}</Text>
        </View>
      </View>

      {trip.note ? (
        <Text style={styles.note} numberOfLines={2}>
          {trip.note}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  past: {
    opacity: 0.55,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emoji: {
    fontSize: 30,
  },
  headings: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  dates: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  edit: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600",
  },
  tags: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
  },
  tag: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  tagTextActive: {
    color: "#fff",
  },
  note: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 10,
    lineHeight: 20,
  },
});
