import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { createTrip, deleteTrip, updateTrip } from "../firebase/trips";
import DateField from "../components/DateField";
import DestinationPicker from "../components/DestinationPicker";
import { TRIP_INTENTS, addDays, fromDateKey, todayKey } from "../utils/trips";
import { colors } from "../theme";

export default function TripFormScreen({ navigation, route }) {
  const existing = route.params?.trip ?? null;
  const { currentUser } = useAuth();
  const [destinationId, setDestinationId] = useState(existing?.destinationId ?? null);
  const [startDate, setStartDate] = useState(existing?.startDate ?? addDays(todayKey(), 7));
  const [endDate, setEndDate] = useState(existing?.endDate ?? addDays(todayKey(), 10));
  const [intent, setIntent] = useState(existing?.intent ?? "companion");
  const [note, setNote] = useState(existing?.note ?? "");
  const [saving, setSaving] = useState(false);

  // Dragging the start date past the end date is easy to do and always a
  // mistake, so the end date follows it rather than going invalid.
  function handleStartChange(next) {
    setStartDate(next);
    if (next > endDate) setEndDate(next);
  }

  async function handleSave() {
    if (!destinationId) {
      Alert.alert("알림", "여행지를 선택해주세요.");
      return;
    }
    setSaving(true);
    try {
      const fields = { destinationId, startDate, endDate, intent, note };
      if (existing) {
        await updateTrip(existing.id, { ...fields, note: note.trim() });
      } else {
        await createTrip(currentUser.id, fields);
      }
      navigation.goBack();
    } catch {
      Alert.alert("오류", "여행을 저장하지 못했어요. 다시 시도해주세요.");
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert("여행 삭제", "이 여행 계획을 지울까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTrip(existing.id);
            navigation.goBack();
          } catch {
            Alert.alert("오류", "삭제하지 못했어요. 다시 시도해주세요.");
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <DestinationPicker value={destinationId} onChange={setDestinationId} />

      <View style={styles.dates}>
        <DateField
          label="가는 날"
          value={startDate}
          minimumDate={new Date()}
          onChange={handleStartChange}
        />
        <DateField
          label="오는 날"
          value={endDate}
          minimumDate={fromDateKey(startDate)}
          onChange={setEndDate}
        />
      </View>

      <Text style={styles.label}>이번 여행에서는</Text>
      <View style={styles.intents}>
        {TRIP_INTENTS.map((option) => (
          <Pressable
            key={option.value}
            style={[styles.intent, intent === option.value && styles.intentSelected]}
            onPress={() => setIntent(option.value)}
          >
            <Text
              style={[styles.intentLabel, intent === option.value && styles.intentLabelSelected]}
            >
              {option.label}
            </Text>
            <Text
              style={[styles.intentHint, intent === option.value && styles.intentHintSelected]}
            >
              {option.hint}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>한마디 (선택)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={note}
        onChangeText={setNote}
        placeholder="어떤 여행을 계획하고 있나요? 예) 오사카 맛집 위주로 천천히 다닐 예정이에요"
        multiline
      />

      <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>{existing ? "수정 완료" : "여행 등록"}</Text>
        )}
      </Pressable>

      {existing && (
        <Pressable style={styles.deleteButton} onPress={confirmDelete}>
          <Text style={styles.deleteText}>여행 삭제</Text>
        </Pressable>
      )}
    </ScrollView>
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
  },
  dates: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 8,
  },
  intents: {
    gap: 8,
    marginBottom: 20,
  },
  intent: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  intentSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  intentLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  intentLabelSelected: {
    color: "#fff",
  },
  intentHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  intentHintSelected: {
    color: "rgba(255,255,255,0.85)",
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
    minHeight: 90,
    textAlignVertical: "top",
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  deleteButton: {
    marginTop: 16,
    paddingVertical: 10,
    alignItems: "center",
  },
  deleteText: {
    color: colors.textFaint,
    fontSize: 14,
  },
});
