# 키 체인저 (Key Changer)

코드보와 악보를 원하는 키로 바꾸고 PDF로 저장하는 앱입니다.

| 폴더 | 내용 |
|---|---|
| `web/` | 홈페이지(`index.html`)와 앱(`app/`). 설치형 웹앱(PWA)이라 홈 화면에 추가하면 앱처럼 실행되고 오프라인에서도 동작 |
| `worker/` | 사진 코드보 읽기 서버 (Cloudflare Worker → Claude API) |
| `mobile/` | 앱스토어·플레이스토어용 앱 프로젝트 (Capacitor) |

## 1. 홈페이지 올리기 (GitHub Pages, 무료)

1. 이 폴더를 GitHub 저장소에 올립니다 (`main` 브랜치).
2. 저장소 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 바꿉니다.
3. `web/` 이 바뀔 때마다 자동으로 배포됩니다. 주소: `https://<GitHub 아이디>.github.io/<저장소 이름>/`

내 컴퓨터에서 미리 보기: `cd web && python3 -m http.server 8000` → http://localhost:8000

## 2. 사진 코드보 읽기 켜기 (선택)

사진·스캔 PDF 코드보를 Claude API로 읽습니다. API 키를 브라우저에 두면 누구나 훔쳐 쓸 수 있어서, 작은 서버(Cloudflare Worker, 무료 요금제로 충분)를 거칩니다.

1. https://console.anthropic.com 에서 API 키를 만들고, **Billing → Limits 에서 월 사용 한도**를 꼭 정해 두세요.
2. `worker/wrangler.toml` 의 `ALLOWED_ORIGINS` 에서 `YOUR_GITHUB_ID` 를 내 아이디로 바꿉니다.
3. 터미널에서:
   ```bash
   cd worker
   npm install
   npx wrangler login                       # Cloudflare 계정 로그인 (무료 가입)
   npx wrangler secret put ANTHROPIC_API_KEY  # API 키 붙여넣기
   npx wrangler deploy
   ```
4. 배포 후 나오는 주소(`https://keychanger-ocr.<이름>.workers.dev`)를 `web/app/config.js` 의 `ocrEndpoint` 에 넣고 다시 올립니다.

비용: 사진 1장 읽는 데 대략 몇 원~수십 원 정도가 운영자(API 키 주인)에게 청구됩니다. 더 아끼려면 `wrangler.toml` 의 `MODEL` 을 `claude-haiku-5-5` 로 바꾸세요. IP 하나당 1분에 10번으로 제한되어 있습니다.

## 3. 앱스토어 · 플레이스토어 앱 (Capacitor)

`web/` 의 앱 화면을 그대로 iOS·안드로이드 앱으로 감쌉니다. PDF 저장은 앱에서 공유 시트(파일에 저장, 카카오톡 전송 등)로 열립니다.

준비물: Node.js 20 이상 · 안드로이드는 **Android Studio** · iOS는 **Mac + Xcode**

```bash
cd mobile
npm install
npm run assets          # 아이콘·스플래시 생성 (mobile/assets 의 이미지 사용)

npm run add:android     # 처음 한 번
npm run android         # Android Studio가 열리면 ▶ 실행, 배포는 Build → Generate Signed Bundle

npm run add:ios         # 처음 한 번 (Mac에서)
npm run ios             # Xcode가 열리면 ▶ 실행, 배포는 Product → Archive
```

`web/` 을 고친 뒤에는 `npm run sync` 로 앱에 반영합니다.

스토어 등록에 필요한 것:
- **Google Play**: 개발자 계정(1회 $25), 앱 설명·스크린샷, 개인정보처리방침 URL
- **App Store**: Apple Developer Program(연 $99), 앱 설명·스크린샷, 개인정보처리방침 URL
- 앱 ID `com.keychanger.app` 은 `mobile/capacitor.config.json` 에서 내 도메인에 맞게 바꾸세요 (예: `jp.jubilee.keychanger`). 스토어에 한 번 올리면 바꿀 수 없습니다.
- 애플은 "웹사이트를 감싸기만 한 앱"을 거절하기도 합니다. 이 앱은 오프라인 동작·파일 공유 같은 앱 기능이 있어 통과 가능성이 있지만, 거절되면 앱 전용 기능(최근 파일 목록 등)을 더 넣어야 할 수 있습니다.

## 지원 형식

- 코드보: 텍스트 붙여넣기, `.txt`, ChordPro(`.pro` `.cho` `.chopro`), 텍스트 PDF, 사진(JPG/PNG, 사진 읽기 설정 시), 스캔 PDF(사진 읽기 설정 시)
- 오선 악보: MusicXML(`.musicxml` `.xml` `.mxl`). PDF·사진 악보는 MuseScore 등에서 MusicXML로 바꿔서 넣어야 합니다.

## 사용한 오픈소스

jsPDF, html2canvas, JSZip, PDF.js, OpenSheetMusicDisplay, Capacitor — 각 라이선스(MIT/Apache-2.0/BSD)를 따릅니다.

## 피아노 연습 (web/piano)

MR·녹음 파일을 올리면 Spotify Basic Pitch(Apache-2.0, 브라우저 안에서 실행)로 음을 찾아
「떨어지는 건반」과 「피아노 타일」 연습 화면으로 바꿉니다.

- 입력: mp3·m4a·wav, MIDI 파일(가장 정확), 연습 파일(.json)
- 연주: 화면 터치 · PC 키보드(A~; 흰 건반, W E T Y U O P 검은 건반, 타일은 D F J K) · 전자피아노(USB, Chrome·Edge)
- 「기다려 주기」: 맞는 건반을 누를 때까지 멈춰서 기다림 / 속도 50·75·100%
- 「연습 파일 저장」: 음표 + MR을 한 파일로 → 아이들은 변환 없이 바로 열기
- 「MIDI로 저장」: MuseScore 등에서 악보로 열 수 있음

번들 다시 만들기: `@spotify/basic-pitch`, `@tonejs/midi` 를 esbuild로 묶어 `web/piano/vendor/bp.bundle.js`
