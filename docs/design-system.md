# Chaek Design System

Chaek의 인터페이스는 사용자가 현재 위치와 다음 행동을 빠르게 이해하도록 설계한다. 장식보다 작업 흐름, 상태 변화, 입력과 결과 사이의 연결을 먼저 명확하게 만든다.

이 문서는 톤앤매너의 의사결정 기준이다. 실제 색상, 형태, 그림자 토큰의 실행 가능한 값은 `app/globals.css`, 재사용 컴포넌트의 조합 규칙은 `components/ui`가 기준이다.

## Design language

Chaek은 글을 소비하는 화면이 아니라 생각이 글이 되고, 글이 한 권의 흐름으로 이어지는 동안 머무는 작업 공간이다. 그래서 인터페이스의 첫인상은 화려함보다 평온함에 가깝고, 기능의 수보다 다음 행동의 명확함이 먼저 느껴져야 한다. 조용하다는 것은 정보가 적거나 흐릿하다는 뜻이 아니다. 사용자가 읽고 쓰는 대상은 선명하게, 그 대상을 돕는 도구는 필요한 순간에만 분명하게 드러나는 상태를 뜻한다.

화면의 중심은 언제나 canvas에 놓인 콘텐츠다. Navigation, toolbar, panel 같은 chrome은 제품의 존재감을 보여주기 위한 프레임이 아니라 사용자의 위치, 현재 상태, 다음 행동을 설명하는 기반 시설이다. 기능을 발견할 수 있을 만큼 분명하되 콘텐츠와 경쟁할 만큼 크거나 화려하지 않아야 한다. 화면을 처음 보았을 때 사용자가 제품의 스타일보다 자신이 쓰고 있던 문장과 해야 할 일을 먼저 발견하는 것이 이상적이다.

여백은 비어 있는 장식이 아니라 읽는 속도를 만드는 시간이다. 촘촘한 정보 사이에서는 생각을 구분하고, 긴 글 주변에서는 시선을 머물게 하며, 행동 앞에서는 선택을 준비하게 한다. 따라서 공간을 무조건 크게 만드는 대신 의미가 바뀌는 지점에 충분한 호흡을 둔다. 영역을 나눌 때는 카드와 그림자부터 추가하지 않고 간격, 정렬, 낮은 tonal difference, 얇은 border의 순서로 해결한다. 독립적으로 움직이거나 조작되는 surface만 주변 canvas에서 한 단계 떠오른다.

Chaek의 색은 풍경을 묘사하기보다 온도와 깊이를 만든다. Mist Paper는 빛이 과하지 않은 바탕이고, Forest Black은 글을 붙잡는 깊은 전경이다. Deep Forest는 제품 전체에 칠하는 브랜드 장식이 아니라 반복해서 들리는 하나의 지속음(sustained tone)이다. Primary action, focus, active state처럼 사용자의 결정이 일어나는 곳에서만 충분한 강도로 나타나야 한다. Mineral Blue와 Rust Red 같은 상태색은 브랜드색과 역할을 나누며, 색이 사라져도 텍스트와 형태만으로 의미가 남아야 한다. Dark theme은 Light theme의 기계적인 반전이 아니라 forest-black 안에서 surface의 깊이가 더 세밀하게 드러나는 별도의 환경이다.

형태에는 자연의 불규칙함을 그대로 그리는 대신 자연에서 느껴지는 깊이와 디지털 도구의 정밀함을 함께 담는다. 낮은 채도 안의 미세한 차이, 정돈된 grid, compact control, 일관된 radius, 정확한 hit area가 이 긴장을 만든다. 부드러움은 둥근 모서리를 무한히 키우거나 모든 것을 흐리게 만드는 방식으로 표현하지 않는다. Gradient, glow, glassmorphism, 장식적인 blur처럼 표면 자체가 주인공이 되는 효과는 피하고, 얇은 경계와 낮은 shadow만으로 조작 가능한 층을 설명한다.

타이포그래피는 글을 꾸미기보다 역할을 구분한다. 산세리프의 직접성과 균일한 리듬을 기본으로 사용하고, display, interface, metadata의 차이는 서체를 계속 바꾸는 대신 크기, 굵기, 행간, 대비로 만든다. 큰 제목도 광고 문구처럼 소리치지 않으며, 짧고 정확한 문장으로 화면의 방향을 연다. 본문은 오래 머물 수 있는 행간을 갖고, label과 button은 행동을 망설이지 않게 하는 언어를 사용한다. 전문 용어나 추상적인 감탄사보다 사용자가 지금 하게 될 일을 말한다.

