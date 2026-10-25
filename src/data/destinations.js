// A curated destination list instead of a places API: it needs no API key,
// works offline, and — more importantly — gives every trip a stable
// `destinationId`. That turns "who else is going to Tokyo?" into a single
// equality filter in Firestore rather than a geo range scan.
//
// The full catalog below is the *resolver*: `destinationById` must keep
// answering for every id that was ever written to a trip. Which destinations
// people may pick for a *new* trip is a separate, much shorter list — see
// LAUNCH_DESTINATION_IDS.
export const DESTINATIONS = [
  { id: "seoul", name: "서울", country: "대한민국", emoji: "🏙️", lat: 37.5665, lng: 126.978 },
  { id: "busan", name: "부산", country: "대한민국", emoji: "🌊", lat: 35.1796, lng: 129.0756 },
  { id: "jeju", name: "제주", country: "대한민국", emoji: "🍊", lat: 33.4996, lng: 126.5312 },
  { id: "gangneung", name: "강릉", country: "대한민국", emoji: "🏖️", lat: 37.7519, lng: 128.8761 },
  { id: "gyeongju", name: "경주", country: "대한민국", emoji: "🏯", lat: 35.8562, lng: 129.2247 },
  { id: "yeosu", name: "여수", country: "대한민국", emoji: "🌉", lat: 34.7604, lng: 127.6622 },
  { id: "tokyo", name: "도쿄", country: "일본", emoji: "🗼", lat: 35.6762, lng: 139.6503 },
  { id: "osaka", name: "오사카", country: "일본", emoji: "🍜", lat: 34.6937, lng: 135.5023 },
  { id: "fukuoka", name: "후쿠오카", country: "일본", emoji: "🍢", lat: 33.5904, lng: 130.4017 },
  { id: "sapporo", name: "삿포로", country: "일본", emoji: "❄️", lat: 43.0618, lng: 141.3545 },
  { id: "okinawa", name: "오키나와", country: "일본", emoji: "🐠", lat: 26.2124, lng: 127.6809 },
  { id: "taipei", name: "타이베이", country: "대만", emoji: "🥟", lat: 25.033, lng: 121.5654 },
  { id: "hongkong", name: "홍콩", country: "홍콩", emoji: "🌃", lat: 22.3193, lng: 114.1694 },
  { id: "bangkok", name: "방콕", country: "태국", emoji: "🛺", lat: 13.7563, lng: 100.5018 },
  { id: "chiangmai", name: "치앙마이", country: "태국", emoji: "🐘", lat: 18.7883, lng: 98.9853 },
  { id: "danang", name: "다낭", country: "베트남", emoji: "🏝️", lat: 16.0544, lng: 108.2022 },
  { id: "hanoi", name: "하노이", country: "베트남", emoji: "🍲", lat: 21.0278, lng: 105.8342 },
  { id: "bali", name: "발리", country: "인도네시아", emoji: "🌴", lat: -8.4095, lng: 115.1889 },
  { id: "singapore", name: "싱가포르", country: "싱가포르", emoji: "🦁", lat: 1.3521, lng: 103.8198 },
  { id: "kualalumpur", name: "쿠알라룸푸르", country: "말레이시아", emoji: "🏙️", lat: 3.139, lng: 101.6869 },
  { id: "cebu", name: "세부", country: "필리핀", emoji: "🤿", lat: 10.3157, lng: 123.8854 },
  { id: "paris", name: "파리", country: "프랑스", emoji: "🗼", lat: 48.8566, lng: 2.3522 },
  { id: "rome", name: "로마", country: "이탈리아", emoji: "🏛️", lat: 41.9028, lng: 12.4964 },
  { id: "barcelona", name: "바르셀로나", country: "스페인", emoji: "🏖️", lat: 41.3874, lng: 2.1686 },
  { id: "london", name: "런던", country: "영국", emoji: "☂️", lat: 51.5072, lng: -0.1276 },
  { id: "prague", name: "프라하", country: "체코", emoji: "🌉", lat: 50.0755, lng: 14.4378 },
  { id: "istanbul", name: "이스탄불", country: "튀르키예", emoji: "🕌", lat: 41.0082, lng: 28.9784 },
  { id: "newyork", name: "뉴욕", country: "미국", emoji: "🗽", lat: 40.7128, lng: -74.006 },
  { id: "losangeles", name: "로스앤젤레스", country: "미국", emoji: "🌴", lat: 34.0522, lng: -118.2437 },
  { id: "hawaii", name: "하와이", country: "미국", emoji: "🌺", lat: 21.3099, lng: -157.8581 },
  { id: "vancouver", name: "밴쿠버", country: "캐나다", emoji: "🍁", lat: 49.2827, lng: -123.1207 },
  { id: "sydney", name: "시드니", country: "호주", emoji: "🦘", lat: -33.8688, lng: 151.2093 },
];

const BY_ID = new Map(DESTINATIONS.map((d) => [d.id, d]));

// Matching needs a same-city *and* same-dates coincidence, so candidate
// density falls off far faster than in a plain dating app. Spread over all 32
// cities and a six-month booking window, it takes roughly 33,000 accounts
// before a typical traveller sees anyone at all; concentrated on three cities
// in one season it takes about 2,000. Until the user base clears that, the
// catalog is the throttle: offer the corridor, not the world.
export const LAUNCH_DESTINATION_IDS = ["osaka", "tokyo", "danang"];

// "launch" (the default) offers only the corridor; "all" opens the catalog.
// Set EXPO_PUBLIC_DESTINATION_SCOPE=all to widen it — no code change, and
// trips already written to other cities keep resolving either way.
export function destinationScope() {
  return process.env.EXPO_PUBLIC_DESTINATION_SCOPE === "all" ? "all" : "launch";
}

export function isLaunchDestination(id) {
  return LAUNCH_DESTINATION_IDS.includes(id);
}

// The destinations a new trip may be created in. `keepId` is the trip's
// current destination when editing: an existing Paris trip must stay editable
// without silently being moved to another city.
export function availableDestinations(keepId = null) {
  if (destinationScope() === "all") return DESTINATIONS;
  const ids = new Set(LAUNCH_DESTINATION_IDS);
  if (keepId) ids.add(keepId);
  return DESTINATIONS.filter((d) => ids.has(d.id));
}

export function destinationById(id) {
  return BY_ID.get(id) ?? null;
}

export function searchDestinations(query, keepId = null) {
  const pool = availableDestinations(keepId);
  const q = query.trim().toLowerCase();
  if (!q) return pool;
  return pool.filter(
    (d) => d.name.toLowerCase().includes(q) || d.country.toLowerCase().includes(q)
  );
}
