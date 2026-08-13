# dating-app

A dating app built with React Native (Expo), backed by Firebase
(Authentication + Firestore).

## Features

- 회원가입 / 로그인 & 프로필 편집 (Firebase Authentication)
- 스와이프 매칭 (제스처 기반 카드 + Like/Pass 버튼), 상호 좋아요 시 실시간 매칭
- 매칭된 상대와 실시간 채팅 (Firestore `onSnapshot`)
- 위치 기반 추천 — 내 위치 기준 반경 내 이상형 목록
- 내 주변에서 이상형을 찾으면 스와이프 없이 바로 친구 신청 → 상대가 수락하면 매칭

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (18+)
- The [Expo Go](https://expo.dev/go) app on your phone (iOS or Android)
- A [Firebase](https://console.firebase.google.com/) project

### 1. Firebase 프로젝트 설정

1. [Firebase 콘솔](https://console.firebase.google.com/)에서 새 프로젝트를 만듭니다.
2. **Build → Authentication → Get started** 에서 **Email/Password** 로그인 방식을 활성화합니다.
3. **Build → Firestore Database → Create database** 로 Firestore를 만듭니다 (테스트 모드로 시작해도 되지만, 아래 4번에서 이 저장소의 규칙으로 반드시 교체하세요).
4. **Firestore → Rules** 탭에 이 저장소의 [`firestore.rules`](./firestore.rules) 내용을 붙여넣고 게시합니다. (Firebase CLI가 있다면 `firebase deploy --only firestore:rules` 로도 배포할 수 있습니다.)
5. **프로젝트 설정 (⚙️) → 일반 → 내 앱** 에서 웹 앱을 추가하고, 발급된 설정값(`apiKey`, `authDomain` 등)을 복사합니다.

### 2. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 1번에서 복사한 값을 채워넣습니다. (`.env`는 git에 커밋되지 않습니다.)

### 3. 앱 실행

```bash
npm install
npx expo start
```

A QR code will appear in the terminal. Scan it with the Expo Go app (Android: in-app scanner; iOS: Camera app) to run the app on your phone.

### 매칭/채팅 테스트하기

Firestore는 처음엔 비어있어서, 스와이프·내 주변 화면에 아무도 안 보이는 게 정상입니다. 계정을 2개 이상 만들어서 (다른 이메일로 회원가입 후 로그아웃 → 재가입, 또는 다른 기기/시뮬레이터 사용) 서로 스와이프하거나 친구 신청을 보내 매칭·채팅을 테스트해보세요.

## Project Structure

```
dating-app/
├── App.js
├── app.json
├── firestore.rules             # Firestore 보안 규칙
├── .env.example
├── src/
│   ├── theme.js
│   ├── utils/location.js       # Location + Haversine distance
│   ├── firebase/
│   │   ├── config.js           # Firebase app/auth/firestore 초기화
│   │   ├── users.js            # 프로필 CRUD
│   │   ├── swipes.js           # 스와이프 기록 + 상호 좋아요 매칭
│   │   ├── matches.js          # 매칭 생성/구독
│   │   ├── chats.js            # 메시지 전송/구독
│   │   └── friendRequests.js   # 친구 신청 보내기/수락/거절
│   ├── hooks/
│   │   ├── useDiscoverPool.js
│   │   ├── useNearbyUsers.js
│   │   ├── useMatches.js
│   │   ├── useChatMessages.js
│   │   └── useReceivedFriendRequests.js
│   ├── context/
│   │   └── AuthContext.js      # 로그인 상태 + 프로필
│   ├── navigation/
│   │   ├── RootNavigator.js
│   │   ├── AuthStack.js
│   │   └── MainTabs.js
│   ├── components/
│   │   ├── SwipeCard.js
│   │   └── NearbyUserCard.js
│   └── screens/
│       ├── LoginScreen.js
│       ├── SignUpScreen.js
│       ├── ProfileScreen.js
│       ├── SwipeScreen.js
│       ├── NearbyScreen.js
│       ├── ChatListScreen.js
│       └── ChatRoomScreen.js
```

## Known limitations (다음 단계 후보)

- `swipes` 컬렉션은 (상호 좋아요를 클라이언트에서 판단할 수 있도록) 로그인한 모든 사용자가 읽을 수 있습니다. 프로덕션에서는 이 매칭 로직을 Cloud Functions로 옮겨서 스와이프 데이터를 비공개로 만드는 게 좋습니다.
- 내 주변 추천은 전체 사용자 목록을 가져와 클라이언트에서 거리 계산 후 필터링합니다. 사용자가 많아지면 geohash 기반 쿼리(예: `geofire-common`)로 바꿔야 합니다.
- 프로필 사진 업로드 (Firebase Storage)
- 매칭/메시지 푸시 알림
- 신고/차단 기능
