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
- **휴대폰 인증** — 인증 전에는 둘러보기만 되고, 여행 등록·스와이프·신청·메시지가 전부 막힘
- **신고 자동 처리** — 신고 즉시 차단, 서로 다른 신고자가 모이면 자동 정지 + 운영자 검토 큐
- 만 19세 미만 가입 차단

## 매칭 규칙

두 여행이 아래 세 조건을 **모두** 만족할 때만 서로에게 보입니다.

| 조건 | 판정 |
| --- | --- |
| 목적지 | `destinationId`가 정확히 같을 때 |
| 날짜 | 하루라도 겹칠 때 (`시작 ≤ 상대 종료 && 상대 시작 ≤ 종료`) |
| 목적 | 아래 표대로 |

목적은 `companion`(동행만 구해요) / `dating`(만남 열려있어요) / `both`(둘 다)
세 가지이고, **`companion`은 닫힌 풀입니다** — `companion`끼리만 매칭됩니다.

| | companion | dating | both |
| --- | --- | --- | --- |
| **companion** | ✅ | ❌ | ❌ |
| **dating** | ❌ | ✅ | ✅ |
| **both** | ❌ | ✅ | ✅ |

`both`가 `companion`으로 넘어가게 두면 매칭 대기시간은 절반으로 줄지만, 동행만
찾겠다고 선택한 사람이 정확히 자기가 거부한 경험을 받게 됩니다. 낯선 사람과
며칠을 함께 보내는 서비스에서 그건 그냥 이탈입니다. 밀도를 포기하고 풀을
나눴습니다.

**성별·이상형 선호는 양쪽 다 `companion`이 아닐 때만 적용됩니다** — 순수하게
동행을 찾는 사이를 이상형 필터로 갈라놓지 않기 위해서입니다. 적용될 때는
양방향으로 봅니다.

한 사람은 목록에 한 번만 나오고, 내 여행 중 **가장 많이 겹치는** 여행 기준으로
보여집니다 (`src/firebase/travelMatching.js`).

여행지는 [`src/data/destinations.js`](./src/data/destinations.js)의 고정
목록에서 고릅니다. 장소 API 키가 필요 없고, 무엇보다 모든 여행이 안정적인
`destinationId`를 갖게 되므로 "도쿄 가는 사람"이 지리 범위 스캔이 아니라
**동등 비교 한 번**으로 끝납니다.

### 출시 범위: 도시 3개

새 여행을 등록할 수 있는 도시는 **오사카 · 도쿄 · 다낭** 셋뿐입니다
(`LAUNCH_DESTINATION_IDS`). 카탈로그 32곳은 그대로 남아 있지만 *선택지*로는
노출되지 않습니다.

이건 기능 부족이 아니라 의도된 제약입니다. 이 앱의 매칭은 "같은 도시 **그리고**
겹치는 날짜"가 동시에 맞아야 해서, 후보 밀도가 일반 데이팅 앱보다 훨씬 빠르게
0으로 떨어집니다. 32개 도시 × 6개월 예약창에 흩어지면 평균적인 사용자가 한
명이라도 보기까지 **약 33,000 가입자**가 필요하고, 한 시즌 3개 도시에 모으면
**약 2,000명**이면 됩니다. 15배 차이입니다. 그 선을 넘기 전까지 카탈로그가
밀도 조절 장치입니다.

```bash
EXPO_PUBLIC_DESTINATION_SCOPE=all   # 32곳 전체 개방
```

`destinationById()`는 범위와 무관하게 32곳 전부를 계속 해석합니다. 범위를
좁히기 전에 등록된 여행(예: 파리)도 카드에 도시 이름이 정상 표시되고, 수정
화면에서도 자기 도시가 선택지에 남습니다.

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
| `onReportWritten` | 신고 → 즉시 차단 + 신고자 수 집계 + 임계치 도달 시 자동 정지 |
| `onMatchCreated` | 양쪽에 매칭 푸시 발송 |
| `onMessageCreated` | 수신자에게 메시지 푸시 발송 |
| `startPhoneVerification` (callable) | 6자리 코드 발급 + SMS 발송 |
| `confirmPhoneVerification` (callable) | 코드 검증 → `verified` 커스텀 클레임 |

`matches` / `blockPairs` 문서 id는 두 uid를 정렬해 이어붙인 값이라, 보안 규칙이
`exists(/blockPairs/$(matchId))` 한 번으로 "이 대화 상대가 차단된 사이인가"를
판정할 수 있습니다.

