# dating-app

여행 일정이 겹치는 사람을 찾아주는 앱. React Native (Expo) + Firebase
(Authentication + Firestore + Storage + Cloud Functions).

같은 날 같은 도시에 가는 사람끼리만 만나는 게 핵심입니다. 여행을 등록하면
목적지·날짜가 겹치고 목적이 맞는 사람만 추천됩니다.

## Features

- 회원가입 / 로그인 & 프로필 편집 (Firebase Authentication)
- 프로필 사진 업로드 (Firebase Storage) — 없으면 이모지 아바타로 대체
- **여행 등록** — 목적지, 날짜, 이번 여행의 목적(동행 / 만남 / 둘 다), 한마디
- **일정 겹침 매칭** — 같은 도시 + 날짜 겹침 + 목적 호환인 사람만 노출
- 스와이프 (제스처 카드 + Like/Pass), 상호 좋아요 시 매칭
- 여행별 동행 찾기 목록에서 바로 "같이 가요" 신청 → 수락하면 매칭
- 매칭된 상대와 실시간 채팅 (Firestore `onSnapshot`)
- 매칭 · 새 메시지 푸시 알림 (Expo Push)
- 신고 / 차단 — 차단하면 서로 프로필이 숨겨지고 메시지도 차단됨

## 매칭 규칙

두 여행이 아래 세 조건을 **모두** 만족할 때만 서로에게 보입니다.

| 조건 | 판정 |
| --- | --- |
| 목적지 | `destinationId`가 정확히 같을 때 |
| 날짜 | 하루라도 겹칠 때 (`시작 ≤ 상대 종료 && 상대 시작 ≤ 종료`) |
| 목적 | 같거나, 한쪽이 "둘 다 좋아요"일 때 |

목적은 `companion`(동행 구해요) / `dating`(만남 열려있어요) / `both`(둘 다)
세 가지입니다. **성별·이상형 선호는 양쪽 다 `companion`이 아닐 때만
적용됩니다** — 순수하게 동행을 찾는 사이를 이상형 필터로 갈라놓지 않기
위해서입니다. 적용될 때는 양방향으로 봅니다.

한 사람은 목록에 한 번만 나오고, 내 여행 중 **가장 많이 겹치는** 여행 기준으로
보여집니다 (`src/firebase/travelMatching.js`).

여행지는 [`src/data/destinations.js`](./src/data/destinations.js)의 고정
목록에서 고릅니다. 장소 API 키가 필요 없고, 무엇보다 모든 여행이 안정적인
`destinationId`를 갖게 되므로 "도쿄 가는 사람"이 지리 범위 스캔이 아니라
**동등 비교 한 번**으로 끝납니다.

## Architecture

매칭 판정은 **Cloud Functions에서** 이뤄집니다. 클라이언트는 자기 스와이프만
기록하고, 상호 좋아요 감지 · 매칭 생성 · 푸시 발송은 서버가 합니다. 덕분에
`swipes` 컬렉션을 본인만 읽을 수 있게 잠글 수 있고, "누가 나를 좋아했는지"가
매칭 전에 새어나가지 않습니다.

| 트리거 | 하는 일 |
| --- | --- |
| `onSwipeCreated` | 상호 좋아요면 `matches/{sortedPair}` 생성 |
| `onTripRequestResponded` | "같이 가요" 신청 수락 시 매칭 생성 |
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

### 3. 규칙 · 색인 · Cloud Functions 배포

```bash
npm install -g firebase-tools     # 이미 있으면 생략
firebase login
firebase use --add                # 위에서 만든 프로젝트 선택

cd functions && npm install && cd ..
firebase deploy --only firestore,storage:rules,functions
```

> **규칙 배포는 선택이 아니라 필수입니다.** 이 앱의 보안 모델(스와이프 비공개,
> 매칭 위조 방지, 차단)은 전부 [`firestore.rules`](./firestore.rules)와
> [`storage.rules`](./storage.rules)에 들어 있습니다. 테스트 모드 기본 규칙으로
> 두면 아무나 남의 스와이프를 읽고 매칭을 조작할 수 있습니다.

