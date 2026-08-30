import { StyleSheet, Text, View } from "react-native";
import { toDateKey } from "../utils/trips";
import { colors } from "../theme";

// @react-native-community/datetimepicker has no web build — its fallback
// renders nothing at all. react-native-web puts us on the DOM anyway, so use
// the platform's own date input, which is better than anything we'd rebuild.
export default function DateField({ label, value, minimumDate, onChange }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <input
        type="date"
        value={value}
        min={minimumDate ? toDateKey(minimumDate) : undefined}
        onChange={(event) => event.target.value && onChange(event.target.value)}
        style={{
          background: colors.card,
          border: 0,
          borderRadius: 12,
          padding: "11px 14px",
          fontSize: 15,
          fontFamily: "inherit",
          color: colors.text,
          width: "100%",
          boxSizing: "border-box",
        }}
      />
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
});