차단은 두 컬렉션으로 나뉩니다. `blocks/{blockerId}_{blockedId}`는 **차단한
사람만** 읽고 지울 수 있고, Cloud Function이 이를 `blockPairs`로 미러링합니다.
`blockPairs`에는 uid 쌍만 담겨 있어서, 차단당한 쪽은 서로 안 보이게 됐다는 건
알아도 **누가 차단했는지는 알 수 없습니다.**

### 휴대폰 인증

인증은 callable 두 개로 끝납니다. 코드는 서버에서 만들어 해시로만 저장되고,
확인되면 `verified` 커스텀 클레임이 붙습니다. **보안 규칙이 보는 건 이
클레임뿐이고**, 클라이언트가 쓸 수 있는 어떤 문서도 이 판정에 끼어들 수
없습니다.

| 막는 것 | 방법 |
| --- | --- |
| 코드 유출 | 평문 저장 안 함 (`sha256(uid:code)`) |
| 무차별 입력 | 5회 시도 제한 + 5분 만료 |
| SMS 폭탄 | 재발송 60초 쿨다운 |
| 번호 재사용 (sybil) | `phoneHashes/{hash}` — 한 번호 한 계정 |
| 번호 유출 | **번호를 저장하지 않습니다.** peppered 해시만 보관 |

인증 전 계정은 **둘러보기는 되지만** 여행 등록·스와이프·신청·메시지가 전부
막힙니다 (`isVerified()`). 가입 직후 바로 막지 않는 건, 실제 여행자가 있는지
보고 나서 번호를 넘기게 하는 게 전환에 유리하기 때문입니다.

SMS 공급자는 [`functions/sms.js`](./functions/sms.js)의 `deliver` 하나만
바꾸면 교체됩니다. 에뮬레이터에서는 발송 대신 코드를 호출자에게 돌려줘서
(`devCode`) 흐름 전체를 테스트할 수 있습니다.

> **아직 스텁인 부분:** 한국의 **본인인증**(PASS/NICE)은 통신사가 확인한
> 이름·생년월일·성별을 돌려주는, 번호 소유 확인보다 강한 절차입니다. 현재
> 구현은 **번호 소유만** 검증하고, 만 19세 판정은 자기 신고 나이를 보안
> 규칙에서 막는 수준입니다. 공급자를 붙이는 지점은
> [`functions/identity.js`](./functions/identity.js)의 `resolve` 하나로
> 모아뒀고, 붙이면 생년월일 기준 성인 판정과 `adult` 클레임이 자동으로
> 켜집니다.

### 신고 처리

신고 하나에 항상 같은 세 가지가 일어납니다 — **서로 차단**, **집계 갱신**,
**임계치 검사**.

| 조건 | 결과 |
| --- | --- |
| 서로 다른 신고자 3명 | 자동 정지 (`reporter_threshold`) |
| 심각 사유(`underage`/`scam`/`harassment`) 신고자 2명 | 자동 정지 (`severe_threshold`) |
| 한 사람이 몇 번을 신고하든 | **절대 정지되지 않음** |

마지막 줄이 핵심입니다. `reports` 문서 id가 `{신고자}_{대상}`이라 한 사람은
한 대상에 대해 신고를 하나만 가질 수 있고(재신고는 덮어쓰기), 집계는 신고
건수가 아니라 **서로 다른 신고자 수**로 셉니다. 이게 없으면 신고가 아무나
남의 계정을 지우는 무기가 됩니다.

정지된 계정은 **읽기는 유지**합니다 — 자기 대화를 보고 이의를 제기할 수
있어야 하니까요. 대신 여행 등록·스와이프·신청·메시지가 막히고
(`isActive()`), 다른 사람의 후보 목록에서 빠지며, 상호 좋아요가 생겨도
`createMatch`가 매칭을 만들지 않습니다.

정지는 자동이지만 **검토는 사람이 합니다.** 모든 자동 정지는
`moderationQueue/{uid}`에 `awaiting_review`로 쌓이고 `logger.warn`으로도
남습니다. 오탐과 이의 제기는 사람만 볼 수 있습니다.

프로필의 `suspendedAt` · `phoneVerified` 같은 필드는 **서버 소유**입니다.
프로필은 본인이 쓰는 문서라서, 이걸 막지 않으면 정지된 사람이 자기
`suspendedAt`을 지우고 후보 목록에 다시 나타날 수 있습니다
(`serverOwnedUserFields()`).

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
npm run deploy:backend            # 배포 명령과 시크릿 설정은 4번 참고
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

### 4. 배포

```bash
npx firebase functions:secrets:set PHONE_HASH_PEPPER  # 긴 무작위 문자열 (한 번)
npm run deploy                                        # 규칙·색인·Functions·웹 호스팅
npm run deploy:backend                                # 웹 빌드 없이 백엔드만
```

