import { Image, StyleSheet, Text } from "react-native";
import { colors } from "../theme";

// Falls back to the emoji avatar every profile is created with, so screens
// don't have to care whether a photo has been uploaded yet.
export default function Avatar({ user, size = 48, style }) {
  if (user?.photoURL) {
    return (
      <Image
        source={{ uri: user.photoURL }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, styles.photo, style]}
      />
    );
  }

  return (
    <Text
      style={[
        { width: size, height: size, fontSize: size * 0.72, lineHeight: size * 1.02 },
        styles.emoji,
        style,
      ]}
    >
      {user?.avatar ?? "🙂"}
    </Text>
  );
}

const styles = StyleSheet.create({
  photo: {
    backgroundColor: colors.card,
  },
  emoji: {
    textAlign: "center",
  },
});
