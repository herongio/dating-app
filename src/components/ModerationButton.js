import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useBlocks } from "../context/BlockContext";
import { REPORT_REASONS, reportUser } from "../firebase/moderation";
import { colors } from "../theme";

// A "⋯" button that opens report / block for one user. Self-contained
// (it owns its own modal) so any screen showing a profile can drop it in.
export default function ModerationButton({ user, tint = colors.textFaint, style }) {
  const { currentUser } = useAuth();
  const { block } = useBlocks();
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState(null);
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function openMenu() {
    Alert.alert(user.name, "이 사용자를 어떻게 할까요?", [
      { text: "신고하기", onPress: openReport },
      { text: "차단하기", style: "destructive", onPress: confirmBlock },
      { text: "취소", style: "cancel" },
    ]);
  }

  function openReport() {
    setReason(null);
    setDetail("");
    setReportOpen(true);
  }

  function confirmBlock() {
    Alert.alert(
      `${user.name}님을 차단할까요?`,
      "차단하면 서로의 프로필이 보이지 않고, 더 이상 메시지를 주고받을 수 없어요.",
      [
        { text: "취소", style: "cancel" },
        { text: "차단", style: "destructive", onPress: runBlock },
      ]
    );
  }

  async function runBlock() {
    try {
      await block(user.id);
      Alert.alert("차단 완료", `${user.name}님을 차단했어요.`);
    } catch {
      Alert.alert("오류", "차단하지 못했어요. 다시 시도해주세요.");
    }
  }

  async function submitReport() {
    if (!reason) return;
    setSubmitting(true);
    try {
      await reportUser({
        reporterId: currentUser.id,
        reportedId: user.id,
        reason,
        detail,
      });
      setReportOpen(false);
      // Reporting and blocking usually go together, but forcing both would
      // stop people reporting someone they still want to talk to.
      Alert.alert("신고 접수됐어요", "검토 후 조치할게요. 이 사용자를 차단할까요?", [
        { text: "아니요", style: "cancel" },
        { text: "차단하기", style: "destructive", onPress: runBlock },
      ]);
    } catch {
      Alert.alert("오류", "신고를 접수하지 못했어요. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Pressable hitSlop={10} onPress={openMenu} style={style}>
        <Text style={[styles.dots, { color: tint }]}>⋯</Text>
      </Pressable>

      <Modal
        visible={reportOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setReportOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{user.name}님 신고하기</Text>
            <Text style={styles.sheetSubtitle}>신고 사유를 선택해주세요.</Text>

            <ScrollView style={styles.reasons}>
              {REPORT_REASONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[styles.reason, reason === option.value && styles.reasonSelected]}
                  onPress={() => setReason(option.value)}
                >
                  <Text
                    style={[
                      styles.reasonText,
                      reason === option.value && styles.reasonTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput
              style={styles.detail}
              value={detail}
              onChangeText={setDetail}
              placeholder="자세한 내용 (선택)"
              multiline
            />

            <View style={styles.actions}>
              <Pressable
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setReportOpen(false)}
              >
                <Text style={styles.cancelText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.submitButton, !reason && styles.disabled]}
                onPress={submitReport}
                disabled={!reason || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>신고하기</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dots: {
    fontSize: 22,
    fontWeight: "700",
    paddingHorizontal: 4,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  reasons: {
    maxHeight: 260,
  },
  reason: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  reasonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reasonText: {
    fontSize: 15,
    color: colors.text,
  },
  reasonTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  detail: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    minHeight: 70,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: "top",
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: colors.card,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  cancelText: {
    color: colors.textMuted,
    fontWeight: "600",
    fontSize: 15,
  },
  submitText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
