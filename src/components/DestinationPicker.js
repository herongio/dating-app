import { useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { destinationById, searchDestinations } from "../data/destinations";
import { colors } from "../theme";

export default function DestinationPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = destinationById(value);

  function pick(destination) {
    onChange(destination.id);
    setOpen(false);
    setQuery("");
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>어디로 가나요?</Text>
      <Pressable style={styles.button} onPress={() => setOpen(true)}>
        <Text style={selected ? styles.selectedText : styles.placeholder}>
          {selected ? `${selected.emoji} ${selected.name}, ${selected.country}` : "여행지 선택"}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>여행지 선택</Text>
            <Pressable hitSlop={10} onPress={() => setOpen(false)}>
              <Text style={styles.close}>닫기</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="도시 또는 나라 검색"
            autoCorrect={false}
          />

          <FlatList
            data={searchDestinations(query)}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={[styles.row, item.id === value && styles.rowSelected]}
                onPress={() => pick(item)}
              >
                <Text style={styles.rowEmoji}>{item.emoji}</Text>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowCountry}>{item.country}</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>
                찾는 여행지가 없나요?{"\n"}지금은 인기 여행지만 지원해요.
              </Text>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 6,
  },
  button: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  selectedText: {
    fontSize: 15,
    color: colors.text,
  },
  placeholder: {
    fontSize: 15,
    color: colors.textFaint,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  close: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: "600",
  },
  search: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  rowSelected: {
    backgroundColor: colors.card,
  },
  rowEmoji: {
    fontSize: 22,
  },
  rowName: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: "500",
  },
  rowCountry: {
    fontSize: 13,
    color: colors.textFaint,
  },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: 40,
    lineHeight: 22,
  },
});