`npm run deploy`는 `expo export --platform web`으로 `dist/`를 만들어 Firebase
Hosting에 올립니다. `.env`에 **실제 웹 앱 설정**이 들어 있어야 하고
`EXPO_PUBLIC_FIREBASE_EMULATOR=1`이 남아 있으면 스크립트가 배포를 거부합니다 —
에뮬레이터를 가리키는 웹 앱을 올리는 사고를 막기 위해서입니다.

`PHONE_HASH_PEPPER`는 Secret Manager에 들어갑니다 (`functions/index.js`의
`defineSecret`). 번호 해시가 전 국민 휴대폰 번호 레인보우 테이블이 되지 않게
하는 값이라 평문 설정에 두지 않습니다. 에뮬레이터는 gitignore된
`functions/.secret.local`에서 읽습니다.

**SMS 공급자 없이 배포한 경우:** 배포 자체는 되지만 운영 환경에서 인증번호
발송이 실패해 아무도 인증을 통과하지 못합니다. 그 사이 테스트 계정은
운영자가 직접 인증 처리할 수 있습니다.

```bash
GCLOUD_PROJECT=<project-id> npm run grant-verified -- someone@example.com
```

`confirmPhoneVerification`이 하는 두 쓰기(클레임 + `phoneVerified` 필드)만
그대로 하므로 정상 흐름이 줄 수 없는 권한은 주지 못합니다. 공급자를 붙이려면
[`functions/sms.js`](./functions/sms.js)의 `deliver`를 구현하고
`SMS_ENDPOINT` / `SMS_API_KEY` / `SMS_SENDER`를 `defineSecret`으로 바인딩하세요.

### 5. 앱 실행

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
npm run seed                      # 데모 여행자 6명, 여행 7개, 대화 1건
EXPO_PUBLIC_FIREBASE_EMULATOR=1 npx expo start
```

`.env`에는 아무 값이나 채워도 됩니다 — 에뮬레이터는 자격증명을 검사하지 않습니다.
시드가 만들어주는 계정은 `demo@travel.app` / `demo1234` 입니다. 시드 계정은
**인증을 통과한 상태로** 만들어지므로 바로 모든 화면에 들어갑니다.

시드 데이터는 두 풀이 동시에 보이도록 짜여 있습니다.

| 내 여행 | 목적 | 보여야 하는 사람 |
| --- | --- | --- |
| 도쿄 | 둘 다 | 서연 · 지훈 · 유나 |
| 오사카 | 동행만 | **민준뿐** |

오사카에는 같은 날짜에 "둘 다"인 혜원도 있습니다. **혜원이 안 보이는 게**
`companion` 풀 분리가 동작한다는 뜻입니다.

인증 화면을 직접 보려면 새 계정으로 가입하세요. 에뮬레이터에서는 SMS 대신
화면에 인증번호가 그대로 표시됩니다 (`devCode`).

`EXPO_PUBLIC_FIREBASE_EMULATOR=1` 일 때만
[`src/firebase/config.js`](./src/firebase/config.js)가 에뮬레이터에 붙습니다.
실기기에서 붙일 땐 `EXPO_PUBLIC_EMULATOR_HOST`에 개발 PC의 LAN IP를 넣으세요.

웹으로도 뜹니다 (`npx expo start --web`). 날짜 선택기만 플랫폼별로 갈리는데,
`@react-native-community/datetimepicker`에 웹 구현이 없어서
[`DateField.web.js`](./src/components/DateField.web.js)가 브라우저 기본 날짜
입력을 대신 씁니다.

## Tests

```bash
npm test              # 아래 셋 전부 (92개)
npm run test:unit     # 매칭 규칙 · 출시 범위 (22개, 에뮬레이터 불필요)
npm run test:rules    # firestore.rules (46개)
npm run test:functions # 트리거 · callable (24개)
```

`test:unit`은 `src/utils/trips.js`와 `src/data/destinations.js`를 그대로 불러
날짜 겹침·목적 호환·출시 범위 판정을 검증합니다. 나머지 둘은 Firebase
에뮬레이터 위에서 돌아갑니다 (Java 필요, `firebase-tools`는 devDependency로
들어있습니다).

`test:functions`는 callable을 **앱과 똑같이 HTTP로** 호출합니다 — 그래야 인증
컨텍스트, `HttpsError` 코드, 리전 라우팅이 실제로 검증됩니다. 특히 다음 두
가지는 회귀하면 서비스가 끝나는 속성이라 테스트로 고정해 뒀습니다.

- 한 사람이 몇 번 신고해도 계정이 정지되지 않는다
- 한 번호로 두 번째 계정을 인증할 수 없다

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
├── functions/                  # Cloud Functions (매칭 · 차단 · 신고 · 인증 · 푸시)
│   ├── index.js
│   ├── ids.js                  # uid 쌍 → 문서 id
│   ├── moderation.js           # 신고 집계 · 자동 정지 임계치
│   ├── verification.js         # 휴대폰 인증 callable 로직
│   ├── sms.js                  # SMS 공급자 교체 지점
│   ├── identity.js             # 본인인증(PASS/NICE) 교체 지점
│   └── push.js                 # Expo push 발송
├── scripts/
│   └── seed-emulator.mjs       # 에뮬레이터 데모 데이터
├── tests/
│   ├── trips.test.mjs          # 매칭 규칙 단위 테스트
│   ├── destinations.test.mjs   # 출시 범위 · 레거시 도시 해석
│   ├── firestore.test.mjs      # 보안 규칙 테스트
│   └── functions.test.mjs      # 트리거 · callable 테스트
├── src/
│   ├── theme.js
│   ├── data/
│   │   ├── destinations.js     # 여행지 카탈로그 + 출시 범위
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
│   │   ├── verification.js     # 인증 callable 호출
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
│       ├── VerifyPhoneScreen.js
│       ├── ProfileScreen.js
│       ├── SwipeScreen.js
│       ├── TripsScreen.js
│       ├── TripFormScreen.js
│       ├── TripTravelersScreen.js
│       ├── ChatListScreen.js
│       └── ChatRoomScreen.js
```

