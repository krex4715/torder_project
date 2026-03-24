# INT Survey Player v1 AWS Upload Guide

이 디렉토리(`v1/`)는 AWS 업로드용 산출물만 포함합니다.

## 1) 업로드 대상 파일

- `index.html`
- `app.js`
- `style.css`
- `vast.xml`

## 2) S3 업로드 경로

S3 버킷 내부 경로를 아래처럼 맞추는 것을 권장합니다.

- `int-survey/v1/index.html`
- `int-survey/v1/app.js`
- `int-survey/v1/style.css`
- `int-survey/v1/vast.xml`

## 3) S3 콘솔 업로드 시 체크

Content-Type 확인:

- `.html` -> `text/html`
- `.js` -> `application/javascript`
- `.css` -> `text/css`
- `.xml` -> `application/xml`

## 4) CloudFront 설정 핵심

1. Origin: S3 버킷
2. Origin access: OAC 사용
3. Viewer protocol policy: Redirect HTTP to HTTPS
4. (권장) Cache policy: Managed-CachingOptimized

## 5) VAST URL/HTMLResource 교체

`vast.xml`에서 아래 두 URL을 실제 값으로 교체하세요.

- `https://YOUR_CLOUDFRONT_DOMAIN/int-survey/v1/index.html`
- `https://YOUR_TRACKING_DOMAIN/impression`

최종 예시:

`https://d1234abcd.cloudfront.net/int-survey/v1/vast.xml`

## 6) 티오더 연동 시 프로토콜

송출 모듈 -> 인트 iframe

- `INT_PLAY`
- `INT_CLOSE`

인트 iframe -> 송출 모듈

- `INT_IMPRESSION`
- `INT_ENDED`
- `INT_ERROR` (`NO_ADS | EMPTY_AD | TIMEOUT | INTERNAL`)
- `INT_CLOSE` (`TOUCH | CLOSE | FORCE_CLOSE`)

## 7) 배포 후 캐시 반영

파일 수정 후 CloudFront 무효화:

- `/int-survey/v1/*`

캐시가 남아있으면 구버전이 노출될 수 있습니다.

## 8) 금지/주의사항

- `window.top` 접근 금지
- `localStorage` 의존 금지
- 외부 CDN 스크립트 금지
- iframe sandbox 환경에서 postMessage 기반 통신만 사용
