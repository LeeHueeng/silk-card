# Silk Card

**한국어** | [English](docs/README_en.md) | [中文](docs/README_zh.md) | [日本語](docs/README_ja.md)

**Home Assistant를 위한 버터처럼 부드러운 카드 스위트.**
주식 앱처럼 문지르는 그래프부터, 카드 전체를 드래그해 밝기를 조절하는 조명, 방 하나를 한 줄로 요약하는 룸 카드까지 — 11종의 카드가 하나의 디자인 언어를 씁니다. 설정 없이도 그냥 예쁩니다.

![Silk Card preview](docs/preview.png)

> 스크린샷은 절반도 못 보여줍니다 — 스크럽과 모핑은 움직임이 생명이니까요. `npm run demo`로 직접 만져보세요.

[![HACS](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/v/release/LeeHueeng/silk-card)](https://github.com/LeeHueeng/silk-card/releases)
[![License](https://img.shields.io/github/license/LeeHueeng/silk-card)](LICENSE)

## 왜 Silk인가?

기존 그래프 카드는 둘 중 하나를 고르게 합니다. 미니멀하지만 시간이 멈췄거나, 강력하지만 YAML 던전이거나. Silk는 세 번째 문을 엽니다:

- **시간 스크럽** — 그래프 아무 곳이나 누르고 드래그하면 그 시점의 정확한 값과 시각이 표시됩니다. 금융·헬스 앱의 그 방식 그대로, 터치와 마우스 모두 지원.
- **모핑 범위 전환** — `1H / 12H / 1D / 1W / 1M` 칩을 누르면 곡선이 새 시간 창으로 유려하게 변형됩니다. 다시 그리는 게 아니라요.
- **기본값으로 아름다움** — 과장 없는 monotone 곡선(가짜 오버슈트 없음), 은은한 그라데이션, 살아 숨쉬는 현재값 펄스 점, 최소/최대 마커, 변화량 배지. 전부 테마를 자동으로 따라갑니다.
- **긴 범위도 그냥 동작** — 짧은 창은 원시 히스토리를, 긴 창은 Home Assistant 장기 통계를 자동으로 사용합니다. recorder가 오래된 데이터를 지워도 1개월 그래프가 나옵니다.
- **초경량** — 차트 라이브러리 없이 SVG를 직접 렌더링. 작은 JS 파일 하나가 전부입니다.

## 카드 31종

타입은 전부 `custom:silk-<이름>-card` 패턴입니다 (그래프만 `custom:silk-card`).

| 분류 | 카드 |
| --- | --- |
| 컨트롤 | Toggle · Light · Cover · Fan · Climate · Media · Lock · Vacuum |
| 물리 컨트롤 | **Rocker**(벽 스위치) · **Push**(푸시버튼) · **Knob**(돌리는 다이얼) · **Fader**(세로 슬라이더) |
| 데이터 | Graph · Tile · Gauge · Bar · Ring · Status(가동률 타임라인) · Progress · Energy |
| 정보 | Weather · Person · Camera · Room · Chips · Battery · Updates |
| 액션·기타 | Button · Alarm(키패드 포함) · Timer · To-do |

전체 갤러리(90+ 변형): [docs/gallery.png](docs/gallery.png) · 로컬에서 만져보기: `npm run demo`

## 설치

### HACS (권장)

1. HACS → 우상단 점 3개 메뉴 → **Custom repositories**
2. `https://github.com/LeeHueeng/silk-card` 를 **Dashboard** 카테고리로 추가
3. **Silk Card** 검색 후 설치, 새로고침

### 수동 설치

[최신 릴리즈](https://github.com/LeeHueeng/silk-card/releases)에서 `silk-card.js`를 받아 `config/www/`에 복사한 뒤, 대시보드 리소스로 추가합니다:

```yaml
url: /local/silk-card.js
type: module
```

## 빠른 시작

```yaml
type: custom:silk-card
entity: sensor.living_room_temperature
```

이게 전부입니다. 비주얼 에디터를 완전 지원하므로 YAML을 한 줄도 안 써도 됩니다.

## 옵션

| 옵션 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `entity` | string | — | 그래프로 그릴 엔티티 (또는 `entities` 사용) |
| `entities` | list | — | 여러 엔티티. 문자열 또는 객체 (아래 참고) |
| `name` | string | friendly name | 카드 제목 |
| `icon` | string | — | 제목 옆 아이콘 (선택) |
| `hours_to_show` | number | `24` | 초기 시간 창 |
| `ranges` | list | `[1h, 12h, 1d, 1w, 1m]` | 범위 칩 (`Nh`, `Nd`, `Nw`, `Nm`) |
| `range_selector` | boolean | `true` | 범위 칩 표시 |
| `fill` | boolean | `true` | 선 아래 그라데이션 |
| `extremes` | boolean | `true` | 최소/최대 마커 |
| `delta` | boolean | `true` | 변화량 배지 |
| `color` | string | 테마 primary | 선 색 (CSS 색상 아무거나) |
| `line_width` | number | `2.5` | 선 굵기 |
| `points` | number | `120` | 리샘플링 해상도 |
| `unit` | string | 엔티티 단위 | 단위 재정의 |
| `y_min` / `y_max` | number | 자동 | y축 고정 범위 |

### 여러 엔티티

```yaml
type: custom:silk-card
name: Climate
entities:
  - entity: sensor.living_room_temperature
    name: 거실
  - entity: sensor.bedroom_temperature
    name: 침실
    color: '#f0b357'
hours_to_show: 48
```

범례 칩을 누르면 해당 시리즈만 강조되고, 다시 누르면 돌아옵니다.

### 더 많은 예시

장식 없이 미니멀하게:

```yaml
type: custom:silk-card
entity: sensor.energy_power
range_selector: false
extremes: false
delta: false
```

습도용 고정 스케일:

```yaml
type: custom:silk-card
entity: sensor.bathroom_humidity
y_min: 0
y_max: 100
```

## 로드맵

- [ ] 속성(attribute) 그래프 (시리즈별 `attribute:`)
- [ ] 에너지/사용량 센서용 막대 모드
- [ ] 핀치 줌으로 범위 조절
- [ ] 긴 범위에서 `sum`/`min`/`max` 통계 선택

이슈와 PR 환영합니다.

## 개발

```bash
npm install
npm run watch     # 변경 시 자동 재빌드 (소스맵 포함)
npm run demo      # 빌드 + 데모 페이지 http://localhost:5050/demo/
npm run typecheck
```

`demo/` 페이지는 목(mock) `hass` 객체와 생성 데이터로 카드를 구동합니다 — UI 작업에 Home Assistant가 필요 없습니다.

## 라이선스

[MIT](LICENSE)
