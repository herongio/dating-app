import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useMyTrips } from "../hooks/useMyTrips";
import { useReceivedTripRequests } from "../hooks/useReceivedTripRequests";
import { respondToRequest } from "../firebase/tripRequests";
import Avatar from "../components/Avatar";
import TripCard from "../components/TripCard";
import { colors } from "../theme";

export default function TripsScreen({ navigation }) {
  const { trips, loading } = useMyTrips();
  const requests = useReceivedTripRequests();

  // Accepting only flips the request status; the Cloud Function creates the
  // match, and MatchesProvider announces it when it lands.
  async function handleRespond(request, accept) {
    try {
      await respondToRequest(request, accept);
    } catch {
      Alert.alert("오류", "처리하지 못했어요. 다시 시도해주세요.");
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>내 여행</Text>
        <Pressable style={styles.addButton} onPress={() => navigation.navigate("TripForm")}>
          <Text style={styles.addText}>+ 여행 추가</Text>
        </Pressable>
      </View>

      {requests.length > 0 && (
        <View style={styles.requestsBox}>
          <Text style={styles.requestsTitle}>받은 동행 신청</Text>
          {requests.map((request) => (
            <View key={request.id} style={styles.requestRow}>
              <Avatar user={request.profile} size={36} />
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>{request.profile.name}</Text>
                {request.message ? (
                  <Text style={styles.requestMessage} numberOfLines={1}>
                    {request.message}
                  </Text>
                ) : null}
              </View>
              <View style={styles.requestButtons}>
                <Pressable
                  style={[styles.requestActionButton, styles.declineButton]}
                  onPress={() => handleRespond(request, false)}
                >
                  <Text style={styles.declineText}>거절</Text>
                </Pressable>
                <Pressable
                  style={[styles.requestActionButton, styles.acceptButton]}
                  onPress={() => handleRespond(request, true)}
                >
                  <Text style={styles.acceptText}>수락</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={styles.loading} />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TripCard
              trip={item}
              onPress={() => navigation.navigate("TripTravelers", { trip: item })}
              onEdit={() => navigation.navigate("TripForm", { trip: item })}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              아직 등록한 여행이 없어요.{"\n"}여행을 추가하면 같은 날 같은 곳에 가는{"\n"}사람들을 찾아드려요 ✈️
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  addText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  loading: {
    marginTop: 40,
  },
  list: {
    paddingBottom: 24,
  },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: 60,
    lineHeight: 24,
  },
  requestsBox: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  requestsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 8,
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 10,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  requestMessage: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 1,
  },
  requestButtons: {
    flexDirection: "row",
    gap: 8,
  },
  requestActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  declineButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  acceptText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  declineText: {
    color: colors.textMuted,
    fontWeight: "600",
    fontSize: 13,
  },
});
