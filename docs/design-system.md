# Chaek Design System

Chaek의 인터페이스는 콘텐츠의 위계와 읽는 흐름을 먼저 설계한다. 시선을 끌기 위한 장식보다 제목, 본문, 메타데이터, 행동의 역할을 명확히 구분하는 것이 우선이다.

이 문서는 톤앤매너의 의사결정 기준이다. 실제 색상과 서체 토큰의 실행 가능한 값은 `app/globals.css`, 재사용 컴포넌트의 조합 규칙은 `components/ui`가 기준이다.

## Reference

뉴욕타임스 홈페이지의 편집 UI 언어를 참고하되 브랜드 자산, 로고, 독점 서체, 콘텐츠, 화면 구성을 복제하지 않는다.

참고한 UI 문법:

- 세리프 제목과 산세리프 기능 텍스트의 역할 분리
- 큰 카드나 그림자 대신 가는 선으로 구획하는 방식
- 대표 콘텐츠와 보조 콘텐츠 사이의 비대칭 위계
- 작은 대문자, 짧은 메타데이터, 제한된 강조색
- 넓은 캔버스 안에서 유지되는 촘촘한 정보 밀도

Chaek에서는 이 문법을 책 생성과 편집 경험에 맞는 토큰, 컴포넌트, 레이아웃 규칙으로 번역한다.

## Principles

### 1. Content first

장식은 정보의 순서와 의미를 설명할 때만 사용한다. 장식이 없어도 제목, 설명, 상태, 행동의 순서가 명확해야 한다.

### 2. Rules before cards

콘텐츠 그룹을 구분할 때 떠 있는 카드, 큰 radius, 진한 그림자를 기본 선택으로 삼지 않는다. `border-rule`과 `border-rule-strong`으로 관계를 먼저 표현한다.

### 3. One emphasis at a time

크기, 굵기, 색을 동시에 강조하지 않는다. 한 요소가 이미 크다면 색은 기본색을 유지하고, 긴급 상태에만 `live`를 사용한다.

### 4. Rhythm over empty space

여백을 무조건 크게 만드는 대신 반복 가능한 간격과 선으로 읽는 리듬을 만든다. 정보 밀도가 높아져도 각 그룹의 시작과 끝은 분명해야 한다.

### 5. Motion explains state

애니메이션은 열림, 닫힘, 포커스 같은 상태 변화를 설명할 때만 짧게 사용한다. 장식적인 이동, 반복 애니메이션, 과한 scale 효과는 사용하지 않는다. `prefers-reduced-motion`을 항상 존중한다.

## Typography

| Role | Token | Usage |
| --- | --- | --- |
| Editorial | `font-serif` | 페이지 제목, 콘텐츠 제목, 긴 설명, 인용 |
| Interface | `font-sans` | 내비게이션, 버튼, 입력, 상태, 메타데이터 |
| Technical | `font-mono` | 토큰 이름, 코드, 수치 표기 |

원칙:

- 크기보다 역할을 먼저 선택한다.
- 제목은 짧고 밀도 있게, 본문은 충분한 행간으로 설정한다.
- 대문자와 넓은 자간은 12px 이하의 짧은 레이블에만 제한한다.
- 한글 제목에는 임의의 `word-break`를 적용하지 않고 자연스러운 어절 단위를 유지한다.

## Color

모든 테마 값은 OKLCH로 정의한다. 컴포넌트에서는 `oklch(...)`, hex, Tailwind 기본 팔레트를 직접 사용하지 않고 semantic token을 사용한다.

핵심 역할:

- `background` / `foreground`: 기본 캔버스와 텍스트
- `muted` / `muted-foreground`: 보조 표면과 메타데이터
- `primary`: 한 화면의 주요 행동
- `accent`: 선택, hover, 강조 배경
- `rule` / `rule-strong`: 일반 구분선과 큰 구획
- `live`: 긴급하거나 즉시성이 높은 상태
- `destructive`: 삭제와 되돌리기 어려운 행동

`primary`, `live`, `destructive`는 의미가 다르므로 서로 대체하지 않는다.

## Shape and elevation