상호작용은 인터페이스가 살아 있음을 과시하는 움직임이 아니라 원인과 결과를 잇는 피드백이다. Hover에서는 위치를 이동시키지 않고 color와 surface의 변화만으로 반응한다. Press의 미세한 scale, menu가 열리고 닫힐 때의 짧은 opacity, switch가 상태를 바꿀 때의 명확한 위치 변화처럼 사용자가 만든 사건에만 motion을 연결한다. 모든 움직임은 짧고 예측 가능해야 하며, motion이 없어도 상태 변화가 이해되어야 한다. Keyboard focus는 시각적으로 제거하지 않고 pointer와 같은 수준의 의미를 갖게 한다.

브랜드 이미지는 책, 숲, 음악을 문자 그대로 그리지 않는다. 열린 페이지와 숲 사이의 틈을 동시에 암시하는 하나의 단순한 형태처럼, 두 가지 의미 사이에 조용히 머물도록 한다. Illustration과 icon도 설명을 과도하게 반복하거나 분위기를 장식하기보다 콘텐츠가 아직 말하지 않은 관계를 보충해야 한다. 작은 크기에서도 실루엣이 먼저 읽혀야 하며, 색과 디테일을 제거해도 핵심 형태가 남아야 한다.

Framer는 Chaek에 제품 UI의 직접성, compact primitive, 부드러운 surface, 즉각적인 state feedback을 생각하게 하는 참고점이다. Ryuichi Sakamoto의 작업은 정적(silence), 절제(restraint), 자연의 흔적과 기술적 정밀함이 공존할 수 있다는 태도를 생각하게 하는 참고점이다. 이 레퍼런스들은 복제할 시각적 결과가 아니다. Chaek은 그 사이에서 쓰는 사람의 집중을 지키고, 복잡한 작업을 명료하게 만들며, 오래 보아도 피로하지 않은 자기 언어를 만들어야 한다.

새로운 화면은 장식이 없는 상태에서 시작한다. 먼저 콘텐츠만으로 읽는 순서가 성립하는지 보고, 현재 상태와 하나의 primary action을 정한 뒤, 필요한 surface와 feedback을 더한다. 결정이 어려울 때는 “하나를 덜어내도 의미가 유지되는가”, “강조색 없이도 위계가 보이는가”, “이 움직임이 상태 변화를 설명하는가”, “인터페이스가 콘텐츠보다 먼저 말하고 있지는 않은가”를 묻는다. 네 질문을 통과한 디자인은 구체적인 화면이 달라져도 같은 Chaek의 언어 안에 남는다.

## Reference

Framer의 공개 웹사이트와 제품 UI를 참고하되 브랜드 자산, 로고, 독점 서체, 콘텐츠, 화면 구성을 복제하지 않는다.

Ryuichi Sakamoto의 작업에서는 정적, 절제, 자연의 흔적과 기술적 정밀함이 공존하는 태도만 참고한다. 앨범 아트워크, 공연 영상, 타이포그래피, 개인의 시각적 정체성은 복제하지 않는다.

참고한 UI 문법:

- 큰 산세리프 제목과 짧고 직접적인 기능 텍스트
- 안개 낀 paper와 forest-black을 축으로 한 낮은 채도의 깊이, 핵심 행동을 위한 제한된 Deep Forest
- 8px 안팎의 compact control과 더 부드러운 panel radius
- 얇은 border, 낮은 shadow, tonal surface로 표현하는 중첩 구조
- 작은 toolbar, 명확한 active state, 짧은 scale과 opacity transition

Chaek에서는 이 문법과 태도를 책을 만들고 편집하는 작업 흐름에 맞는 semantic token, primitive, layout 규칙으로 번역한다.

## Principles

### 1. Canvas before chrome

도구보다 사용자가 만들고 읽는 콘텐츠가 먼저 보여야 한다. navigation, toolbar, panel은 작업 공간을 설명하고 보조하는 크기와 대비를 사용한다.

### 2. Silence has structure

여백은 비어 있는 장식이 아니라 콘텐츠의 속도와 집중을 조절하는 구조다. surface 사이의 간격과 낮은 채도 차이로 호흡을 만들고, 불필요한 divider와 장식을 추가하지 않는다.

### 3. Nature, precisely framed

자연에서 가져온 색과 유기적인 깊이를 사용하되 control은 정확한 정렬, 얇은 border, 일관된 radius로 구성한다. 자연스러움은 흐릿함이 아니라 낮은 채도 안의 미세한 차이로 표현한다.

### 4. One sustained tone

Deep Forest는 장식용 면적을 넓히지 않고 primary action, focus, active state에 반복해 브랜드의 지속음을 만든다. 한 화면의 primary action은 하나만 두고 secondary와 ghost action은 surface 대비로 구분한다.

