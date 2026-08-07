# 수능 영단어장 — 배포 가능한 PWA

Claude.ai 아티팩트 프로토타입을 실제로 설치·배포할 수 있는 형태로 옮긴 프로젝트입니다.
UI/학습 로직(`src/App.jsx`)은 아티팩트 버전과 거의 동일하고, 아래 두 가지만 실제
동작하는 인프라로 교체했습니다.

- **저장소**: 아티팩트 전용 `window.storage` → **IndexedDB (Dexie)** 로컬 저장 + **Firestore** 선택적 백업/동기화
- **AI 호출**: 아티팩트에서 자동 인증되던 `api.anthropic.com` 직접 호출 → **서버리스 프록시**(`/api/claude.js`)를 거치도록 변경 (API 키를 브라우저에 절대 노출하지 않기 위함)

## 로컬에서 실행하기

```bash
npm install
npm run dev
```

이 상태에서도 단어 학습·SRS·게이미피케이션·엑셀 업로드는 바로 작동합니다.
카메라/OCR·발음·AI 학습도구 생성만 아래 설정이 더 필요합니다.

## 1. 카메라 · 발음이 되는지 확인

`npm run dev`로 로컬에서 열어서 폰 브라우저로 접속(같은 와이파이에서 `npm run dev -- --host`로
IP 접속) 후 사진 촬영 버튼과 발음 버튼을 확인해보세요. 아티팩트 미리보기와 달리
실제 브라우저 권한 하에서 동작하므로 정상적으로 카메라/스피커에 접근됩니다.

## 2. AI 기능(사진 OCR, 학습 도구 생성) 켜기 — Vercel 배포 기준

1. [Anthropic Console](https://console.anthropic.com)에서 API 키 발급
2. 이 프로젝트를 GitHub에 올리고 [Vercel](https://vercel.com)에 연결 (Import Project)
3. Vercel 프로젝트 설정 → **Environment Variables** → `ANTHROPIC_API_KEY` 에 발급받은 키 입력
4. 배포하면 `/api/claude` 가 자동으로 서버리스 함수로 동작합니다 (`api/claude.js` 참고)
5. 키는 서버에만 있고 브라우저 코드에는 절대 들어가지 않습니다

> Vercel이 아닌 다른 곳에 배포한다면 `api/claude.js`와 같은 역할을 하는 서버리스 함수를
> 그 플랫폼 방식대로 하나 만들어주면 됩니다 (Netlify Functions, Firebase Functions 등).

## 3. 기기 간 동기화(선택) — Firebase 설정

1. [Firebase 콘솔](https://console.firebase.google.com)에서 새 프로젝트 생성 (무료 Spark 요금제로 충분)
2. **Authentication** → 로그인 방법 → **익명(Anonymous)** 사용 설정
3. **Firestore Database** 생성 (프로덕션 모드로 시작해도 됨)
4. Firestore 규칙에 `firestore.rules` 내용 붙여넣고 게시
5. 프로젝트 설정 → 일반 → "내 앱" → 웹 앱 추가 → 나오는 설정 값을 `src/lib/firebase.js`의
   `firebaseConfig` 자리에 채워넣기
6. 앱의 설정(⚙) → "클라우드 동기화" 에서 코드 생성 → 다른 기기에서 같은 코드 입력하면 데이터 이어짐

이 동기화는 로그인 계정 기반이 아니라 **코드(패스프레이즈) 기반**이라 구현이 간단합니다.
가족 개인용으로는 충분하지만, 코드를 아는 사람은 누구나 그 데이터에 접근할 수 있다는 점은
알고 계세요 (긴 임의 코드를 쓰면 실질적으로 안전합니다).

## 4. 실제 배포

```bash
npm run build
```

로 생성되는 `dist/` 폴더를 Vercel/Netlify/Firebase Hosting 등에 올리면 끝입니다.
Vercel을 쓰면 `api/claude.js`가 자동으로 인식되어 서버리스 함수까지 한 번에 배포됩니다.

배포된 주소를 딸 폰 브라우저(Safari/Chrome)로 열고 "홈 화면에 추가"를 하면
앱처럼 아이콘이 생기고 오프라인에서도 어제까지 학습한 데이터로 계속 쓸 수 있어요.

## 폴더 구조

```
src/
  App.jsx           ← 아티팩트에서 그대로 옮긴 UI/학습 로직 (거의 무수정)
  main.jsx          ← window.storage를 IndexedDB로 폴리필
  lib/
    localStore.js   ← IndexedDB(Dexie) 저장소 구현
    firebase.js     ← Firebase 프로젝트 설정 (직접 채워야 함)
    sync.js         ← 코드 기반 클라우드 백업/동기화
api/
  claude.js         ← Anthropic API 서버리스 프록시 (Vercel 기준)
```

## 알려진 제약

- 아이콘(`public/icon-192.png`, `icon-512.png`)은 임시 플레이스홀더예요. 실제 앱 아이콘으로 교체하세요.
- 번들 사이즈가 커서(약 1.4MB) 빌드 시 경고가 뜹니다. 당장 기능엔 문제없지만, 나중에
  `React.lazy`로 탭별 코드 스플리팅을 하면 초기 로딩이 빨라집니다.
- 동기화는 last-write-wins 방식이라, 두 기기에서 동시에 다른 학습을 하고 있으면
  나중에 저장한 쪽이 앞선 기록을 덮어씁니다. 가족 여러 명이 한 계정을 동시에 쓰지 않는
  용도로 설계했어요.