- 기본 radius는 `0.25rem`이다.
- 버튼과 입력은 `2px` radius를 기본으로 한다.
- Switch처럼 형태 자체가 상태를 설명하는 컴포넌트만 pill 형태를 사용한다.
- Popover와 menu는 경계선과 낮은 그림자를 함께 사용한다.
- 일반 콘텐츠 영역에는 그림자를 사용하지 않는다.

## Component architecture

- shadcn CLI로 생성한 코드를 프로젝트가 직접 소유한다.
- 상호작용과 접근성은 `@base-ui/react` primitive를 사용한다.
- 시각 규칙은 Tailwind utility와 `class-variance-authority` variant로 정의한다.
- Base UI의 `data-checked`, `data-open`, `data-highlighted` 같은 상태 attribute를 스타일 훅으로 사용한다.
- `components/ui`는 primitive에 가까운 재사용 컴포넌트만 둔다.
- 페이지 조합과 한 화면에만 필요한 grid는 사용하는 위치 가까이에 둔다.

현재 기준 컴포넌트:

- `Button`
- `Input`
- `Badge`
- `Separator`
- `Switch`
- `DropdownMenu`

## Tailwind CSS v4 rules

1. `@import "tailwindcss"`를 사용하는 CSS-first 설정을 유지한다.
2. 일반 CSS 변수는 `:root`와 `.dark`에 정의하고, utility로 노출할 값만 최상위 `@theme inline`에 연결한다.
3. class 이름은 정적으로 완전한 문자열로 작성한다. `bg-${color}`처럼 런타임에 조합하지 않는다.
4. 반복되는 임의 색상과 수치는 semantic token으로 승격한다.
5. 한 번만 쓰이는 레이아웃 비율은 arbitrary value를 허용하되, 공유되는 값으로 성장하면 토큰이나 컴포넌트 variant로 옮긴다.
6. `dark:` utility를 반복하기보다 semantic token 값을 `.dark`에서 전환한다.
7. 기본 요소 스타일과 접근성 reset만 `@layer base`에 두고, 제품 UI는 utility로 조합한다.

## Theme

라이트, 다크, 시스템 테마를 지원한다. `next-themes`가 루트의 `.dark` class를 관리하고 Tailwind의 custom dark variant와 연결된다.

테마가 바뀌어도 다음 의미는 유지되어야 한다.

- `foreground`는 가장 높은 텍스트 대비를 가진다.
- `muted-foreground`는 보조 정보지만 읽을 수 있어야 한다.
- `rule-strong`은 큰 섹션 경계를 만든다.
- `primary`, `live`, `destructive`의 의미가 색상 변화로 뒤바뀌지 않는다.

## Accessibility

- 모든 페이지에는 유일하고 설명적인 제목과 `h1`이 있어야 한다.
- 키보드 포커스는 제거하지 않고 `ring` 토큰으로 표현한다.
- 아이콘만 있는 버튼에는 접근 가능한 이름을 제공한다.
- 입력에는 placeholder와 별개로 항상 label을 연결한다.
- 상태는 색상만으로 전달하지 않고 텍스트나 아이콘을 함께 사용한다.
- 상호작용이 필요한 부분만 Client Component로 만들고 정적 콘텐츠는 Server Component로 유지한다.

## Avoid

- 큰 radius 카드의 반복
- gradient, glassmorphism, glow
- 장식용 blur와 과한 그림자
- 모든 영역의 넓은 여백
- 한 화면에 여러 CTA 색상
- 브랜드 참고 화면의 로고, 독점 서체, 콘텐츠 복제

## Official references

- Tailwind CSS theme variables: <https://tailwindcss.com/docs/theme>
- Tailwind CSS dark mode: <https://tailwindcss.com/docs/dark-mode>
- shadcn Tailwind v4: <https://ui.shadcn.com/docs/tailwind-v4>
- shadcn components.json: <https://ui.shadcn.com/docs/components-json>
- shadcn theming: <https://ui.shadcn.com/docs/theming>
- Base UI styling: <https://base-ui.com/react/handbook/styling>
- Base UI quick start: <https://base-ui.com/react/overview/quick-start>
