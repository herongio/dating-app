import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { formatDateKey, fromDateKey, toDateKey } from "../utils/trips";
import { colors } from "../theme";

// The two platforms want opposite things from a date picker: iOS has a
// compact inline control that opens its own popover, Android expects a
// button that opens a modal dialog. This wraps both behind one field.
export default function DateField({ label, value, minimumDate, onChange }) {
  const [open, setOpen] = useState(false);

  function handleChange(_event, date) {
    setOpen(false);
    if (date) onChange(toDateKey(date));
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === "ios" ? (
        <DateTimePicker
          value={fromDateKey(value)}
          mode="date"
          display="compact"
          minimumDate={minimumDate}
          onChange={handleChange}
          style={styles.iosPicker}
        />
      ) : (
        <>
          <Pressable style={styles.button} onPress={() => setOpen(true)}>
            <Text style={styles.buttonText}>{formatDateKey(value)}</Text>
          </Pressable>
          {open && (
            <DateTimePicker
              value={fromDateKey(value)}
              mode="date"
              display="default"
              minimumDate={minimumDate}
              onChange={handleChange}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 6,
  },
  iosPicker: {
    alignSelf: "flex-start",
  },
  button: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  buttonText: {
    fontSize: 15,
    color: colors.text,
  },
});
