// Fills the local emulators with enough people, trips and messages that every
// screen has something real to render. Run through `npm run seed`.
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const app = initializeApp({ projectId: "demo-dating-app" });
const auth = getAuth(app);
const db = getFirestore(app);

const DEMO_EMAIL = "demo@travel.app";
const DEMO_PASSWORD = "demo1234";

const pad = (n) => String(n).padStart(2, "0");
const dayKey = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const PEOPLE = [
  {
    uid: "demo", name: "해룡", age: 34, gender: "male", avatar: "🧑",
    bio: "도쿄랑 제주 계획 중이에요. 느긋하게 다니는 편!",
    travelStyles: ["맛집 탐방", "도시 산책"], budget: "moderate", pace: "relaxed",
  },
  {
    uid: "seoyeon", name: "서연", age: 28, gender: "female", avatar: "👩",
    bio: "시부야 근처에 묵어요. 라멘 같이 드실 분!",
    travelStyles: ["맛집 탐방", "사진 찍기"], budget: "budget", pace: "balanced",
  },
  {
    uid: "minjun", name: "민준", age: 31, gender: "male", avatar: "🧑",
    bio: "아침부터 부지런히 돌아다닙니다. 미술관 좋아해요.",
    travelStyles: ["박물관·전시", "도시 산책"], budget: "moderate", pace: "packed",
  },
  {
    uid: "hyewon", name: "혜원", age: 30, gender: "female", avatar: "👩",
    bio: "오사카에서 좋은 인연 만나면 좋겠어요.",
    travelStyles: ["야경·술 한잔", "맛집 탐방"], budget: "comfort", pace: "balanced",
  },
  {
    uid: "jihun", name: "지훈", age: 29, gender: "male", avatar: "🧔",
    bio: "첫 도쿄라 같이 다닐 분 찾아요.",
    travelStyles: ["액티비티", "야경·술 한잔"], budget: "budget", pace: "balanced",
  },
  {
    uid: "yuna", name: "유나", age: 27, gender: "female", avatar: "👩",
    bio: "카페 투어하며 쉬엄쉬엄 다닐 예정이에요.",
    travelStyles: ["휴양·힐링", "사진 찍기"], budget: "comfort", pace: "relaxed",
  },
];

// Laid out so both intent pools are visible on screen: the Tokyo trip is open
// to "둘 다" and fills up, while the Osaka trip is 동행만 and shows only the
// other 동행만 traveller — 혜원, who is open to dating in the same city on the
// same dates, must NOT appear under it. That absence is the feature.
const TRIPS = [
  { id: "demoTokyo", ownerId: "demo", destinationId: "tokyo", start: 7, end: 13, intent: "both",
    note: "신주쿠 숙소예요. 맛집 위주로 천천히 다닐 계획입니다." },
  { id: "demoOsaka", ownerId: "demo", destinationId: "osaka", start: 40, end: 43, intent: "companion",
    note: "오사카는 동행만 구해요. 난바 쪽 숙소입니다." },
  { id: "seoyeonTokyo", ownerId: "seoyeon", destinationId: "tokyo", start: 11, end: 18, intent: "both",
    note: "시부야 근처에 묵어요. 라멘 같이 드실 분!" },
  { id: "jihunTokyo", ownerId: "jihun", destinationId: "tokyo", start: 9, end: 14, intent: "both",
    note: "첫 도쿄예요. 저녁에 이자카야 같이 가실 분!" },
  { id: "yunaTokyo", ownerId: "yuna", destinationId: "tokyo", start: 8, end: 12, intent: "both",
    note: "카페 투어 좋아하시는 분 환영이에요 ☕" },
  { id: "minjunOsaka", ownerId: "minjun", destinationId: "osaka", start: 39, end: 44, intent: "companion",
    note: "오사카 미술관이랑 테마파크 갈 사람 구해요." },
  { id: "hyewonOsaka", ownerId: "hyewon", destinationId: "osaka", start: 40, end: 43, intent: "both",
    note: "같은 날짜 오사카예요. 야경 보러 갈 사람 🌃" },
];

async function seedPerson(person) {
  await auth.deleteUser(person.uid).catch(() => {});
  await auth.createUser({
    uid: person.uid,
    email: person.uid === "demo" ? DEMO_EMAIL : `${person.uid}@travel.app`,
    password: DEMO_PASSWORD,
    displayName: person.name,
  });
  // Everyone is pre-verified: the point of the seed is the matching screens,
  // not the verification screen, and an unverified account is held at it. The
  // claim is what firestore.rules reads; the field is what the app reads.
  await auth.setCustomUserClaims(person.uid, { verified: true });

  const { uid, ...profile } = person;
  await db.doc(`users/${uid}`).set({
    ...profile,
    // Everyone is open to any gender so the demo doesn't hinge on preference.
    preferredGender: "any",
    photoURL: null,
    phoneVerified: true,
    phoneVerifiedAt: new Date(),
    createdAt: new Date(),
  });
}

async function main() {
  for (const person of PEOPLE) await seedPerson(person);

  for (const trip of TRIPS) {
    const { id, start, end, ...rest } = trip;
    await db.doc(`trips/${id}`).set({
      ...rest,
      startDate: dayKey(start),
      endDate: dayKey(end),
      createdAt: new Date(),
    });
  }

  // 지훈 has asked to travel together — shows up as a pending request.
  await db.doc("tripRequests/jihun_demo").set({
    fromUserId: "jihun",
    toUserId: "demo",
    fromTripId: "jihunTokyo",
    toTripId: "demoTokyo",
    message: "도쿄 일정 겹쳐서 신청드려요!",
    status: "pending",
    createdAt: new Date(),
  });

  // 유나 is already a match, with a conversation going.
  await db.doc("swipes/demo_yuna").set({
    swiperId: "demo", targetId: "yuna", direction: "like", createdAt: new Date(),
  });
  await db.doc("swipes/yuna_demo").set({
    swiperId: "yuna", targetId: "demo", direction: "like", createdAt: new Date(),
  });
  await db.doc("matches/demo_yuna").set({
    participants: ["demo", "yuna"],
    source: "swipe",
    matchedAt: new Date(),
    lastMessage: "좋아요 👍",
    lastMessageAt: new Date(),
  });

  const chat = [
    ["yuna", "안녕하세요! 도쿄 일정 겹쳐서 반가워요 😊"],
    ["demo", "반가워요! 8일에 도착하시는 거죠?"],
    ["yuna", "네 오후에요. 카페 투어 같이 하실래요?"],
    ["demo", "좋아요 👍"],
  ];
  for (const [i, [senderId, text]] of chat.entries()) {
    await db.collection("matches/demo_yuna/messages").add({
      senderId,
      text,
      createdAt: new Date(Date.now() - (chat.length - i) * 60000),
    });
  }

  console.log(`seeded ${PEOPLE.length} people, ${TRIPS.length} trips`);
  console.log(`sign in as ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log("expected: 도쿄(둘 다) → 서연·지훈·유나, 오사카(동행만) → 민준 only (혜원 is filtered)");
}

await main();
