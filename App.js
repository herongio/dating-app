import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { profiles } from "./profiles";

export default function App() {
  const [index, setIndex] = useState(0);
  const [matches, setMatches] = useState([]);

  const current = profiles[index];

  const next = () => setIndex((i) => Math.min(i + 1, profiles.length));

  const handleLike = () => {
    setMatches((m) => [...m, current.id]);
    next();
  };

  const handlePass = () => {
    next();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>Dating App</Text>

      {current ? (
        <View style={styles.card}>
          <Text style={styles.name}>
            {current.name}, {current.age}
          </Text>
          <Text style={styles.bio}>{current.bio}</Text>

          <View style={styles.buttons}>
            <Pressable style={[styles.button, styles.pass]} onPress={handlePass}>
              <Text style={styles.buttonText}>Pass</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.like]} onPress={handleLike}>
              <Text style={styles.buttonText}>Like</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={styles.empty}>
          더 이상 프로필이 없어요. {matches.length}명과 매칭됐어요!
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 40,
  },
  card: {
    width: "100%",
    borderRadius: 16,
    padding: 24,
    backgroundColor: "#f7f7f7",
    alignItems: "center",
  },
  name: {
    fontSize: 22,
    fontWeight: "600",
  },
  bio: {
    fontSize: 16,
    color: "#555",
    marginTop: 8,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: "row",
    gap: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
  },
  pass: {
    backgroundColor: "#e0e0e0",
  },
  like: {
    backgroundColor: "#ff4d6d",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  empty: {
    fontSize: 18,
    textAlign: "center",
  },
});