### 5. Motion confirms state

애니메이션은 hover, press, open, close, checked처럼 사용자가 만든 상태 변화를 확인해 줄 때만 사용한다. 120–180ms의 opacity, color, 1–2px 이동, 미세한 scale을 기본으로 하며 `prefers-reduced-motion`을 존중한다.

## Typography

| Role | Token | Usage |
| --- | --- | --- |
| Display | `font-sans` | 페이지 제목, 제품 메시지, 큰 수치 |
| Interface | `font-sans` | navigation, button, input, status, body |
| Technical | `font-mono` | token 이름, 코드, 식별자, 수치 metadata |

원칙:

- 제품 전체는 산세리프를 기본으로 하고, 크기와 굵기로 역할을 구분한다.
- Display는 촘촘한 자간과 1.0–1.1의 행간을 사용하되 한글 가독성을 해치지 않는다.
- 본문은 14–16px, 1.5–1.7의 행간을 기본으로 한다.
- 대문자와 넓은 자간은 12px 이하의 짧은 technical label에만 제한한다.
- `font-serif`는 기존 화면의 호환을 위해 `font-sans`와 같은 값에 연결한다. 새 UI에서는 사용하지 않는다.

## Color

모든 테마 값은 OKLCH로 정의한다. 컴포넌트에서는 `oklch(...)`, hex, Tailwind 기본 팔레트를 직접 사용하지 않고 semantic token을 사용한다.

색상 체계는 `Mist · Deep Forest · Mineral`을 기준으로 한다.

- `mist paper`: light theme의 조용한 canvas와 밝은 panel surface
- `forest-black`: light theme의 charcoal text이자 dark theme의 깊은 canvas
- `Deep Forest`: brand color이자 primary action, focus ring, active selection
- `mineral blue`: 저장됨, 공개됨, 연결됨 같은 긍정 상태
- `rust red`: 오류와 되돌리기 어려운 destructive action

핵심 역할:

- `background` / `foreground`: light에서는 mist paper와 forest charcoal, dark에서는 forest-black과 pale paper
- `card` / `card-foreground`: 독립적으로 조작되는 panel과 control surface
- `muted` / `muted-foreground`: 보조 surface와 설명, 비활성 metadata
- `primary`: Deep Forest를 사용하는 publish, continue 같은 핵심 행동
- `accent`: selection, hover, highlighted menu item
- `border` / `input`: 일반 surface와 form control의 경계
- `live`: 저장됨, 공개됨, 연결됨 같은 긍정 상태
- `destructive`: 삭제와 되돌리기 어려운 행동

`primary`, `live`, `destructive`는 의미가 다르므로 서로 대체하지 않는다. `rule`과 `rule-strong`은 기존 화면 호환용 경계 token이며, 새 UI에서는 `border`를 우선 사용한다.

## Shape and elevation

- 기본 radius token은 `0.625rem`이다.
- button과 input은 `rounded-md`, panel과 popover는 `rounded-xl` 이상을 기본으로 한다.
- badge와 switch처럼 형태 자체가 상태나 단위를 설명하는 컴포넌트만 pill 형태를 사용한다.
- `shadow-control`은 눌러야 하는 control의 경계를 보조한다.
- `shadow-panel`은 큰 독립 surface, `shadow-popover`는 떠 있는 menu에만 사용한다.
- border와 tonal surface만으로 구분이 충분하면 shadow를 추가하지 않는다.

## Component architecture

- shadcn CLI로 생성한 코드를 프로젝트가 직접 소유한다.
- 상호작용과 접근성은 `@base-ui/react` primitive를 사용한다.
- 시각 규칙은 Tailwind utility와 `class-variance-authority` variant로 정의한다.
- Base UI의 `data-checked`, `data-popup-open`, `data-highlighted`, `data-starting-style` 같은 상태 attribute를 스타일 훅으로 사용한다.
- `components/ui`는 primitive에 가까운 재사용 컴포넌트만 둔다.
- 페이지 조합과 한 화면에만 필요한 grid는 사용하는 위치 가까이에 둔다.

현재 기준 컴포넌트:

- `Button`
- `Input`
- `Badge`
- `Separator`
- `Switch`
- `DropdownMenu`

## Primitive rules

### Button

- default는 primary action, outline은 경계가 필요한 secondary action, ghost는 주변 surface 안의 낮은 우선순위 action이다.
- hover에서는 색상과 surface만 바꾸고 위치는 이동하지 않는다. press에서는 미세한 scale로 입력을 확인한다.
- 아이콘만 있는 button은 최소 32px hit area와 접근 가능한 이름을 가진다.

### Input

