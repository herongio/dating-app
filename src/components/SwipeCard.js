import { useRef } from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";
import Avatar from "./Avatar";
import ModerationButton from "./ModerationButton";
import { destinationById } from "../data/destinations";
import { formatTripDates, intentLabel } from "../utils/trips";
import { colors } from "../theme";

const SWIPE_THRESHOLD = 120;

export default function SwipeCard({ candidate, onSwiped, isTop }) {
  const pan = useRef(new Animated.ValueXY()).current;
  const rotate = pan.x.interpolate({
    inputRange: [-300, 0, 300],
    outputRange: ["-15deg", "0deg", "15deg"],
  });

  const likeOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const passOpacity = pan.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          flyOut("like");
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          flyOut("pass");
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  function flyOut(direction) {
    const toX = direction === "like" ? 500 : -500;
    Animated.timing(pan, {
      toValue: { x: toX, y: 0 },
      duration: 220,
      useNativeDriver: false,
    }).start(() => onSwiped(direction));
  }

  if (!isTop) {
    return (
      <View style={[styles.card, styles.cardBehind]}>
        <CardContent candidate={candidate} />
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Animated.View style={[styles.badge, styles.likeBadge, { opacity: likeOpacity }]}>
        <Text style={styles.badgeText}>LIKE</Text>
      </Animated.View>
      <Animated.View style={[styles.badge, styles.passBadge, { opacity: passOpacity }]}>
        <Text style={styles.badgeText}>PASS</Text>
      </Animated.View>
      <CardContent candidate={candidate} />
    </Animated.View>
  );
}

// The trip is the reason this person is in the deck at all, so it gets the
// same weight as the profile itself.
function CardContent({ candidate }) {
  const { user, trip, overlapDays } = candidate;
  const destination = destinationById(trip.destinationId);

  return (
    <>
      <ModerationButton user={user} style={styles.moderation} />
      <Avatar user={user} size={96} style={styles.avatar} />
      <Text style={styles.name}>
        {user.name}, {user.age}
      </Text>

      <View style={styles.tripBox}>
        <Text style={styles.destination}>
          {destination?.emoji} {destination?.name}
        </Text>
        <Text style={styles.dates}>{formatTripDates(trip)}</Text>
        <Text style={styles.overlap}>일정이 {overlapDays}일 겹쳐요</Text>
      </View>

      <View style={styles.chips}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{intentLabel(trip.intent)}</Text>
        </View>
        {(user.travelStyles ?? []).map((style) => (
          <View key={style} style={styles.chip}>
            <Text style={styles.chipText}>{style}</Text>
          </View>
        ))}
      </View>

      {trip.note ? (
        <Text style={styles.note} numberOfLines={3}>
          {trip.note}
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    // Both cards need the same anchor. Without an explicit top, the layout
    // engine centres each absolute child by its own height, so the shorter
    // card behind drifts up and peeks out above the one on top.
    top: 0,
    width: "100%",
    borderRadius: 20,
    padding: 24,
    backgroundColor: colors.card,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardBehind: {
    transform: [{ scale: 0.96 }, { translateY: 8 }],
  },
  avatar: {
    marginBottom: 12,
  },
  moderation: {
    position: "absolute",
    top: 10,
    right: 14,
    zIndex: 20,
  },
  name: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
  },
  tripBox: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 14,
    alignSelf: "stretch",
  },
  destination: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  dates: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  overlap: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    marginTop: 6,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  chip: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  note: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  badge: {
    position: "absolute",
    top: 52,
    borderWidth: 3,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    zIndex: 10,
  },
  likeBadge: {
    left: 20,
    borderColor: colors.success,
    transform: [{ rotate: "-15deg" }],
  },
  passBadge: {
    right: 20,
    borderColor: colors.primary,
    transform: [{ rotate: "15deg" }],
  },
  badgeText: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },
});
