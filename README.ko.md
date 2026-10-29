# H-UI

[![CI](https://github.com/ITmrHoang/h-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/ITmrHoang/h-ui/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@itmrhoang/h-ui.svg)](https://www.npmjs.com/package/@itmrhoang/h-ui)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md) · [Tiếng Việt](README.md#tiếng-việt) · **한국어**

> 이 문서는 [README.md](README.md)(영어/베트남어)의 한국어 번역입니다. 기여자가 관리하며 원본보다 늦게 갱신될 수 있습니다.
> 내용이 다를 경우 README.md를 기준으로 합니다.

**Storybook / 문서:** https://itmrhoang.github.io/h-ui/ ·
**템플릿:** [landing](https://itmrhoang.github.io/h-ui/examples/landing.html) ·
[dashboard](https://itmrhoang.github.io/h-ui/examples/dashboard.html) ·
[admin](https://itmrhoang.github.io/h-ui/examples/admin.html) ·
[table](https://itmrhoang.github.io/h-ui/examples/table.html) ·
[kanban](https://itmrhoang.github.io/h-ui/examples/kanban.html) ·
[ecommerce](https://itmrhoang.github.io/h-ui/examples/ecommerce.html) ·
[catalog](https://itmrhoang.github.io/h-ui/examples/catalog.html) ·
[blog](https://itmrhoang.github.io/h-ui/examples/blog.html) ·
[story](https://itmrhoang.github.io/h-ui/examples/story.html) ·
[auth](https://itmrhoang.github.io/h-ui/examples/auth.html) — [전체 템플릿](https://itmrhoang.github.io/h-ui/examples/index.html)
(Storybook의 **Templates** 메뉴에서도 볼 수 있습니다)

---

**H-UI**는 Ant Design과 MUI에서 영감을 받은, 프레임워크에 독립적이고 의존성이 없는(zero-dependency) **웹 컴포넌트** 라이브러리입니다.
200개 이상의 컴포넌트(네이티브 폼 컨트롤, 내비게이션, 피드백, 카드, 데이터 뷰, 테이블, 날짜 선택기, 트리, 차트,
스크롤 기반 섹션, 효과 등), CSS 변수 기반 테마와 내장 다크 모드, 베트남어/영어 로케일을 제공합니다.
순수 HTML, Vue, React, Angular, Nuxt, PHP 템플릿 등 HTML을 렌더링하는 모든 환경에서 동작합니다.

## 설치

```bash
npm i @itmrhoang/h-ui
```

## 사용법

**컴포넌트별 import (권장 — 사용하는 것만 로드):**

```js
import '@itmrhoang/h-ui/hui-button';
import '@itmrhoang/h-ui/hui-input';
import { message } from '@itmrhoang/h-ui/hui-message';
```

```html
<hui-button variant="primary" icon="check">저장</hui-button>
```

**전체 import:** `import '@itmrhoang/h-ui';`

> 패키지 루트에서 import하면(`import { HuiButton } from '@itmrhoang/h-ui'`) 라이브러리 **전체**가 로드됩니다.
> 각 컴포넌트 파일이 태그를 등록하므로 번들러가 tree-shaking할 수 없습니다. 가볍게 쓰려면 위의 개별 경로를 사용하세요.

## CDN (설치·번들러 없이)

```html
<!-- 모든 컴포넌트 + window.HUI가 포함된 단일 파일 -->
<script src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui.css"> <!-- 선택 사항: CSS 리셋 -->

<hui-button onclick="HUI.message.success('안녕하세요')">클릭</hui-button>
```

전체 번들은 큽니다(~525 KB gzip). 대신 **그룹별**로 로드할 수 있습니다 — 항상 `h-ui-core.min.js`를 먼저 로드한 뒤
필요한 그룹만 로드하세요(같은 버전):

```html
<script src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui-core.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui-data.min.js"></script>
```

| 파일 | 내용 | gzip |
|---|---|---:|
| `h-ui-core.min.js` | 기본 클래스, `window.HUI`(message, notification, setLocale…), button, icon, input, select, checkbox, radio, switch, tag, badge, avatar, card, modal, drawer, tooltip, popover, dropdown, menu, tabs, collapse, layout/grid/flex/space, typography, pagination, alert, result, empty, skeleton… | ~168 KB |
| `h-ui-form.min.js` | form, date/time/range picker, calendar, upload, autocomplete, search, cascader, tree-select, color picker, slider, rate, OTP, phone input, mentions, contact form, filter bar… | ~106 KB |
| `h-ui-data.min.js` | table, data view, tree, transfer, chart, timeline, kanban, statistic, stat card, KPI row, list, descriptions, card grid, virtual list… | ~129 KB |
| `h-ui-marketing.min.js` | hero, features, pricing, testimonials, FAQ, navbar, footer, gallery, lightbox, carousel, video, 스크롤/텍스트 효과… | ~131 KB |
| `h-ui-shop.min.js` | product card, cart drawer, add-to-cart, quantity, variant picker, coupon, review list… | ~27 KB |

그룹들은 실행 시 core의 코드를 공유하므로(중복 없음, 태그 이중 등록 없음) 여러 그룹을 함께 로드해도 안전합니다.
`h-ui.min.js`와 그룹 번들을 섞어 쓰지 마세요. CDN 파일은 UTF-8 텍스트를 포함하므로 페이지에
`<meta charset="utf-8">`이 필요합니다(또는 `<script>` 태그에 `charset="utf-8"` 추가).

또는 개별 컴포넌트를 ES 모듈로 로드할 수 있습니다:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/hui-button.esm.js"></script>
```

## 테마

```css
:root { --hui-primary: #e11d48; }          /* 브랜드 색상 — hover/active 및 10단계 색조가 자동 계산됨 */
html[data-theme="dark"] { /* 다크 모드 내장 */ }
```

기본 팔레트: 라이트 = 파스텔 하늘색(`--hui-primary: #0864ad`, 배경 `#f1f7ff`, 흰색 카드, 남색 텍스트);
다크 = 깊은 남보라색(`#0d0f26` → `#15183a` → `#1d2050`), 흰색 텍스트, `--hui-primary: #8cc8ff`.
모든 기본 텍스트/배경 조합은 WCAG AA를 충족합니다. 컴포넌트별 재정의: `--hui-<component>-*` 변수, `::part(...)`, 슬롯 —
Storybook의 **Docs/Theming**, **Docs/Override**, **Guide/HuiDemo**를 참고하세요.

## Vue / React / Nuxt

이 라이브러리는 프레임워크에 의존하지 않습니다. `@itmrhoang/h-ui/vue`와 `@itmrhoang/h-ui/react`는 실행 시
`vue`/`react`를 **import하지 않습니다**.

**SSR / 느린 로딩 시 레이아웃 깜빡임 방지** — JS가 정의될 때까지 `hui-*` 태그를 숨깁니다(공간은 유지).
CSS에는 `:not(:defined)`용 와일드카드가 없으므로 이 파일에 모든 태그 이름이 나열되어 있습니다:

```js
import '@itmrhoang/h-ui/undefined.css';   // :is(hui-button, hui-input, …):not(:defined) { visibility: hidden }
```

### Vue 3

```js
// vite.config.js — 필수: hui-*가 (Vue 컴포넌트가 아닌) 커스텀 엘리먼트임을 컴파일러에 알림
import vue from '@vitejs/plugin-vue';
import { huiCompilerOptions } from '@itmrhoang/h-ui/vue';   // = { isCustomElement: (tag) => tag.startsWith('hui-') }
export default { plugins: [vue({ template: { compilerOptions: huiCompilerOptions } })] };
```

```js
// main.js
import { createApp } from 'vue';
import HuiVue, { loadHui } from '@itmrhoang/h-ui/vue';
import App from './App.vue';

await loadHui();                       // 전체 — 또는 loadHui(['hui-button', 'hui-input', 'hui-radio-group'])
createApp(App).use(HuiVue, { components: false }).mount('#app');
// 간단히: createApp(App).use(HuiVue).mount('#app') — 플러그인이 전체를 직접 로드(비동기, 아래 참고)
```

플러그인은 세 가지를 합니다: 컴포넌트 로드(`components: 'all' | false | ['hui-button', () => import(...)]`),
`v-hui-model` 디렉티브 등록(`directive: false`로 비활성화), Vue 런타임 템플릿 컴파일러 사용 시 `isCustomElement` 설정.
`app.config.globalProperties.$huiReady` / `inject('hui:ready')`는 컴포넌트 로드가 끝나면 완료되는 Promise입니다.

```vue
<template>
  <hui-input v-model="email" placeholder="이메일" />               <!-- 기본 v-model: el.value + input 이벤트 -->
  <hui-select v-model.lazy="city" :options="cities" />             <!-- change만 발생하는 컨트롤 → .lazy -->
  <hui-switch v-hui-model:notify="form" />                         <!-- checked + change -->
  <hui-checkbox-group v-hui-model="[form, 'tags']" :options="tagOptions" />
  <hui-button variant="primary" @hui-click="save">저장</hui-button>  <!-- 커스텀 이벤트: @hui-xxx -->
</template>
```

| 바인딩 | 사용 시점 |
|---|---|
| `v-model` | `input`을 발생시키는 컨트롤(hui-input, textarea, slider, rate…) — Vue가 `el.value`를 설정하고 `input`을 수신 |
| `v-model.lazy` | `change`만 발생시키는 컨트롤(hui-select, cascader, tree-select, upload, transfer…) |
| `v-hui-model:key="reactiveObj"` / `v-hui-model="[obj, 'key']"` | `checked` 기반을 포함한 모든 컨트롤(hui-switch, hui-checkbox, hui-radio); `input`과 `change` 모두 수신; 수식어 `.lazy` `.trim` `.number` `.checked` `.value` |

> **비동기**로 로드되는 컴포넌트(플러그인 / `loadHui`): 태그가 정의되기 전에 `:options`로 배열/객체를 넘기면
> Vue가 attribute로 설정합니다. `mount()` 전에 `await loadHui()`(위 예시), 정적 import
> (`import '@itmrhoang/h-ui/hui-select'`), 또는 property 바인딩 강제(`:options.prop="cities"`)를 사용하세요.

타입 힌트(Volar): 플러그인을 import하면 모든 태그에 대한 `GlobalComponents`(props, `@이벤트`, `v-model`)가 추가됩니다.
플러그인 없이 쓰려면 tsconfig의 `compilerOptions.types`에 `"@itmrhoang/h-ui/types/vue"`를 추가하세요.

### Nuxt 3

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  vue: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('hui-') } },
  css: ['@itmrhoang/h-ui/undefined.css', '@itmrhoang/h-ui/style.css'],
});
```

```ts
// plugins/h-ui.client.ts — 브라우저에서만 실행(커스텀 엘리먼트는 DOM 필요); Nuxt는 비동기 플러그인 완료 후 hydrate
import HuiVue, { loadHui } from '@itmrhoang/h-ui/vue';

export default defineNuxtPlugin(async (nuxtApp) => {
  await loadHui();                     // 또는 loadHui(['hui-button', 'hui-input'])
  nuxtApp.vueApp.use(HuiVue, { components: false });
});
```

서버는 `hui-*` 태그를 알 수 없는 엘리먼트(attribute + 슬롯 내용)로 렌더링하고, Shadow DOM은 클라이언트에서 생성되므로
`undefined.css`가 정의될 때까지 공간을 유지합니다. 무겁거나 클라이언트 전용인 컴포넌트(차트, 모달 등)는
`<ClientOnly>`로 감쌀 수 있습니다.

### React 19

React 19는 커스텀 엘리먼트를 기본 지원합니다 — 래퍼 없이 태그를 바로 사용하세요:

```tsx
import '@itmrhoang/h-ui/hui-input';    // 정적 import: React가 렌더링하기 전에 태그가 정의됨
import '@itmrhoang/h-ui/hui-select';

<hui-input value={q} placeholder="검색" onInput={(e) => setQ(e.currentTarget.value)}
  onhui-search={(e) => search(e.detail.value)} />
<hui-select options={cities} mode="multiple" className="w-60" onChange={(e) => setCity(e.currentTarget.value)} />
```

| Prop | React 19의 동작 |
|---|---|
| 엘리먼트 property 이름(`value`, `options`, `disabled`…) | **property**로 설정(배열/객체/불리언 타입 유지); 태그 정의 전에는 attribute가 됨 |
| `onClick`, `onInput`, `onChange`, `onKeyDown`… | React 합성 이벤트(`onChange` = 엘리먼트의 네이티브 `change` 이벤트) |
| `on` + **정확한 이벤트 이름**: `onhui-search`, `onhui-change`, `onclose`, `onclear` | `addEventListener('hui-search', …)` — 대소문자를 구분하므로 `onHuiSearch`는 **동작하지 않음** |
| `className` | `class` attribute |

JSX 타입: `compilerOptions.types`에 `"@itmrhoang/h-ui/types/react"`를 추가하세요(props, enum 값, 타입이 지정된 `e.detail`을 가진 `onhui-*`).
Next.js: `'use client'` 파일에서 컴포넌트를 import하세요. SSR은 문자열/숫자 prop만 attribute로 출력하고 나머지는 hydrate 시 설정됩니다.

### React 18 이하

React 18은 커스텀 엘리먼트의 모든 prop을 문자열 attribute로 처리하고(`disabled={false}` → `disabled="false"`)
커스텀 이벤트를 수신하지 않습니다. `createComponent`를 사용하세요(React를 인자로 전달 — 라이브러리는 react에 의존하지 않음):

```jsx
import * as React from 'react';
import { createComponent } from '@itmrhoang/h-ui/react';
import '@itmrhoang/h-ui/hui-input';

export const HuiInput = createComponent(React, 'hui-input', { events: ['input', 'change', 'hui-search'] });

<HuiInput ref={ref} value={q} disabled={false} onInput={(e) => setQ(e.detail.value)} onHuiSearch={(e) => search(e.detail.value)} />
```

- prop은 렌더링마다 엘리먼트 **property**로 설정됩니다(prop을 제거하면 기본값으로 복원). `className`, `style`, `id`, `slot`,
  `data-*`, `aria-*` 및 기타 React 이벤트(`onClick` 등)는 React에 그대로 전달됩니다.
- `events`: 이벤트 이름 배열 → `on` + PascalCase prop(`hui-search` → `onHuiSearch`), 또는 사용자 지정 매핑
  `{ onPick: 'change' }`. `ref`는 `hui-*` 엘리먼트 자체를 가리킵니다.

## TypeScript

- `.d.ts` 파일과 `custom-elements.json`을 제공합니다(VS Code에서 태그/attribute 자동 완성).
- Vue: `compilerOptions.types`에 `"@itmrhoang/h-ui/types/vue"`를 추가하고 `isCustomElement: (t) => t.startsWith('hui-')`를 설정하세요.
- React 19: `"@itmrhoang/h-ui/types/react"`를 추가하세요.

## 개발

```bash
npm ci
npm run storybook        # http://localhost:6006
npm run dev              # 템플릿: http://localhost:5173/examples/index.html
npm test                 # 단위 테스트(실제 Chromium)
npm run test:stories     # 모든 story 테스트
npm run build            # dist/ + custom-elements.json + 타입
npm run build:cdn        # dist/cdn/h-ui.min.js + 그룹 번들(core/form/data/marketing/shop)
npm run check:cdn        # CDN 번들이 Chromium에서 실행되는지 확인
npm run size             # 컴포넌트별 import의 gzip 크기
```

## 릴리스 (CI/CD)

| 워크플로 | 시점 | 작업 |
|---|---|---|
| **CI** | 모든 push / PR | 빌드, 타입 검사, 단위 + story 테스트, 정적 빌드 검사, 크기 보고 |
| **Deploy Storybook** | `main`에 push | Storybook + 템플릿 → GitHub Pages |
| **Release** | `main`에 push | changeset이 있으면 *"chore: version packages"* PR 생성; 해당 PR 병합 → `npm publish` + 태그 `vX.Y.Z` + GitHub Release |

다음 릴리스의 변경 사항 기록: `npx changeset`(patch / minor / major 선택 + 설명) 후 `.changeset/`의 파일을 커밋하세요.

라이선스: [MIT](LICENSE)
