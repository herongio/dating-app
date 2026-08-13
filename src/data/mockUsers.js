// Mock user pool. Locations are jittered around Seoul city hall so the
// "nearby" feature has something to sort/filter by without a real backend.
const seoul = { lat: 37.5665, lng: 126.978 };

function near(base, kmish) {
  const deg = kmish / 111; // ~111km per degree of latitude
  return {
    lat: base.lat + (Math.random() - 0.5) * 2 * deg,
    lng: base.lng + (Math.random() - 0.5) * 2 * deg,
  };
}

export const MOCK_USERS = [
  {
    id: "u1",
    name: "지민",
    age: 27,
    gender: "female",
    bio: "여행과 커피를 좋아해요.",
    interests: ["여행", "커피", "사진"],
    avatar: "🧕",
    location: near(seoul, 1.2),
  },
  {
    id: "u2",
    name: "서준",
    age: 29,
    gender: "male",
    bio: "주말엔 등산 다닙니다.",
    interests: ["등산", "캠핑", "러닝"],
    avatar: "🧑",
    location: near(seoul, 3.5),
  },
  {
    id: "u3",
    name: "하윤",
    age: 25,
    gender: "female",
    bio: "고양이 두 마리 키워요.",
    interests: ["고양이", "영화", "카페투어"],
    avatar: "👩",
    location: near(seoul, 0.8),
  },
  {
    id: "u4",
    name: "도윤",
    age: 31,
    gender: "male",
    bio: "요리하는 걸 좋아해요.",
    interests: ["요리", "와인", "독서"],
    avatar: "👨",
    location: near(seoul, 5.0),
  },
  {
    id: "u5",
    name: "예은",
    age: 26,
    gender: "female",
    bio: "필라테스 강사입니다.",
    interests: ["운동", "필라테스", "건강"],
    avatar: "👩‍🦰",
    location: near(seoul, 2.1),
  },
  {
    id: "u6",
    name: "민재",
    age: 28,
    gender: "male",
    bio: "게임과 IT를 좋아하는 개발자예요.",
    interests: ["게임", "개발", "영화"],
    avatar: "🧑‍💻",
    location: near(seoul, 1.5),
  },
  {
    id: "u7",
    name: "수아",
    age: 24,
    gender: "female",
    bio: "그림 그리는 걸 좋아해요.",
    interests: ["그림", "전시회", "음악"],
    avatar: "👩‍🎨",
    location: near(seoul, 4.2),
  },
  {
    id: "u8",
    name: "지호",
    age: 30,
    gender: "male",
    bio: "강아지 산책이 취미예요.",
    interests: ["강아지", "산책", "사진"],
    avatar: "🧔",
    location: near(seoul, 0.5),
  },
];