- `card` surface, `input` border, 낮은 `shadow-control`을 사용한다.
- focus는 `ring` token으로 표현하고 border와 ring을 함께 바꾼다.
- placeholder를 label 대신 사용하지 않는다.

### Badge

- 짧은 상태나 분류에만 사용하며 문장을 넣지 않는다.
- 긍정 상태는 `success`, 오류나 위험은 `destructive`를 사용한다.

### Menu

- 항목의 현재 탐색 상태는 Base UI의 `data-highlighted`로 표현한다.
- popup은 scale과 opacity만 짧게 전환하고 주변 layout을 움직이지 않는다.
- group label은 반드시 `DropdownMenuGroup` 또는 적절한 group context 안에 둔다.

## Tailwind CSS v4 rules

1. `@import "tailwindcss"`를 사용하는 CSS-first 설정을 유지한다.
2. 일반 CSS 변수는 `:root`와 `.dark`에 정의하고, utility로 노출할 값만 최상위 `@theme inline`에 연결한다.
3. class 이름은 정적으로 완전한 문자열로 작성한다. `bg-${color}`처럼 런타임에 조합하지 않는다.
4. 반복되는 임의 색상, radius, shadow는 semantic token으로 승격한다.
5. 한 번만 쓰이는 레이아웃 비율은 arbitrary value를 허용하되, 공유되는 값으로 성장하면 token이나 component variant로 옮긴다.
6. `dark:` utility를 반복하기보다 semantic token 값을 `.dark`에서 전환한다.
7. 기본 요소 스타일과 접근성 reset만 `@layer base`에 두고, 제품 UI는 utility로 조합한다.

## Theme

라이트, 다크, 시스템 테마를 지원한다. `next-themes`가 루트의 `.dark` class를 관리하고 Tailwind의 custom dark variant와 연결된다.

Light와 dark는 단순 반전 관계로 만들지 않는다. Light는 mist paper의 고요함을, dark는 forest-black의 집중감을 강화하고 Deep Forest와 semantic state가 두 테마의 연결축이 된다.

테마가 바뀌어도 다음 의미는 유지되어야 한다.

- `foreground`는 가장 높은 텍스트 대비를 가진다.
- `muted-foreground`는 보조 정보지만 읽을 수 있어야 한다.
- `card`는 `background` 위에서 독립 surface로 인식되어야 한다.
- `primary`, `live`, `destructive`의 의미가 색상 변화로 뒤바뀌지 않는다.
- dark theme에서도 border와 shadow만으로 surface를 구분할 수 있어야 한다.

## Accessibility

- 모든 페이지에는 유일하고 설명적인 제목과 `h1`이 있어야 한다.
- 키보드 포커스는 제거하지 않고 `ring` token으로 표현한다.
- 아이콘만 있는 button에는 접근 가능한 이름을 제공한다.
- 입력에는 placeholder와 별개로 항상 label을 연결한다.
- 상태는 색상만으로 전달하지 않고 텍스트나 아이콘을 함께 사용한다.
- pointer hover와 keyboard highlighted 상태가 같은 의미를 전달해야 한다.
- 상호작용이 필요한 부분만 Client Component로 만들고 정적 콘텐츠는 Server Component로 유지한다.

## Avoid

- Framer의 로고, wordmark, 제품 canvas, hero 구성을 그대로 재현하는 것
- Ryuichi Sakamoto의 앨범 아트워크, 공연 영상, 타이포그래피를 재현하는 것
- 모든 section을 같은 크기의 카드로 반복하는 것
- gradient, glassmorphism, glow
- 장식용 blur와 과한 shadow
- 기능 의미 없이 Deep Forest나 mineral blue를 넓은 면에 사용하는 것
- 긴 문장을 button이나 badge 안에 넣는 것
- 상태 변화와 무관한 반복 animation

## Official references

- Reference product: <https://www.framer.com/>
- Ryuichi Sakamoto official archive: <https://www.sitesakamoto.com/>
- commmons environmental statement: <https://commmons.com/archive/about/index_eng.html>
- commmons `async` archive: <https://www.commmons.com/archive/whatsnew/artists/sakamotoryuichi/202310060910.html>
- Tailwind CSS theme variables: <https://tailwindcss.com/docs/theme>
- Tailwind CSS dark mode: <https://tailwindcss.com/docs/dark-mode>
- shadcn Tailwind v4: <https://ui.shadcn.com/docs/tailwind-v4>
- shadcn components.json: <https://ui.shadcn.com/docs/components-json>
- shadcn theming: <https://ui.shadcn.com/docs/theming>
- Base UI styling: <https://base-ui.com/react/handbook/styling>
- Base UI quick start: <https://base-ui.com/react/overview/quick-start>