## Known limitations (다음 단계 후보)

- 새 여행은 **오사카 · 도쿄 · 다낭** 3곳에만 등록할 수 있습니다 (의도된 제약 —
  위 "출시 범위" 참고). 카탈로그 32곳을 열려면
  `EXPO_PUBLIC_DESTINATION_SCOPE=all`.
- 목적지가 정확히 같아야 매칭됩니다. 오사카와 교토처럼 붙어 있는 도시는 서로
  안 잡힙니다. 권역(간사이 등) 개념이 다음 단계입니다.
- `listTripsAtDestination`의 `limit(200)`을 넘는 인기 목적지는 조용히 잘립니다.
  날짜 윈도우로 쪼개야 합니다.
- 여행 스타일·예산·페이스는 카드에 표시만 되고 매칭 조건에는 안 들어갑니다.
  정렬 가중치로 쓰는 게 다음 단계입니다.
- 자동 정지는 `moderationQueue`에 쌓이지만, **운영자 콘솔 UI는 없습니다** —
  검토는 Firebase 콘솔에서 해야 하고 이의 제기 경로도 아직 앱 안에 없습니다.
- **본인인증은 번호 소유 확인까지만 구현돼 있습니다.** 통신사 기반
  이름·생년월일 확인(PASS/NICE)은
  [`functions/identity.js`](./functions/identity.js)에 교체 지점만 있고, 만
  19세 판정은 현재 자기 신고 나이에 기댑니다.
- SMS 공급자가 안 붙어 있습니다. `SMS_ENDPOINT` / `SMS_API_KEY` /
  `SMS_SENDER`를 설정하지 않고 배포하면 인증 발송이 실패합니다 (에뮬레이터는
  코드를 화면에 돌려주므로 영향 없음).
- `PHONE_HASH_PEPPER`를 설정하지 않으면 개발용 기본값을 씁니다. **운영에서는
  반드시 설정해야** 번호 해시가 레인보우 테이블에 뚫리지 않습니다.
- 차단해도 이미 만들어진 매칭 문서와 지난 메시지는 남아 있고, 양쪽 화면에서
  숨겨지기만 합니다.
- 정지는 커스텀 클레임으로 판정하므로, 해당 기기가 토큰을 갱신할 때까지 최대
  1시간 지연될 수 있습니다. 그 구멍은 Cloud Functions와 후보 목록이
  `users/{uid}.suspendedAt`을 직접 보는 것으로 메웁니다.
- 푸시 알림을 눌러도 해당 채팅방으로 바로 이동하지는 않습니다 (딥링크 미구현).
- 지난 여행은 목록에 남지만 자동으로 정리되지는 않습니다.
- **웹에서는 `Alert.alert`이 동작하지 않습니다** (react-native-web에 구현이
  없음). 나이 제한·잘못된 인증번호 같은 거절은 웹에서 *조용히* 막히기만 하고
  메시지가 안 뜹니다. 실기기(Expo Go)에서는 정상입니다. 웹을 정식 지원하려면
  크로스플랫폼 알림 컴포넌트가 필요합니다.
- 스와이프 덱 뒤에 깔린 카드는 앞 카드보다 짧으면 완전히 가려집니다. 제대로
  된 카드 스택 효과를 내려면 카드 높이를 고정해야 합니다.
