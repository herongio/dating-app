# dating-app

A dating app built with React Native (Expo), backed by Firebase
(Authentication + Firestore + Storage + Cloud Functions).

## Features

- 회원가입 / 로그인 & 프로필 편집 (Firebase Authentication)
- 프로필 사진 업로드 (Firebase Storage) — 없으면 이모지 아바타로 대체
- 스와이프 매칭 (제스처 기반 카드 + Like/Pass 버튼), 상호 좋아요 시 실시간 매칭
- 매칭된 상대와 실시간 채팅 (Firestore `onSnapshot`)
- 위치 기반 추천 — 내 위치 기준 반경 내 이상형 목록 (geohash 쿼리)
- 내 주변에서 이상형을 찾으면 스와이프 없이 바로 친구 신청 → 상대가 수락하면 매칭
- 매칭 · 새 메시지 푸시 알림 (Expo Push)
- 신고 / 차단 — 차단하면 서로 프로필이 숨겨지고 메시지도 차단됨

## Architecture

매칭 판정은 **Cloud Functions에서** 이뤄집니다. 클라이언트는 자기 스와이프만
기록하고, 상호 좋아요 감지 · 매칭 생성 · 푸시 발송은 서버가 합니다. 덕분에
`swipes` 컬렉션을 본인만 읽을 수 있게 잠글 수 있고, "누가 나를 좋아했는지"가
매칭 전에 새어나가지 않습니다.

| 트리거 | 하는 일 |
| --- | --- |
| `onSwipeCreated` | 상호 좋아요면 `matches/{sortedPair}` 생성 |
| `onFriendRequestResponded` | 친구 신청 수락 시 매칭 생성 |
| `onBlockWritten` | `blocks` → 대칭 `blockPairs` 미러 유지 |
| `onMatchCreated` | 양쪽에 매칭 푸시 발송 |
| `onMessageCreated` | 수신자에게 메시지 푸시 발송 |

`matches` / `blockPairs` 문서 id는 두 uid를 정렬해 이어붙인 값이라, 보안 규칙이
`exists(/blockPairs/$(matchId))` 한 번으로 "이 대화 상대가 차단된 사이인가"를
판정할 수 있습니다.