`--only firestore`에는 규칙과 함께
[`firestore.indexes.json`](./firestore.indexes.json)의 복합 색인
(`trips`: `destinationId` + `endDate`)이 포함됩니다. 이 색인이 없으면 동행 찾기
쿼리가 실패합니다.

Functions는 `asia-northeast3`(서울) 리전에 배포됩니다. 다른 리전을 쓰려면
[`functions/index.js`](./functions/index.js)의 `setGlobalOptions`를 바꾸세요.

### 4. 앱 실행

```bash
npm install
npx expo start
```

A QR code will appear in the terminal. Scan it with the Expo Go app (Android: in-app scanner; iOS: Camera app) to run the app on your phone.

### 매칭/채팅 테스트하기

계정을 2개 이상 만들고(다른 이메일로 회원가입 후 로그아웃 → 재가입, 또는 다른
기기/시뮬레이터), **양쪽 모두 같은 여행지에 날짜가 겹치는 여행을 등록**해야
서로가 보입니다. 목적도 호환돼야 하니 둘 다 "둘 다 좋아요"로 두면 가장 쉽게
확인할 수 있습니다.

매칭 알림은 Cloud Function이 매칭 문서를 만든 뒤 구독을 통해 도착하므로,
스와이프 직후가 아니라 1초 안팎 뒤에 뜹니다.

### 푸시 알림에 대해

푸시 토큰은 EAS 프로젝트 id가 있어야 발급됩니다. Expo Go에서 그냥 실행하면
토큰이 없어 푸시만 조용히 비활성화되고, 나머지 기능은 그대로 동작합니다.
실제로 받아보려면 `eas init` 후 development build로 실행하세요.

## 에뮬레이터로 실행하기 (Firebase 프로젝트 없이)

Firebase 계정 없이 앱을 띄워볼 수 있습니다. 터미널 세 개로:

```bash
npm run emulators                 # Auth · Firestore · Storage · Functions
npm run seed                      # 데모 여행자 5명, 여행 6개, 대화 1건
EXPO_PUBLIC_FIREBASE_EMULATOR=1 npx expo start
```

`.env`에는 아무 값이나 채워도 됩니다 — 에뮬레이터는 자격증명을 검사하지 않습니다.
시드가 만들어주는 계정은 `demo@travel.app` / `demo1234` 입니다.

`EXPO_PUBLIC_FIREBASE_EMULATOR=1` 일 때만
[`src/firebase/config.js`](./src/firebase/config.js)가 에뮬레이터에 붙습니다.
실기기에서 붙일 땐 `EXPO_PUBLIC_EMULATOR_HOST`에 개발 PC의 LAN IP를 넣으세요.

웹으로도 뜹니다 (`npx expo start --web`). 날짜 선택기만 플랫폼별로 갈리는데,
`@react-native-community/datetimepicker`에 웹 구현이 없어서
[`DateField.web.js`](./src/components/DateField.web.js)가 브라우저 기본 날짜
입력을 대신 씁니다.

## Tests

```bash
npm test              # 아래 셋 전부
npm run test:unit     # 매칭 규칙 (에뮬레이터 불필요)
npm run test:rules    # firestore.rules
npm run test:functions
```

`test:unit`은 `src/utils/trips.js`를 그대로 불러 날짜 겹침·목적 호환 판정을
검증합니다. 나머지 둘은 Firebase 에뮬레이터 위에서 돌아갑니다 (Java 필요,
`firebase-tools`는 devDependency로 들어있습니다).

## Project Structure

