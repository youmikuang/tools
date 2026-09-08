# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Tools

纯前端的在线开发者工具集（部署在中国大陆，含 ICP 备案）。每个工具是一个 Tab：**JSON 编辑器 / JSON 对比 / SQL 格式化 / 时间戳转换 / Base64 / 证件图片排版**。无后端、无账号，所有数据只存在浏览器（localStorage + Canvas，图片不上传）。

技术栈：**Vue 3.5（`<script setup>` + Composition API）+ Vite 7 + TypeScript**，编辑器基于 **CodeMirror 6**。**没有** Pinia、UI 组件库、CSS 框架——这些能力都是项目内手写的（见下），改动前务必了解，不要引入等价的第三方库。

## 常用命令

```sh
pnpm run dev          # 本地开发（Vite HMR）
pnpm run build        # 生产构建：run-p 并行跑 type-check 和 vite build（注意是并行，不是串行）
pnpm run test         # Vitest watch 模式
pnpm run test -- run  # 一次性跑全部测试
pnpm run type-check   # 仅类型检查（vue-tsc --build）
pnpm run format       # Prettier 格式化 src/
```

跑单个测试文件 / 单个用例：

```sh
npx vitest run src/__tests__/imageUtils.spec.ts
npx vitest run -t 'validateImageFile'      # 按用例名过滤
```

## 当前已知状态（先读这一段，避免误判为自己改坏了）

- **`JsonEditor.spec.ts` 的 6 个用例目前是失败的**。原因：[vitest.config.ts](vitest.config.ts) 没有配 `setupFiles`，也没有全局注册 i18n，而 `JsonEditor.vue` 在 `setup()` 里调了 `useI18n()` → 抛 `SyntaxError: Need to install with 'app.use' function`。**写组件测试时必须自己传插件**：`mount(Comp, { global: { plugins: [i18n] } })`。纯函数测试（`jsonUtils` / `imageUtils`）不受影响，全部通过。
- **`CodeMirrorEditor` 没有声明 `extensions` prop**。[SqlEditor.vue](src/views/SqlEditor.vue) 里写的 `:extensions="[sql()]"` 会被静默丢弃，SQL 语法高亮实际未生效——编辑器内部硬编码只用 `json()`。要支持按语言传 extension，需要先给 [CodeMirrorEditor.vue](src/components/base/CodeMirrorEditor.vue) 加 prop 并与内部 `extensions` computed 合并。
- **`useTheme()` 的 state 是每次调用独立的 ref**，不是单例。`App.vue` 点击切换主题只会更新它自己那份 `isDark` 和 `<html data-theme>`；`CodeMirrorEditor` 内部那份 `isDark` 只在自己 `onMounted` 时读一次 localStorage，因此**编辑器的 oneDark 不会跟随实时切换**（要重新挂载才生效）。

## 架构与关键约定

这些是本项目区别于普通 Vue 模板的地方，改动相关功能时必须遵循：

- **路由 = vue-router 4**。使用 `createWebHistory`，路由定义在 [src/router/index.ts](src/router/index.ts)，6 个路由：`/`（json）、`/diff`（jsonDiff）、`/sql`、`/time`、`/base64`、`/card`（图片工具）。视图切换在 [App.vue](src/App.vue) 里通过 `<router-view v-slot>` + `<KeepAlive>`（切 Tab 不销毁组件、保留输入）。导航使用 `<router-link>`，当前 Tab 高亮由 `route.name` 计算 `activeTab`——所以**路由 `name` 必须和 `activeTab` 的判断值一致**。

- **国际化 = vue-i18n 10（Composition API 模式）**。配置在 [src/i18n/index.ts](src/i18n/index.ts)，`legacy: false`，`fallbackLocale: 'en'`。所有 UI 文案必须走 `t('key')`（模板中用 `$t('key')`），禁止硬编码中英文。翻译表是文件内的 `messages` 对象——新增文案要**同时在 `en` 和 `zh` 里加**，只加一边会回退到英文/key。语言存 localStorage `json-editor-locale`（注意这个 key 名是历史遗留，不只管 JSON 编辑器），切换通过 `locale.value = next`。
  - **例外**：图片工具的证件类型名走 `CARD_TYPES` 里内联的 `{ en, zh }` 对象，由组件手动 `locale.value === 'zh' ? x.zh : x.en` 取值（见 `getSlotLabel` / `getLabel`）。i18n 表里另有一份 `cardType_*` key，两套并存——改证件文案时留意别只改一处。