차단은 두 컬렉션으로 나뉩니다. `blocks/{blockerId}_{blockedId}`는 **차단한
사람만** 읽고 지울 수 있고, Cloud Function이 이를 `blockPairs`로 미러링합니다.
`blockPairs`에는 uid 쌍만 담겨 있어서, 차단당한 쪽은 서로 안 보이게 됐다는 건
알아도 **누가 차단했는지는 알 수 없습니다.**

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (20+)
- The [Expo Go](https://expo.dev/go) app on your phone (iOS or Android)
- A [Firebase](https://console.firebase.google.com/) project **on the Blaze
  plan** — Cloud Functions는 무료(Spark) 요금제에서 배포할 수 없습니다.

### 1. Firebase 프로젝트 설정

1. [Firebase 콘솔](https://console.firebase.google.com/)에서 새 프로젝트를 만들고 Blaze 요금제로 전환합니다.
2. **Build → Authentication → Get started** 에서 **Email/Password** 로그인 방식을 활성화합니다.
3. **Build → Firestore Database → Create database** 로 Firestore를 만듭니다.
4. **Build → Storage → Get started** 로 Storage 버킷을 만듭니다 (프로필 사진 업로드에 필요).
5. **프로젝트 설정 (⚙️) → 일반 → 내 앱** 에서 웹 앱을 추가하고, 발급된 설정값(`apiKey`, `authDomain` 등)을 복사합니다.

### 2. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 1번에서 복사한 값을 채워넣습니다. (`.env`는 git에 커밋되지 않습니다.)

### 3. 보안 규칙 & Cloud Functions 배포

```bash
npm install -g firebase-tools     # 이미 있으면 생략
firebase login
firebase use --add                # 위에서 만든 프로젝트 선택

cd functions && npm install && cd ..
firebase deploy --only firestore:rules,storage:rules,functions
```

> **규칙 배포는 선택이 아니라 필수입니다.** 이 앱의 보안 모델(스와이프 비공개,
> 매칭 위조 방지, 차단)은 전부 [`firestore.rules`](./firestore.rules)와
> [`storage.rules`](./storage.rules)에 들어 있습니다. 테스트 모드 기본 규칙으로
> 두면 아무나 남의 스와이프를 읽고 매칭을 조작할 수 있습니다.

Functions는 `asia-northeast3`(서울) 리전에 배포됩니다. 다른 리전을 쓰려면
[`functions/index.js`](./functions/index.js)의 `setGlobalOptions`를 바꾸세요.

### 4. 앱 실행

```bash
npm install
npx expo start
```

A QR code will appear in the terminal. Scan it with the Expo Go app (Android: in-app scanner; iOS: Camera app) to run the app on your phone.

### 매칭/채팅 테스트하기

Firestore는 처음엔 비어있어서, 스와이프·내 주변 화면에 아무도 안 보이는 게 정상입니다. 계정을 2개 이상 만들어서 (다른 이메일로 회원가입 후 로그아웃 → 재가입, 또는 다른 기기/시뮬레이터 사용) 서로 스와이프하거나 친구 신청을 보내 매칭·채팅을 테스트해보세요.

매칭 알림은 이제 Cloud Function이 매칭 문서를 만든 뒤 구독을 통해 도착하므로,
스와이프 직후가 아니라 1초 안팎 뒤에 뜹니다.

### 푸시 알림에 대해

푸시 토큰은 EAS 프로젝트 id가 있어야 발급됩니다. Expo Go에서 그냥 실행하면
토큰이 없어 푸시만 조용히 비활성화되고, 나머지 기능은 그대로 동작합니다.
실제로 받아보려면 `eas init` 후 development build로 실행하세요.

## Tests

Firestore 보안 규칙과 Cloud Functions 트리거는 에뮬레이터 위에서 테스트합니다
(Java 필요, `firebase-tools`는 devDependency로 들어있습니다).

```bash
npm test              # 규칙 + 트리거 전체
npm run test:rules    # firestore.rules 만
npm run test:functions
```

## Project Structure

```
dating-app/
├── App.js
├── app.json
├── firebase.json               # 배포/에뮬레이터 설정
├── firestore.rules             # Firestore 보안 규칙
├── storage.rules               # Storage 보안 규칙
├── .env.example
├── functions/                  # Cloud Functions (매칭 · 차단 미러 · 푸시)
│   ├── index.js
│   ├── ids.js                  # uid 쌍 → 문서 id
│   └── push.js                 # Expo push 발송
├── tests/
│   ├── firestore.test.mjs      # 보안 규칙 테스트
│   └── functions.test.mjs      # 트리거 테스트
├── src/
│   ├── theme.js
│   ├── utils/
│   │   ├── location.js         # 위치 + geohash + 거리 계산
│   │   ├── notifications.js    # Expo push 토큰 등록
│   │   └── firebaseErrors.js
│   ├── firebase/
│   │   ├── config.js           # Firebase app/auth/firestore/storage 초기화
│   │   ├── users.js            # 프로필 CRUD + geohash 반경 쿼리
│   │   ├── storage.js          # 프로필 사진 업로드/삭제
│   │   ├── swipes.js           # 스와이프 기록 (매칭 판정은 서버)
│   │   ├── matches.js          # 매칭 구독
│   │   ├── chats.js            # 메시지 전송/구독
│   │   ├── friendRequests.js   # 친구 신청 보내기/수락/거절
│   │   ├── moderation.js       # 신고 · 차단
│   │   └── pushTokens.js       # 푸시 토큰 저장 (비공개 컬렉션)
│   ├── hooks/
│   │   ├── useDiscoverPool.js
│   │   ├── useNearbyUsers.js
│   │   ├── useChatMessages.js
│   │   ├── useReceivedFriendRequests.js
│   │   └── useBlockedProfiles.js
│   ├── context/
│   │   ├── AuthContext.js      # 로그인 상태 + 프로필
│   │   ├── BlockContext.js     # 차단 목록 (전역 1회 구독)
│   │   └── MatchesContext.js   # 매칭 목록 + 새 매칭 알림
│   ├── navigation/
│   │   ├── RootNavigator.js
│   │   ├── AuthStack.js
│   │   └── MainTabs.js
│   ├── components/
│   │   ├── Avatar.js           # 사진 또는 이모지 아바타
│   │   ├── SwipeCard.js
│   │   ├── NearbyUserCard.js
│   │   └── ModerationButton.js # 신고/차단 메뉴
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

- **기존 사용자 마이그레이션**: geohash 도입 전에 가입한 프로필에는 `geohash`
  필드가 없어서 내 주변 검색에 안 잡힙니다. 앱을 한 번 열면 로그인 시점에
  현재 위치와 geohash가 다시 기록되면서 자동으로 복구됩니다.
- 스와이프 덱은 `users`에서 100명을 가져와 클라이언트에서 거른 뒤 보여줍니다.
  사용자가 많아지면 내 주변처럼 geohash 기반 페이지네이션으로 바꿔야 합니다.
- 신고는 `reports` 컬렉션에 쌓이기만 하고, 검토는 Firebase 콘솔에서 수동으로
  해야 합니다. 자동 조치(임계치 초과 시 계정 정지 등)는 아직 없습니다.
- 차단해도 이미 만들어진 매칭 문서와 지난 메시지는 남아 있고, 양쪽 화면에서
  숨겨지기만 합니다.
- 푸시 알림을 눌러도 해당 채팅방으로 바로 이동하지는 않습니다 (딥링크 미구현).
