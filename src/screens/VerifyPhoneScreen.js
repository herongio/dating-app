import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { requestVerificationCode, submitVerificationCode } from "../firebase/verification";
import { colors } from "../theme";

// Stands between signing up and doing anything: posting a trip, swiping,
// messaging. Browsing is deliberately left open, so people can see there are
// real travellers here before they hand over a phone number.
export default function VerifyPhoneScreen() {
  const { currentUser, refreshSession, logout } = useAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState(null);
  const [devCode, setDevCode] = useState(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!phone.trim()) {
      Alert.alert("알림", "휴대폰 번호를 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      const result = await requestVerificationCode(phone);
      setSentTo(phone);
      setCode("");
      // Only ever present against the emulator, where no SMS goes out.
      setDevCode(result?.devCode ?? null);
    } catch (err) {
      Alert.alert("인증번호를 보내지 못했어요", err.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (code.trim().length !== 6) {
      Alert.alert("알림", "6자리 인증번호를 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      await submitVerificationCode(code.trim());
      // The `verified` claim only reaches this device on a token refresh, and
      // every write from here on is gated on it.
      await refreshSession();
    } catch (err) {
      Alert.alert("인증 실패", err.message);
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.emoji}>📱</Text>
        <Text style={styles.title}>휴대폰 인증</Text>
        <Text style={styles.subtitle}>
          {currentUser?.name}님, 거의 다 됐어요.{"\n"}
          낯선 사람과 함께 여행하는 서비스라, 한 번호로 한 계정만 만들 수 있게
          했어요. 번호는 저장하지 않고 암호화해서 중복 확인에만 써요.
        </Text>

        {!sentTo ? (
          <>
            <Text style={styles.label}>휴대폰 번호</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="010-1234-5678"
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <Pressable style={[styles.button, busy && styles.disabled]} onPress={send} disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>인증번호 받기</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.label}>{sentTo}로 보낸 6자리 번호</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={code}
              onChangeText={setCode}
              placeholder="······"
              keyboardType="number-pad"
              maxLength={6}
            />
            {devCode && (
              <Text style={styles.devCode}>에뮬레이터 인증번호: {devCode}</Text>
            )}
            <Pressable style={[styles.button, busy && styles.disabled]} onPress={verify} disabled={busy}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>인증 완료</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setSentTo(null)} disabled={busy}>
              <Text style={styles.link}>번호를 다시 입력할게요</Text>
            </Pressable>
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerNote}>만 19세 이상만 이용할 수 있어요.</Text>
          <Pressable onPress={logout}>
            <Text style={styles.link}>로그아웃</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 28,
    paddingTop: 80,
  },
  emoji: {
    fontSize: 44,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 28,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
  },
  devCode: {
    color: colors.textFaint,
    fontSize: 13,
    textAlign: "center",
    marginTop: -8,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
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
    marginTop: 18,
    fontSize: 14,
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
  },
  footerNote: {
    color: colors.textFaint,
    fontSize: 13,
  },
});
