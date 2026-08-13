import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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

export default function SignUpScreen({ navigation }) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("female");
  const [preferredGender, setPreferredGender] = useState("male");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignUp() {
    if (!email.trim() || !password || !name.trim() || !age.trim()) {
      Alert.alert("알림", "필수 항목을 모두 입력해주세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      await signUp({ email, password, name, age, gender, preferredGender, bio });
    } catch (err) {
      Alert.alert("회원가입 실패", err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>회원가입</Text>

      <TextInput
        style={styles.input}
        placeholder="이메일"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput style={styles.input} placeholder="이름" value={name} onChangeText={setName} />
      <TextInput
        style={styles.input}
        placeholder="나이"
        keyboardType="number-pad"
        value={age}
        onChangeText={setAge}
      />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="자기소개"
        multiline
        value={bio}
        onChangeText={setBio}
      />

      <Text style={styles.label}>성별</Text>
      <ChoiceRow options={GENDER_OPTIONS} value={gender} onChange={setGender} />

      <Text style={styles.label}>이상형</Text>
      <ChoiceRow options={PREFERENCE_OPTIONS} value={preferredGender} onChange={setPreferredGender} />

      <Pressable
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSignUp}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>가입하기</Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>이미 계정이 있으신가요? 로그인</Text>
      </Pressable>
    </ScrollView>
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
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 12,
  },
  multiline: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 8,
    marginTop: 4,
  },
  choiceRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
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
  button: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  link: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 20,
  },
});
