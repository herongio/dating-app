import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useNearbyUsers } from "../hooks/useNearbyUsers";
import { useMatches } from "../hooks/useMatches";
import { useReceivedFriendRequests } from "../hooks/useReceivedFriendRequests";
import { sendFriendRequest, getSentRequestStatusMap, respondToRequest } from "../firebase/friendRequests";
import NearbyUserCard from "../components/NearbyUserCard";
import { colors } from "../theme";

const RADIUS_KM = 5;

export default function NearbyScreen() {
  const { currentUser } = useAuth();
  const { users: nearby, loading, refresh } = useNearbyUsers(currentUser, RADIUS_KM);
  const matches = useMatches(currentUser);
  const receivedRequests = useReceivedFriendRequests(currentUser);
  const [sentStatus, setSentStatus] = useState({});

  const refreshSentStatus = useCallback(async () => {
    if (!currentUser) return;
    setSentStatus(await getSentRequestStatusMap(currentUser.id));
  }, [currentUser]);

  useEffect(() => {
    refreshSentStatus();
  }, [refreshSentStatus]);

  const matchedIds = new Set(matches.map((m) => m.profile.id));

  async function handleSendRequest(user) {
    try {
      await sendFriendRequest(currentUser.id, user.id);
      setSentStatus((prev) => ({ ...prev, [user.id]: "pending" }));
      Alert.alert("친구 신청 완료", `${user.name}님에게 친구 신청을 보냈어요.`);
    } catch {
      Alert.alert("오류", "친구 신청을 보내지 못했어요. 다시 시도해주세요.");
    }
  }

  async function handleRespond(request, accept) {
    try {
      await respondToRequest(request, accept);
      if (accept) {
        Alert.alert("매칭 성공! 💕", `${request.profile.name}님과 매칭됐어요. 채팅 탭에서 대화를 시작해보세요.`);
      }
    } catch {
      Alert.alert("오류", "처리하지 못했어요. 다시 시도해주세요.");
    }
  }

  function statusFor(userId) {
    if (matchedIds.has(userId)) return "matched";
    if (sentStatus[userId] === "pending") return "pending";
    return "none";
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>내 주변 이상형</Text>
      <Text style={styles.subtitle}>{RADIUS_KM}km 이내에서 찾은 프로필이에요</Text>

      {receivedRequests.length > 0 && (
        <View style={styles.requestsBox}>
          <Text style={styles.requestsTitle}>받은 친구 신청</Text>
          {receivedRequests.map((request) => (
            <View key={request.id} style={styles.requestRow}>
              <Text style={styles.requestAvatar}>{request.profile.avatar}</Text>
              <Text style={styles.requestName}>{request.profile.name}</Text>
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
          data={nearby}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={() => {
            refresh();
            refreshSentStatus();
          }}
          refreshing={false}
          renderItem={({ item }) => (
            <NearbyUserCard
              user={item}
              status={statusFor(item.id)}
              onSendRequest={() => handleSendRequest(item)}
            />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>근처에서 이상형을 찾지 못했어요.</Text>
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 16,
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
    marginTop: 40,
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
  requestAvatar: {
    fontSize: 28,
  },
  requestName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
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