```
dating-app/
├── App.js
├── app.json
├── firebase.json               # 배포/에뮬레이터 설정
├── firestore.rules             # Firestore 보안 규칙
├── firestore.indexes.json      # trips 복합 색인
├── storage.rules               # Storage 보안 규칙
├── .env.example
├── functions/                  # Cloud Functions (매칭 · 차단 미러 · 푸시)
│   ├── index.js
│   ├── ids.js                  # uid 쌍 → 문서 id
│   └── push.js                 # Expo push 발송
├── scripts/
│   └── seed-emulator.mjs       # 에뮬레이터 데모 데이터
├── tests/
│   ├── trips.test.mjs          # 매칭 규칙 단위 테스트
│   ├── firestore.test.mjs      # 보안 규칙 테스트
│   └── functions.test.mjs      # 트리거 테스트
├── src/
│   ├── theme.js
│   ├── data/
│   │   ├── destinations.js     # 여행지 목록 (좌표 포함)
│   │   └── travelStyles.js     # 여행 스타일 · 예산 · 페이스 선택지
│   ├── utils/
│   │   ├── trips.js            # 날짜 겹침 · 목적 호환 · 표기
│   │   ├── notifications.js    # Expo push 토큰 등록
│   │   └── firebaseErrors.js
│   ├── firebase/
│   │   ├── config.js           # Firebase app/auth/firestore/storage 초기화
│   │   ├── users.js            # 프로필 CRUD
│   │   ├── trips.js            # 여행 CRUD + 목적지별 조회
│   │   ├── travelMatching.js   # 내 여행 ↔ 남의 여행 겹침 계산
│   │   ├── storage.js          # 프로필 사진 업로드/삭제
│   │   ├── swipes.js           # 스와이프 기록 (매칭 판정은 서버)
│   │   ├── matches.js          # 매칭 구독
│   │   ├── chats.js            # 메시지 전송/구독
│   │   ├── tripRequests.js     # "같이 가요" 신청/수락/거절
│   │   ├── moderation.js       # 신고 · 차단
│   │   └── pushTokens.js       # 푸시 토큰 저장 (비공개 컬렉션)
│   ├── hooks/
│   │   ├── useMyTrips.js
│   │   ├── useTripCandidates.js
│   │   ├── useDiscoverPool.js
│   │   ├── useChatMessages.js
│   │   ├── useReceivedTripRequests.js
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
│   │   ├── DateField.js        # iOS/Android 날짜 선택
│   │   ├── DateField.web.js    # 웹용 날짜 입력
│   │   ├── DestinationPicker.js
│   │   ├── TripCard.js         # 내 여행 카드
│   │   ├── TravelerCard.js     # 동행 후보 카드
│   │   ├── SwipeCard.js
│   │   └── ModerationButton.js # 신고/차단 메뉴
│   └── screens/
│       ├── LoginScreen.js
│       ├── SignUpScreen.js
│       ├── ProfileScreen.js
│       ├── SwipeScreen.js
│       ├── TripsScreen.js
│       ├── TripFormScreen.js
│       ├── TripTravelersScreen.js
│       ├── ChatListScreen.js
│       └── ChatRoomScreen.js
```

## Known limitations (다음 단계 후보)

- 여행지가 [고정 목록](./src/data/destinations.js) 32곳으로 제한됩니다. 목록에
  없는 곳으로 가는 사람은 여행을 등록할 수 없습니다. 장소 API 연동이나
  "근처 도시까지 포함" 옵션이 다음 단계입니다.
- 목적지가 정확히 같아야 매칭됩니다. 오사카와 교토처럼 붙어 있는 도시는 서로
  안 잡힙니다.
- 여행 스타일·예산·페이스는 카드에 표시만 되고 매칭 조건에는 안 들어갑니다.
  정렬 가중치로 쓰는 게 다음 단계입니다.
- 신고는 `reports` 컬렉션에 쌓이기만 하고, 검토는 Firebase 콘솔에서 수동으로
  해야 합니다.
- 차단해도 이미 만들어진 매칭 문서와 지난 메시지는 남아 있고, 양쪽 화면에서
  숨겨지기만 합니다.
- 푸시 알림을 눌러도 해당 채팅방으로 바로 이동하지는 않습니다 (딥링크 미구현).
- 지난 여행은 목록에 남지만 자동으로 정리되지는 않습니다.
- 스와이프 덱 뒤에 깔린 카드는 앞 카드보다 짧으면 완전히 가려집니다. 제대로
  된 카드 스택 효과를 내려면 카드 높이를 고정해야 합니다.