- **状态管理 = composables（无 Pinia）**。注意共享范围的区别：
  - `useToast` 的 state（`toasts`）定义在**函数外**，是模块级**单例**，跨组件共享。
  - `useTheme` / `useHistory` 的 state 定义在**函数内**，每次调用都是新实例（见上文"已知状态"里的主题问题）。

- **主题**：深色模式通过 `<html data-theme="dark">` 切换，存 localStorage `theme`；首次访问回退到 `prefers-color-scheme`。所有颜色/间距/圆角/阴影都用 [src/styles/variables.css](src/styles/variables.css) 里的 CSS 变量（`--bg-primary` / `--accent-color` / `--space-*` / `--radius-*` / `--error-bg` …），**不要写死颜色值**。[App.vue](src/App.vue) 的 `handleThemeToggle` 用 View Transitions API 做了圆形扩散动画，过程中会临时注入 style 禁用全局 transition。

- **图标 = `utils/icons.ts` + `<BaseIcon>`**。图标是集中注册的 SVG 内容（`viewBox="0 0 24 24"`，stroke 风格，源自 Lucide/Feather）。用 `<BaseIcon name="copy" :size="16" />` 渲染，`name` 受 `IconName`（`keyof typeof icons`）类型约束。新增图标先加到 `icons.ts`。

- **代码编辑器 = `<CodeMirrorEditor>`**（封装 vue-codemirror / CodeMirror 6）。实际可用 props 只有 `modelValue` / `readonly` / `placeholder`，emits `update:modelValue` + `change`。内部固定挂 `json()`、`lineWrapping`、行号、activeLine 高亮。只有 JSON 与 Diff 视图用它；**Base64 / 时间戳 / 图片工具用的是原生 `<textarea>` 或自定义 UI**。

- **历史记录 = `composables/useHistory.ts`**。`useHistory('editor-key')` 返回 `{ history, hasHistory, addToHistory, removeFromHistory, clearHistory }`，存 localStorage `tool-history-{key}`，上限 50 条、重复内容自动去重并置顶，读写都包了 try/catch（localStorage 满或禁用时静默降级）。

- **提示 = `composables/useToast.ts`**。`showToast(msg, type?, duration?)`，`type` 为 `success|error|info|warning`，默认 3000ms。`<ToastContainer>` 已在 App.vue 挂载一次，各视图直接调 `showToast` 即可。注意**图片工具没走 toast**，用的是原生 `window.confirm` / `alert`。

## 图片工具（`/card`）

代码量最大的一块：[src/views/ImageTool.vue](src/views/ImageTool.vue) 编排状态，6 个子组件在 `src/components/image/`（`CardTypeSelector` / `UploadSlot` / `CropModal` / `WatermarkPanel` / `PreviewArea` / `ActionBar`），全部图像逻辑在纯函数 [src/utils/imageUtils.ts](src/utils/imageUtils.ts) 里。

管线：**上传 → 校验 → 裁剪 → 合成到 A4 → 叠水印 → 导出 PNG**

- `CARD_TYPES` 是证件预设表（身份证/驾驶证为 `sides: 'double'`，其余单面）。选择类型后按 `sides` 生成 1 或 2 个 `ImageSlot`；**切换类型会清空已上传内容**（有 confirm 拦一层）。
- `validateImageFile` 只放行 `image/jpeg` / `image/png`，上限 20MB。
- **A4 画布固定 2480×3508（300 DPI）**，常量 `A4_WIDTH` / `A4_HEIGHT`。`composeOnA4Canvas` 把图放上去：高分辨率源只缩小（保证清晰），低分辨率源允许放大以填满目标区域但**受 `MAX_UPSCALE = 2` 限制**，避免插值糊掉。双面时上半放正面、下半放反面。
- **性能关键点，改预览逻辑时别破坏**：
  - `composeOnA4Canvas` 返回 `HTMLCanvasElement` 而非 Blob，让调用方能继续叠图层，省掉一次 2480×3508 的 encode→decode 往返；`composeOnA4` 才是包一层 `toBlob` 的版本。
  - 水印通过 `createWatermarkOverlay` 单独渲染成透明图层——它只依赖水印配置和画布尺寸，与底图无关，因此 [PreviewArea.vue](src/components/image/PreviewArea.vue) 用 `JSON.stringify(watermark)` 做 key **缓存这个 overlay**，只拖缩放滑块时直接复用，跳过昂贵的平铺绘制。
  - 预览重绘有 80ms debounce。
