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
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../context/AuthContext";
import { useBlocks } from "../context/BlockContext";
import { useBlockedProfiles } from "../hooks/useBlockedProfiles";
import { deleteProfilePhoto, uploadProfilePhoto } from "../firebase/storage";
import Avatar from "../components/Avatar";
import { BUDGET_LEVELS, PACE_LEVELS, TRAVEL_STYLES } from "../data/travelStyles";
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
  const { unblock } = useBlocks();
  const blockedProfiles = useBlockedProfiles();
  const [name, setName] = useState(currentUser.name);
  const [age, setAge] = useState(String(currentUser.age));
  const [bio, setBio] = useState(currentUser.bio);
  const [gender, setGender] = useState(currentUser.gender);
  const [preferredGender, setPreferredGender] = useState(currentUser.preferredGender);
  const [travelStyles, setTravelStyles] = useState(currentUser.travelStyles ?? []);
  const [budget, setBudget] = useState(currentUser.budget ?? "moderate");
  const [pace, setPace] = useState(currentUser.pace ?? "balanced");
  const [uploading, setUploading] = useState(false);

  function handleSave() {
    if (!name.trim() || !age.trim()) {
      Alert.alert("알림", "이름과 나이를 입력해주세요.");
      return;
    }
    if (!(Number.parseInt(age, 10) >= 19)) {
      Alert.alert("저장할 수 없어요", "만 19세 이상만 이용할 수 있어요.");
      return;
    }
    updateProfile({
      name: name.trim(),
      age: Number.parseInt(age, 10),
      bio: bio.trim(),
      gender,
      preferredGender,
      travelStyles,
      budget,
      pace,
    });
    Alert.alert("저장 완료", "프로필이 업데이트됐어요.");
  }

  function toggleStyle(style) {
    setTravelStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  }

  function handlePhotoPress() {
    if (!currentUser.photoURL) {
      pickPhoto();
      return;
    }
    Alert.alert("프로필 사진", null, [
      { text: "사진 변경", onPress: pickPhoto },
      { text: "사진 삭제", style: "destructive", onPress: removePhoto },
      { text: "취소", style: "cancel" },
    ]);
  }

  async function pickPhoto() {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert("권한 필요", "프로필 사진을 올리려면 사진 접근 권한이 필요해요.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;

    setUploading(true);
    try {
      const photoURL = await uploadProfilePhoto(currentUser.id, result.assets[0].uri);
      await updateProfile({ photoURL });
    } catch {
      Alert.alert("오류", "사진을 업로드하지 못했어요. 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto() {
    setUploading(true);
    try {
      await deleteProfilePhoto(currentUser.id);
      await updateProfile({ photoURL: null });
    } catch {
      Alert.alert("오류", "사진을 삭제하지 못했어요. 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  }

  function confirmUnblock(profile) {
    Alert.alert(`${profile.name}님 차단 해제`, "다시 서로의 프로필이 보이게 돼요.", [
      { text: "취소", style: "cancel" },
      { text: "해제", onPress: () => unblock(profile.id) },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>내 프로필</Text>

      <Pressable onPress={handlePhotoPress} disabled={uploading} style={styles.photoButton}>
        <Avatar user={currentUser} size={120} />
        {uploading && (
          <View style={styles.photoOverlay}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </Pressable>
      <Text style={styles.photoHint}>
        {currentUser.photoURL ? "사진을 눌러 변경하거나 삭제하세요" : "사진을 눌러 프로필 사진을 올려보세요"}
      </Text>

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

      <Field label="이상형 (만남을 여는 여행에만 적용돼요)">
        <ChoiceRow
          options={PREFERENCE_OPTIONS}
          value={preferredGender}
          onChange={setPreferredGender}
        />
      </Field>

      <Field label="여행 스타일">
        <View style={styles.styleRow}>
          {TRAVEL_STYLES.map((style) => {
            const selected = travelStyles.includes(style);
            return (
              <Pressable
                key={style}
                style={[styles.choice, selected && styles.choiceSelected]}
                onPress={() => toggleStyle(style)}
              >
                <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                  {style}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="예산">
        <ChoiceRow options={BUDGET_LEVELS} value={budget} onChange={setBudget} />
      </Field>

      <Field label="여행 페이스">
        <ChoiceRow options={PACE_LEVELS} value={pace} onChange={setPace} />
      </Field>

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>저장</Text>
      </Pressable>

      {blockedProfiles.length > 0 && (
        <Field label={`차단한 사용자 (${blockedProfiles.length})`}>
          {blockedProfiles.map((profile) => (
            <View key={profile.id} style={styles.blockedRow}>
              <Avatar user={profile} size={36} />
              <Text style={styles.blockedName}>{profile.name}</Text>
              <Pressable style={styles.unblockButton} onPress={() => confirmUnblock(profile)}>
                <Text style={styles.unblockText}>차단 해제</Text>
              </Pressable>
            </View>
          ))}
        </Field>
      )}

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
  photoButton: {
    marginTop: 16,
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 60,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoHint: {
    fontSize: 13,
    color: colors.textFaint,
    marginTop: 8,
    marginBottom: 16,
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
  styleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
    marginBottom: 24,
  },
  saveText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  blockedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  blockedName: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  unblockButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  unblockText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "600",
  },
});
