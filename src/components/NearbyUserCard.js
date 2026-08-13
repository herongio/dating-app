import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export default function NearbyUserCard({ user, status, onSendRequest }) {
  return (
    <View style={styles.card}>
      <Text style={styles.avatar}>{user.avatar}</Text>
      <View style={styles.info}>
        <Text style={styles.name}>
          {user.name}, {user.age}
        </Text>
        <Text style={styles.bio}>{user.bio}</Text>
        <Text style={styles.distance}>📍 {user.distanceKm.toFixed(1)}km 근처</Text>
      </View>

      {status === "matched" ? (
        <View style={[styles.requestButton, styles.matchedButton]}>
          <Text style={styles.matchedText}>매칭됨</Text>
        </View>
      ) : status === "pending" ? (
        <View style={[styles.requestButton, styles.pendingButton]}>
          <Text style={styles.pendingText}>신청됨</Text>
        </View>
      ) : (
        <Pressable style={styles.requestButton} onPress={onSendRequest}>
          <Text style={styles.requestText}>친구 신청</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  avatar: {
    fontSize: 40,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
  },
  bio: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  distance: {
    fontSize: 13,
    color: colors.textFaint,
    marginTop: 4,
  },
  requestButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  requestText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  matchedButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.success,
  },
  matchedText: {
    color: colors.success,
    fontWeight: "600",
    fontSize: 13,
  },
  pendingButton: {
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
