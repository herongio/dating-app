import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

const GENDER_OPTIONS = [
  { value: "female", label: "여성" },
  { value: "male", label: "남성" },
];

const PREFERENCE_OPTIONS = [
  { value: "female", label: "여성" },
  { value: "male", label: "남성" },
  { value: "any", label: "전체" },
];

export default function ProfileScreen() {
  const { currentUser, updateProfile, logout } = useAuth();
  const [name, setName] = useState(currentUser.name);
  const [age, setAge] = useState(String(currentUser.age));
  const [bio, setBio] = useState(currentUser.bio);
  const [gender, setGender] = useState(currentUser.gender);
  const [preferredGender, setPreferredGender] = useState(currentUser.preferredGender);

  function handleSave() {
    if (!name.trim() || !age.trim()) {
      Alert.alert("알림", "이름과 나이를 입력해주세요.");
      return;
    }
    updateProfile({ name: name.trim(), age: Number(age), bio: bio.trim(), gender, preferredGender });
    Alert.alert("저장 완료", "프로필이 업데이트됐어요.");
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>내 프로필</Text>
      <Text style={styles.avatar}>{currentUser.avatar}</Text>

      <Field label="이름">
        <TextInput style={styles.input} value={name} onChangeText={setName} />
      </Field>

      <Field label="나이">
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
        />
      </Field>

      <Field label="소개">
        <TextInput
          style={[styles.input, styles.multiline]}
          value={bio}
          onChangeText={setBio}
          multiline
        />
      </Field>

      <Field label="성별">
        <ChoiceRow options={GENDER_OPTIONS} value={gender} onChange={setGender} />
      </Field>

      <Field label="이상형">
        <ChoiceRow
          options={PREFERENCE_OPTIONS}
          value={preferredGender}
          onChange={setPreferredGender}
        />
      </Field>

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>저장</Text>
      </Pressable>

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function ChoiceRow({ options, value, onChange }) {
  return (
    <View style={styles.choiceRow}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          style={[styles.choice, value === opt.value && styles.choiceSelected]}
          onPress={() => onChange(opt.value)}
        >
          <Text style={[styles.choiceText, value === opt.value && styles.choiceTextSelected]}>
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
    alignSelf: "flex-start",
  },
  avatar: {
    fontSize: 72,
    marginVertical: 16,
  },
  field: {
    width: "100%",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  choiceRow: {
    flexDirection: "row",
    gap: 10,
  },
  choice: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceText: {
    color: colors.textMuted,
    fontWeight: "500",
  },
  choiceTextSelected: {
    color: "#fff",
  },
  saveButton: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  logoutButton: {
    marginTop: 16,
    paddingVertical: 10,
  },
  logoutText: {
    color: colors.textFaint,
    fontSize: 14,
  },
});
