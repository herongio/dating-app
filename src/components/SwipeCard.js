import { useRef } from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

const SWIPE_THRESHOLD = 120;

export default function SwipeCard({ profile, onSwiped, isTop }) {
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
        <CardContent profile={profile} />
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
      <CardContent profile={profile} />
    </Animated.View>
  );
}

function CardContent({ profile }) {
  return (
    <>
      <Text style={styles.avatar}>{profile.avatar}</Text>
      <Text style={styles.name}>
        {profile.name}, {profile.age}
      </Text>
      <Text style={styles.bio}>{profile.bio}</Text>
      <View style={styles.interests}>
        {profile.interests.map((interest) => (
          <View key={interest} style={styles.interestChip}>
            <Text style={styles.interestText}>{interest}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
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
    top: 8,
    transform: [{ scale: 0.96 }],
  },
  avatar: {
    fontSize: 64,
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
  },
  bio: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 8,
    marginBottom: 16,
    textAlign: "center",
  },
  interests: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  interestChip: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  interestText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  badge: {
    position: "absolute",
    top: 24,
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
