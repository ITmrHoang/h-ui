# H-UI

[![CI](https://github.com/ITmrHoang/h-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/ITmrHoang/h-ui/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@itmrhoang/h-ui.svg)](https://www.npmjs.com/package/@itmrhoang/h-ui)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**English** · [Tiếng Việt](#tiếng-việt) · [한국어](README.ko.md)

**Storybook / docs:** https://itmrhoang.github.io/h-ui/ ·
**Templates:** [landing](https://itmrhoang.github.io/h-ui/examples/landing.html) ·
[dashboard](https://itmrhoang.github.io/h-ui/examples/dashboard.html) ·
[admin](https://itmrhoang.github.io/h-ui/examples/admin.html) ·
[table](https://itmrhoang.github.io/h-ui/examples/table.html) ·
[kanban](https://itmrhoang.github.io/h-ui/examples/kanban.html) ·
[ecommerce](https://itmrhoang.github.io/h-ui/examples/ecommerce.html) ·
[catalog](https://itmrhoang.github.io/h-ui/examples/catalog.html) ·
[blog](https://itmrhoang.github.io/h-ui/examples/blog.html) ·
[story](https://itmrhoang.github.io/h-ui/examples/story.html) ·
[auth](https://itmrhoang.github.io/h-ui/examples/auth.html) — [all templates](https://itmrhoang.github.io/h-ui/examples/index.html)
(also embedded in Storybook under **Templates**)

---

## English

**H-UI** is a framework-agnostic, zero-dependency **Web Components** library inspired by Ant Design and MUI:
200+ components (native-form controls, navigation, feedback, cards, data views, tables, date pickers, trees, charts,
scroll-driven sections, effects…), CSS-variable theming with a built-in dark mode, and vi/en locales.
It works with plain HTML, Vue, React, Angular, Nuxt, PHP templates — anything that renders HTML.

### Install

```bash
npm i @itmrhoang/h-ui
```

### Usage

**Per-component import (recommended — loads only what you use):**

```js
import '@itmrhoang/h-ui/hui-button';
import '@itmrhoang/h-ui/hui-input';
import { message } from '@itmrhoang/h-ui/hui-message';
```

```html
<hui-button variant="primary" icon="check">Save</hui-button>
```

**Import everything:** `import '@itmrhoang/h-ui';`

> Importing from the package root (`import { HuiButton } from '@itmrhoang/h-ui'`) also loads the **whole** library — every
> component file registers its tag, so bundlers cannot tree-shake it. Use the per-component paths above to stay light.

### CDN (no install, no bundler)

```html
<!-- One file with every component + window.HUI -->
<script src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui.css"> <!-- optional CSS reset -->

<hui-button onclick="HUI.message.success('Hello')">Click me</hui-button>
```

The full bundle is large (~525 KB gzip). You can load it **by group** instead — always load `h-ui-core.min.js` first,
then only the groups you need (same version):

```html
<script src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui-core.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui-data.min.js"></script>
```

| File | Contents | gzip |
|---|---|---:|
| `h-ui-core.min.js` | Base classes, `window.HUI` (message, notification, setLocale…), button, icon, input, select, checkbox, radio, switch, tag, badge, avatar, card, modal, drawer, tooltip, popover, dropdown, menu, tabs, collapse, layout/grid/flex/space, typography, pagination, alert, result, empty, skeleton… | ~168 KB |
| `h-ui-form.min.js` | form, date/time/range picker, calendar, upload, autocomplete, search, cascader, tree-select, color picker, slider, rate, OTP, phone input, mentions, contact form, filter bar… | ~106 KB |
| `h-ui-data.min.js` | table, data view, tree, transfer, chart, timeline, kanban, statistic, stat card, KPI row, list, descriptions, card grid, virtual list… | ~129 KB |
| `h-ui-marketing.min.js` | hero, features, pricing, testimonials, FAQ, navbar, footer, gallery, lightbox, carousel, video, scroll/text effects… | ~131 KB |
| `h-ui-shop.min.js` | product card, cart drawer, add-to-cart, quantity, variant picker, coupon, review list… | ~27 KB |

Groups share core's code at runtime (nothing is duplicated, no tag is registered twice), so loading several groups is
safe. Don't mix `h-ui.min.js` with the group bundles. The CDN files contain UTF-8 text — the page needs
`<meta charset="utf-8">` (or add `charset="utf-8"` to the `<script>` tag).

Or load single components as ES modules:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/hui-button.esm.js"></script>
```

### Theming

```css
:root { --hui-primary: #e11d48; }          /* brand colour — hover/active and 10 shades are derived automatically */
html[data-theme="dark"] { /* dark mode is built in */ }
```

Default palette: light = pastel sky blue (`--hui-primary: #0864ad`, background `#f1f7ff`, white surfaces, navy text);
dark = deep navy-violet (`#0d0f26` → `#15183a` → `#1d2050`), white text, `--hui-primary: #8cc8ff`.
Every default text/background pair meets WCAG AA. Per-component overrides: `--hui-<component>-*` variables, `::part(...)`,
slots — see **Docs/Theming**, **Docs/Override** and **Guide/HuiDemo** in Storybook.

### Vue / React / Nuxt

The library has no framework dependency: `@itmrhoang/h-ui/vue` and `@itmrhoang/h-ui/react` do **not** import `vue`/`react`
at runtime.

**Avoid layout flashes during SSR / slow loads** — hide (while keeping the space of) `hui-*` tags until their JS is
defined. CSS has no wildcard for `:not(:defined)`, so this file lists every tag name:

```js
import '@itmrhoang/h-ui/undefined.css';   // :is(hui-button, hui-input, …):not(:defined) { visibility: hidden }
```

#### Vue 3

```js
// vite.config.js — required: tell the compiler that hui-* are custom elements (not Vue components)
import vue from '@vitejs/plugin-vue';
import { huiCompilerOptions } from '@itmrhoang/h-ui/vue';   // = { isCustomElement: (tag) => tag.startsWith('hui-') }
export default { plugins: [vue({ template: { compilerOptions: huiCompilerOptions } })] };
```

```js
// main.js
import { createApp } from 'vue';
import HuiVue, { loadHui } from '@itmrhoang/h-ui/vue';
import App from './App.vue';

await loadHui();                       // everything — or loadHui(['hui-button', 'hui-input', 'hui-radio-group'])
createApp(App).use(HuiVue, { components: false }).mount('#app');
// Shorter: createApp(App).use(HuiVue).mount('#app') — the plugin loads everything itself (async, see the note below)
```

The plugin does three things: loads components (`components: 'all' | false | ['hui-button', () => import(...)]`),
registers the `v-hui-model` directive (`directive: false` to disable), and sets `isCustomElement` when you use Vue's
runtime template compiler. `app.config.globalProperties.$huiReady` / `inject('hui:ready')` is a Promise that resolves
once components are loaded.

```vue
<template>
  <hui-input v-model="email" placeholder="Email" />                <!-- native v-model: el.value + input event -->
  <hui-select v-model.lazy="city" :options="cities" />             <!-- controls that only emit change → .lazy -->
  <hui-switch v-hui-model:notify="form" />                         <!-- checked + change -->
  <hui-checkbox-group v-hui-model="[form, 'tags']" :options="tagOptions" />
  <hui-button variant="primary" @hui-click="save">Save</hui-button>  <!-- custom events: @hui-xxx -->
</template>
```

| Binding | When |
|---|---|
| `v-model` | controls that emit `input` (hui-input, textarea, slider, rate…) — Vue sets `el.value` and listens to `input` |
| `v-model.lazy` | controls that only emit `change` (hui-select, cascader, tree-select, upload, transfer…) |
| `v-hui-model:key="reactiveObj"` / `v-hui-model="[obj, 'key']"` | every control, including `checked` ones (hui-switch, hui-checkbox, hui-radio); listens to both `input` and `change`; modifiers `.lazy` `.trim` `.number` `.checked` `.value` |

> Components loaded **asynchronously** (plugin / `loadHui`): if you pass an array/object through `:options` before the
> tag is defined, Vue sets it as an attribute. `await loadHui()` before `mount()` (as above), import statically
> (`import '@itmrhoang/h-ui/hui-select'`), or force a property binding: `:options.prop="cities"`.

Type hints (Volar): importing the plugin adds `GlobalComponents` for every tag (props, `@events`, `v-model`);
without the plugin, add `"@itmrhoang/h-ui/types/vue"` to `compilerOptions.types` in tsconfig.

#### Nuxt 3

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  vue: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('hui-') } },
  css: ['@itmrhoang/h-ui/undefined.css', '@itmrhoang/h-ui/style.css'],
});
```

```ts
// plugins/h-ui.client.ts — browser only (custom elements need the DOM); Nuxt waits for async plugins before hydrating
import HuiVue, { loadHui } from '@itmrhoang/h-ui/vue';

export default defineNuxtPlugin(async (nuxtApp) => {
  await loadHui();                     // or loadHui(['hui-button', 'hui-input'])
  nuxtApp.vueApp.use(HuiVue, { components: false });
});
```

The server renders `hui-*` tags as unknown elements (attributes + slotted content); Shadow DOM is built on the client,
so `undefined.css` keeps their space until they are defined. Heavy or client-only components (charts, modals…) can be
wrapped in `<ClientOnly>`.

#### React 19

React 19 supports custom elements natively — use the tags directly, no wrapper needed:

```tsx
import '@itmrhoang/h-ui/hui-input';    // static import: the tag is defined BEFORE React renders
import '@itmrhoang/h-ui/hui-select';

<hui-input value={q} placeholder="Search" onInput={(e) => setQ(e.currentTarget.value)}
  onhui-search={(e) => search(e.detail.value)} />
<hui-select options={cities} mode="multiple" className="w-60" onChange={(e) => setCity(e.currentTarget.value)} />
```

| Prop | What React 19 does |
|---|---|
| name of an element property (`value`, `options`, `disabled`…) | sets the **property** (arrays/objects/booleans keep their type); before the tag is defined it becomes an attribute |
| `onClick`, `onInput`, `onChange`, `onKeyDown`… | React synthetic events (`onChange` = the element's native `change` event) |
| `on` + **exact event name**: `onhui-search`, `onhui-change`, `onclose`, `onclear` | `addEventListener('hui-search', …)` — case-sensitive, so `onHuiSearch` does **not** fire |
| `className` | the `class` attribute |

JSX types: add `"@itmrhoang/h-ui/types/react"` to `compilerOptions.types` (props, enum values, `onhui-*` with typed `e.detail`).
Next.js: import components in a `'use client'` file; SSR only prints string/number props as attributes, the rest is set on hydration.

#### React 18 and below

React 18 treats every custom-element prop as a string attribute (`disabled={false}` becomes `disabled="false"`) and does
not listen to custom events. Use `createComponent` (pass React in — the library does not depend on react):

```jsx
import * as React from 'react';
import { createComponent } from '@itmrhoang/h-ui/react';
import '@itmrhoang/h-ui/hui-input';

export const HuiInput = createComponent(React, 'hui-input', { events: ['input', 'change', 'hui-search'] });

<HuiInput ref={ref} value={q} disabled={false} onInput={(e) => setQ(e.detail.value)} onHuiSearch={(e) => search(e.detail.value)} />
```

- Props are set as element **properties** after each render (removing a prop restores its default); `className`, `style`,
  `id`, `slot`, `data-*`, `aria-*` and other React events (`onClick`…) are passed straight to React.
- `events`: an array of event names → `on` + PascalCase props (`hui-search` → `onHuiSearch`), or a custom map
  `{ onPick: 'change' }`. `ref` points at the `hui-*` element itself.

### TypeScript

- Ships `.d.ts` files and `custom-elements.json` (tag/attribute completion in VS Code).
- Vue: add `"@itmrhoang/h-ui/types/vue"` to `compilerOptions.types` and set `isCustomElement: (t) => t.startsWith('hui-')`.
- React 19: add `"@itmrhoang/h-ui/types/react"`.

### Development

```bash
npm ci
npm run storybook        # http://localhost:6006
npm run dev              # templates: http://localhost:5173/examples/index.html
npm test                 # unit tests (real Chromium)
npm run test:stories     # test every story
npm run build            # dist/ + custom-elements.json + types
npm run build:cdn        # dist/cdn/h-ui.min.js + group bundles (core/form/data/marketing/shop)
npm run check:cdn        # check the CDN bundles run in Chromium
npm run size             # gzip size of each per-component import
```

### Release (CI/CD)

| Workflow | When | What |
|---|---|---|
| **CI** | every push / PR | build, type check, unit + story tests, static-build check, size report |
| **Deploy Storybook** | push to `main` | Storybook + templates → GitHub Pages |
| **Release** | push to `main` | with changesets → opens a *"chore: version packages"* PR; merging it → `npm publish` + tag `vX.Y.Z` + GitHub Release |

Record a change for the next release: `npx changeset` (pick patch / minor / major + a description), then commit the file in `.changeset/`.

### Other languages

The main README is English + Vietnamese. Other languages live in separate files (`README.<lang>.md`, e.g.
[README.ko.md](README.ko.md)) maintained by contributors; they may lag behind this file.

License: [MIT](LICENSE)

---

## Tiếng Việt

**H-UI** là thư viện **Web Components** không phụ thuộc framework (zero-dependency), lấy cảm hứng từ Ant Design + MUI:
200+ component (form native, điều hướng, phản hồi, card, data-view, bảng, chọn ngày, cây, chart, cuộn từng bước, hiệu ứng…),
theme + dark mode bằng biến CSS, locale vi/en. Chạy với HTML thuần, Vue, React, Angular, Nuxt, PHP…

### Cài đặt

```bash
npm i @itmrhoang/h-ui
```

### Dùng

**Import lẻ (khuyên dùng — chỉ tải đúng thứ cần dùng):**

```js
import '@itmrhoang/h-ui/hui-button';
import '@itmrhoang/h-ui/hui-input';
import { message } from '@itmrhoang/h-ui/hui-message';
```

```html
<hui-button variant="primary" icon="check">Lưu</hui-button>
```

**Import toàn bộ:** `import '@itmrhoang/h-ui';`

> Import từ gói gốc (`import { HuiButton } from '@itmrhoang/h-ui'`) cũng tải **toàn bộ** thư viện — mỗi file component tự
> đăng ký thẻ nên bundler không cắt bỏ được. Muốn nhẹ, dùng đường dẫn lẻ như trên.

### Dùng qua CDN (không cần cài, không cần bundler)

```html
<!-- Một file, có tất cả component + window.HUI -->
<script src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui.css"> <!-- CSS reset, tùy chọn -->

<hui-button onclick="HUI.message.success('Xin chào')">Bấm thử</hui-button>
```

Bản trọn gói khá lớn (~525 KB gzip). Có thể tải **theo nhóm** — luôn tải `h-ui-core.min.js` trước, rồi chỉ những
nhóm cần dùng (cùng phiên bản):

```html
<script src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui-core.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/cdn/h-ui-data.min.js"></script>
```

| File | Nội dung | gzip |
|---|---|---:|
| `h-ui-core.min.js` | Lớp nền, `window.HUI` (message, notification, setLocale…), button, icon, input, select, checkbox, radio, switch, tag, badge, avatar, card, modal, drawer, tooltip, popover, dropdown, menu, tabs, collapse, layout/grid/flex/space, typography, pagination, alert, result, empty, skeleton… | ~168 KB |
| `h-ui-form.min.js` | form, date/time/range-picker, calendar, upload, autocomplete, search, cascader, tree-select, color-picker, slider, rate, otp, phone-input, mentions, contact-form, filter-bar… | ~106 KB |
| `h-ui-data.min.js` | table, data-view, tree, transfer, chart, timeline, kanban, statistic, stat-card, kpi-row, list, descriptions, card-grid, virtual-list… | ~129 KB |
| `h-ui-marketing.min.js` | hero, feature, pricing, testimonial, faq, navbar, footer, gallery, lightbox, carousel, video, hiệu ứng cuộn / chữ… | ~131 KB |
| `h-ui-shop.min.js` | product-card, cart-drawer, add-to-cart, quantity, variant-picker, coupon, review-list… | ~27 KB |

Các nhóm dùng chung code của core lúc chạy (không nhân đôi, không đăng ký thẻ 2 lần) nên nạp nhiều nhóm cùng lúc vẫn an toàn.
Không trộn `h-ui.min.js` với bản nhóm. File CDN chứa UTF-8 (tiếng Việt) — trang cần `<meta charset="utf-8">`
(hoặc thêm `charset="utf-8"` vào thẻ `<script>`).

Hoặc chỉ tải component cần dùng (ES module):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@itmrhoang/h-ui@0/dist/hui-button.esm.js"></script>
```

### Theme

```css
:root { --hui-primary: #e11d48; }          /* đổi màu chính — hover/active/10 sắc độ tự tính */
html[data-theme="dark"] { /* dark mode có sẵn */ }
```

Bảng màu mặc định: sáng = pastel xanh dương trời (`--hui-primary: #0864ad`, nền `#f1f7ff`, khối trắng, chữ navy);
tối = xanh than ngả tím có chiều sâu (`#0d0f26` → `#15183a` → `#1d2050`), chữ trắng, `--hui-primary: #8cc8ff`.
Mọi cặp chữ/nền mặc định đạt WCAG AA. Override từng component: biến `--hui-<component>-*`, `::part(...)`, slot — xem
**Docs/Theming**, **Docs/Override** và **Guide/HuiDemo** trong Storybook.

### Dùng với Vue / React / Nuxt

Thư viện không phụ thuộc framework: `@itmrhoang/h-ui/vue` và `@itmrhoang/h-ui/react` **không import `vue`/`react`** lúc chạy.

**Chống nháy khi SSR / tải chậm** — ẩn (vẫn giữ chỗ) thẻ `hui-*` cho tới khi JS định nghĩa xong.
CSS không có wildcard cho `:not(:defined)` nên file này liệt kê sẵn mọi tên thẻ:

```js
import '@itmrhoang/h-ui/undefined.css';   // :is(hui-button, hui-input, …):not(:defined) { visibility: hidden }
```

#### Vue 3

```js
// vite.config.js — bắt buộc: báo cho compiler biết hui-* là custom element (không phải component Vue)
import vue from '@vitejs/plugin-vue';
import { huiCompilerOptions } from '@itmrhoang/h-ui/vue';   // = { isCustomElement: (tag) => tag.startsWith('hui-') }
export default { plugins: [vue({ template: { compilerOptions: huiCompilerOptions } })] };
```

```js
// main.js
import { createApp } from 'vue';
import HuiVue, { loadHui } from '@itmrhoang/h-ui/vue';
import App from './App.vue';

await loadHui();                       // toàn bộ — hoặc loadHui(['hui-button', 'hui-input', 'hui-radio-group'])
createApp(App).use(HuiVue, { components: false }).mount('#app');
// Gọn hơn: createApp(App).use(HuiVue).mount('#app') — plugin tự tải toàn bộ (bất đồng bộ, xem lưu ý dưới)
```

Plugin làm 3 việc: tải component (`components: 'all' | false | ['hui-button', () => import(...)]`), đăng ký
directive `v-hui-model` (`directive: false` để tắt), gắn `isCustomElement` khi dùng bản Vue biên dịch template lúc chạy.
`app.config.globalProperties.$huiReady` / `inject('hui:ready')` là Promise xong khi đã tải.

```vue
<template>
  <hui-input v-model="email" placeholder="Email" />                <!-- v-model gốc: el.value + sự kiện input -->
  <hui-select v-model.lazy="city" :options="cities" />             <!-- control chỉ phát change → .lazy -->
  <hui-switch v-hui-model:notify="form" />                         <!-- checked + change -->
  <hui-checkbox-group v-hui-model="[form, 'tags']" :options="tagOptions" />
  <hui-button variant="primary" @hui-click="save">Lưu</hui-button>  <!-- sự kiện riêng: @hui-xxx -->
</template>
```

| Cách | Khi nào |
|---|---|
| `v-model` | control phát `input` (hui-input, textarea, slider, rate…) — Vue gán `el.value`, nghe `input` |
| `v-model.lazy` | control chỉ phát `change` (hui-select, cascader, tree-select, upload, transfer…) |
| `v-hui-model:key="reactiveObj"` / `v-hui-model="[obj, 'key']"` | mọi control kể cả `checked` (hui-switch, hui-checkbox, hui-radio); nghe cả `input` + `change`; modifier `.lazy` `.trim` `.number` `.checked` `.value` |

> Component tải **bất đồng bộ** (plugin / `loadHui`): truyền mảng/object qua `:options` khi thẻ chưa được define thì Vue
> gán thành attribute. Hãy `await loadHui()` trước `mount()` (như trên), import tĩnh (`import '@itmrhoang/h-ui/hui-select'`),
> hoặc ép gán property: `:options.prop="cities"`.

Gợi ý kiểu (Volar): import plugin là có `GlobalComponents` cho mọi thẻ (props, `@sự-kiện`, `v-model`);
không dùng plugin thì thêm `"@itmrhoang/h-ui/types/vue"` vào `compilerOptions.types` của tsconfig.

#### Nuxt 3

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  vue: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('hui-') } },
  css: ['@itmrhoang/h-ui/undefined.css', '@itmrhoang/h-ui/style.css'],
});
```

```ts
// plugins/h-ui.client.ts — chỉ chạy ở trình duyệt (custom element cần DOM); Nuxt chờ plugin async xong mới hydrate
import HuiVue, { loadHui } from '@itmrhoang/h-ui/vue';

export default defineNuxtPlugin(async (nuxtApp) => {
  await loadHui();                     // hoặc loadHui(['hui-button', 'hui-input'])
  nuxtApp.vueApp.use(HuiVue, { components: false });
});
```

Server render thẻ `hui-*` như thẻ lạ (attribute + nội dung slot), Shadow DOM chỉ dựng ở client → `undefined.css`
giữ chỗ cho tới khi định nghĩa xong. Component nặng/chỉ có nghĩa ở client (chart, modal…) có thể bọc `<ClientOnly>`.

#### React 19

React 19 hỗ trợ custom element sẵn — dùng thẳng thẻ, không cần wrapper:

```tsx
import '@itmrhoang/h-ui/hui-input';    // import tĩnh: thẻ được define TRƯỚC khi React render
import '@itmrhoang/h-ui/hui-select';

<hui-input value={q} placeholder="Tìm" onInput={(e) => setQ(e.currentTarget.value)}
  onhui-search={(e) => search(e.detail.value)} />
<hui-select options={cities} mode="multiple" className="w-60" onChange={(e) => setCity(e.currentTarget.value)} />
```

| Prop | React 19 làm gì |
|---|---|
| tên trùng property của element (`value`, `options`, `disabled`…) | gán **property** (mảng/object/boolean giữ nguyên kiểu); chưa define thì thành attribute |
| `onClick`, `onInput`, `onChange`, `onKeyDown`… | sự kiện tổng hợp của React (`onChange` = sự kiện `change` của element) |
| `on` + **tên sự kiện nguyên văn**: `onhui-search`, `onhui-change`, `onclose`, `onclear` | `addEventListener('hui-search', …)` — phân biệt hoa/thường, nên `onHuiSearch` **không** chạy |
| `className` | attribute `class` |

Kiểu JSX: thêm `"@itmrhoang/h-ui/types/react"` vào `compilerOptions.types` (props, giá trị enum, `onhui-*` có `e.detail`).
Next.js: import component trong file `'use client'`; SSR chỉ in prop kiểu chuỗi/số làm attribute, phần còn lại gán khi hydrate.

#### React 18 trở xuống

React 18 coi mọi prop của custom element là attribute chuỗi (`disabled={false}` thành `disabled="false"`) và không nghe
sự kiện riêng. Dùng `createComponent` (truyền React vào — thư viện không phụ thuộc react):

```jsx
import * as React from 'react';
import { createComponent } from '@itmrhoang/h-ui/react';
import '@itmrhoang/h-ui/hui-input';

export const HuiInput = createComponent(React, 'hui-input', { events: ['input', 'change', 'hui-search'] });

<HuiInput ref={ref} value={q} disabled={false} onInput={(e) => setQ(e.detail.value)} onHuiSearch={(e) => search(e.detail.value)} />
```

- Prop → gán **property** của element sau mỗi render (bỏ prop → về giá trị mặc định); `className`, `style`, `id`, `slot`,
  `data-*`, `aria-*` và sự kiện React khác (`onClick`…) chuyển nguyên cho React.
- `events`: mảng tên sự kiện → prop `on` + PascalCase (`hui-search` → `onHuiSearch`), hoặc map tự đặt
  `{ onPick: 'change' }`. `ref` trỏ tới chính thẻ `hui-*`.

### TypeScript

- Có sẵn `.d.ts` + `custom-elements.json` (gợi ý thẻ/attribute trong VS Code).
- Vue: thêm `"@itmrhoang/h-ui/types/vue"` vào `compilerOptions.types`; khai báo `isCustomElement: (t) => t.startsWith('hui-')`.
- React 19: thêm `"@itmrhoang/h-ui/types/react"`.

### Phát triển

```bash
npm ci
npm run storybook        # http://localhost:6006
npm run dev              # trang mẫu: http://localhost:5173/examples/index.html
npm test                 # unit test (Chromium thật)
npm run test:stories     # test mọi story
npm run build            # dist/ + custom-elements.json + types
npm run build:cdn        # dist/cdn/h-ui.min.js + bản theo nhóm (core/form/data/marketing/shop)
npm run check:cdn        # kiểm tra các bản CDN chạy được trong Chromium
npm run size             # kích thước gzip khi import lẻ từng component
```

### Phát hành (CI/CD)

| Workflow | Khi nào | Làm gì |
|---|---|---|
| **CI** | mọi push / PR | build, kiểm tra types, test unit + story, kiểm tra bản build tĩnh, báo kích thước |
| **Deploy Storybook** | push `main` | Storybook + trang mẫu → GitHub Pages |
| **Release** | push `main` | có changeset → mở PR *"chore: version packages"*; merge PR đó → `npm publish` + tag `vX.Y.Z` + GitHub Release |

Ghi thay đổi cho lần phát hành sau: `npx changeset` (chọn patch / minor / major + mô tả), commit file trong `.changeset/`.

### Ngôn ngữ khác

README chính gồm tiếng Anh + tiếng Việt. Ngôn ngữ khác nằm ở file riêng (`README.<mã-ngôn-ngữ>.md`, vd
[README.ko.md](README.ko.md)) do người đóng góp duy trì, có thể cập nhật chậm hơn file này.

Giấy phép: [MIT](LICENSE)
