# dating-app

A dating app built with React Native (Expo). All data (accounts, swipes,
matches, chats) is mocked and stored on-device — there's no backend yet.

## Features

- 회원가입 / 로그인 & 프로필 편집
- 스와이프 매칭 (제스처 기반 카드 + Like/Pass 버튼)
- 매칭된 상대와 채팅
- 위치 기반 추천 — 내 위치 기준 반경 내 이상형 목록
- 내 주변에서 이상형을 찾으면 스와이프 없이 바로 친구 신청 → 즉시 매칭

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (18+)
- The [Expo Go](https://expo.dev/go) app on your phone (iOS or Android)

### Run it

```bash
npm install
npx expo start
```

A QR code will appear in the terminal. Scan it with the Expo Go app (Android: in-app scanner; iOS: Camera app) to run the app on your phone.

## Project Structure

```
dating-app/
├── App.js
├── app.json
├── src/
│   ├── theme.js
│   ├── data/mockUsers.js       # Mock profile pool
│   ├── utils/
│   │   ├── storage.js          # AsyncStorage helpers
│   │   └── location.js         # Location + Haversine distance
│   ├── context/
│   │   ├── AuthContext.js      # Sign up / login / profile (mocked, on-device)
│   │   └── AppDataContext.js   # Swipes, matches, friend requests, chats
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

## Roadmap

- [ ] Real backend (auth, profiles, matches, chat) — currently everything is
      mocked and stored locally with AsyncStorage
- [ ] Profile photo upload
- [ ] Push notifications for new matches/messages
- [ ] Report/block users