- 水印平铺密度：`density`（0..1）换算成 `factor = 1.5 + (1 - density) * 26.5`，间距按 `fontSize` 的倍数算，所以不同字号/分辨率下观感一致。
- 裁剪旋转：`cropImage` 在 90/270 度时**输出画布宽高互换**，保证结果是"正"的，注释里写了推导，改之前先读。

## 目录结构

```text
src/
  views/            # 每个工具一个视图组件（JsonEditor / SqlEditor / TimeTool / ImageTool / ...）
  components/base/  # 通用基础组件（BaseIcon / CodeMirrorEditor / ToastContainer）
  components/image/ # 图片工具专用子组件
  composables/      # 逻辑与状态（useTheme / useToast / useHistory）
  utils/            # 纯函数（jsonUtils / diffUtils / imageUtils / icons）
  router/           # vue-router 路由配置
  i18n/             # vue-i18n 国际化配置
  styles/           # 全局样式与 CSS 变量（main.css / variables.css）
  __tests__/        # Vitest 单测
```

路径别名 `@` → `src`（如 `@/composables/useTheme`），在 [vite.config.ts](vite.config.ts) 和 [vitest.config.ts](vitest.config.ts) 里**各配了一份**，改别名要同时改。vite 里用 `manualChunks` 手动分包：`vendor-vue` / `vendor-codemirror` / `vendor-utils`（sql-formatter）/ `vendor`。

## 新增一个工具 Tab（完整步骤）

以加一个 `foo` 工具为例，需改动 5 处：

1. **`src/views/FooTool.vue`** — 新建视图。参考 [SqlEditor.vue](src/views/SqlEditor.vue) 的结构（`useI18n` / `useToast` / `useHistory` / `<CodeMirrorEditor>` / `<BaseIcon>` 的组合方式）。
2. **`src/router/index.ts`** — `routes` 数组加 `{ path: '/foo', name: 'foo', component: () => import('@/views/FooTool.vue') }`（懒加载）。
3. **`src/App.vue`** — `nav-tabs` 加一个 `<router-link to="/foo" class="nav-tab" :class="{ active: activeTab === 'foo' }">`。
4. **`src/i18n/index.ts`** — 在 `en` 和 `zh` 的 `messages` 里都加该工具用到的文案 key。
5. **`src/utils/icons.ts`** — 加导航用的图标。

## 代码风格与测试

- **Prettier**（[.prettierrc.json](.prettierrc.json)）：**无分号、单引号、printWidth 100**。部分早期文件（`useTheme`、`CodeMirrorEditor`、`BaseIcon` 等）仍带分号、尚未统一——新代码请遵循上述配置，必要时 `pnpm run format`。
- **组件**统一 `<script setup lang="ts">`；props/emits 用类型化的 `defineProps<T>()` / `defineEmits<T>()`；样式用 `<style scoped>`，跨组件穿透用 `:deep()`。
- **TS strict + `noUncheckedIndexedAccess` 生效**，所以数组下标取值后到处是 `!`（如 `slots.value[index]!`）——沿用这个写法，别为了去掉 `!` 放宽 tsconfig。
- **测试**用 Vitest + `@vue/test-utils` + jsdom，只收 `src/__tests__/**/*.{test,spec}.*`。业务逻辑尽量抽到 `utils/` 的纯函数里以便单测（`imageUtils` 的校验/预设函数就是这么测的）；组件测试需要 mock `CodeMirrorEditor`、`navigator.clipboard`、`URL.createObjectURL`，并自行注册 i18n 插件（见上文"已知状态"）。

## 规格文档（spec-kit）

`.specify/` 下是 spec-kit 工作流产物，`.codebuddy/commands/speckit.*.md` 是对应命令。改动图片工具前值得先看 [.specify/specs/image-tool/](.specify/specs/image-tool/)（`spec.md` / `plan.md` / `data-model.md` / `contracts/`）和治理文件 [.specify/memory/constitution.md](.specify/memory/constitution.md)——后者把"不引入 Pinia/UI 库/CSS 框架、文案必须走 i18n、颜色必须用 CSS 变量、新增工具遵循 5 步流程"定为强制原则，本文件的约定与其一致。
