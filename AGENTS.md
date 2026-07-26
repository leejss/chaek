<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Design language

Chaek은 글을 빠르게 처리하는 도구보다 생각이 한 권의 흐름으로 정리되도록 돕는 조용한 작업 공간이어야 한다. 화면은 먼저 사용자가 쓰고 읽는 콘텐츠를 드러내고, navigation, toolbar, panel 같은 chrome은 현재 위치와 다음 행동을 이해하는 데 필요한 만큼만 존재한다. 시선을 얻기 위한 장식보다 읽는 순서와 작업의 인과관계를 선명하게 만드는 것을 우선한다.

여백은 남는 공간이 아니라 글의 속도와 집중을 조절하는 구조다. 화면을 무조건 넓고 비어 보이게 만들기보다 콘텐츠 사이에 호흡을 만들고, 구분이 필요할 때는 낮은 tonal difference, 얇은 border, 정돈된 간격을 먼저 사용한다. 모든 대상을 카드로 감싸거나 그림자로 띄우지 않는다. 독립적으로 조작되는 surface만 주변 canvas와 구분하고, 나머지는 같은 흐름 안에 둔다.

시각적 분위기는 `Mist · Deep Forest · Mineral`에서 시작한다. Mist Paper는 조용한 바탕, Forest Black은 깊이와 집중, Deep Forest는 브랜드의 지속음(sustained tone)을 담당한다. Deep Forest는 넓은 면을 장식하는 색이 아니라 primary action, focus, active state처럼 결정적인 순간에 반복한다. 상태색은 브랜드색과 분리하고, 색만으로 의미를 전달하지 않는다. Dark theme은 Light theme의 단순 반전이 아니라 더 깊은 forest-black 공간으로 설계한다.

형태는 자연의 깊이와 디지털 도구의 정밀함이 함께 느껴져야 한다. 낮은 채도의 미세한 차이, compact control, 일관된 radius, 정확한 정렬을 사용하고 gradient, glow, glassmorphism, 장식적인 blur는 피한다. 타이포그래피는 산세리프를 기본으로 하며 큰 제목도 과장된 캠페인 문구처럼 다루지 않는다. 짧고 직접적인 문장, 충분한 행간, 명확한 크기와 굵기 차이로 위계를 만든다.

상호작용은 움직임으로 존재감을 과시하지 않고 사용자가 만든 상태 변화를 확인한다. Hover에서는 위치를 움직이지 않고 color와 surface만 바꾸며, press, open, close, checked에는 짧은 opacity나 scale feedback만 사용한다. Keyboard focus는 항상 보여야 하고 pointer와 keyboard가 같은 상태 의미를 전달해야 한다.

Framer에서는 제품 UI의 직접성, compact primitive, 부드러운 surface 문법을 참고한다. Ryuichi Sakamoto의 작업에서는 정적(silence), 절제(restraint), 자연의 흔적과 기술적 정밀함이 공존하는 태도만 참고한다. 어느 쪽의 로고, 화면 구성, 작품 이미지, 타이포그래피도 복제하지 않는다. 레퍼런스는 결과물의 모양이 아니라 Chaek다운 선택을 하기 위한 판단 기준이다.

새로운 화면을 디자인할 때는 먼저 콘텐츠만으로 읽는 순서가 성립하는지 확인한다. 그다음 현재 상태와 하나의 primary action을 명확히 하고, 마지막에 필요한 surface와 feedback을 더한다. 요소를 추가하기 전에 하나를 덜어낼 수 있는지, 강조색 없이도 위계가 보이는지, 인터페이스가 콘텐츠보다 먼저 말하고 있지는 않은지 묻는다.

이 문단들은 추상적인 방향을 위한 필수 기준이며, semantic token, primitive, accessibility, 구현 규칙의 상세한 기준 문서는 [`docs/design-system.md`](docs/design-system.md)다.
