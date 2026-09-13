# Material 3 UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将家庭笔记分享网站的后台、设置、分享阅读页和 AI 聊天组件统一改造为简洁商务的 Google Material 3 风格，同时保持现有业务接口和路由不变。

**Architecture:** 保留现有 React 页面与 CSS 文件边界，在 `client/src/index.css` 建立单一 Material 3 token 层；`NotesShell` 负责桌面固定侧栏、顶部应用栏和移动顶部栏；各页面只负责内容语义和状态。AI 组件继续作为可嵌入组件，不新增 AI 路由或服务端能力。

**Tech Stack:** React 19、TypeScript、Vite、Wouter、Lucide React、Tailwind/shadcn 现有组件、CSS custom properties、Vitest、pnpm。

## Global Constraints

- 全站使用统一的钴蓝与冷灰蓝 token，且不存在无理由的第二品牌色。
- 页面与面板使用带色相的近中性颜色，不使用纯白或纯黑。
- 桌面端保留 240px 固定左侧导航，导航自身在内容超出高度时独立滚动。
- 移动端隐藏侧栏，使用固定顶部应用栏；分享阅读页不继承后台侧栏。
- 内容卡片使用 16px 圆角，小型控件与输入框使用 12px 圆角；移动触控目标至少 44px。
- 字体使用 Roboto 优先，标题、正文与数字使用同一无衬线体系；元数据可使用等宽字体。
- 只保留按钮按压、抽屉、弹窗、骨架屏和状态变化等反馈动效；减弱动态模式下呈现终态。
- 不新增生成或下载的视觉图片；图片区域只显示用户上传的家庭照片和已有内容。
- 保持现有路由、REST 接口、认证、分享访问控制、SSE、文件存储、MySQL schema 和 Docker 配置不变。
- 真实数据缺失时显示骨架屏、空状态或 `—`，不得继续展示无来源的模拟业务统计。
- 每个任务独立运行相关测试、类型检查或构建，并完成一次 Conventional Commit 与 `origin/main` 推送。

---

### Task 1: 建立 Material 3 全局设计 token

**Files:**
- Modify: `client/src/index.css:1-35`
- Create: `server/layout/material3Tokens.test.ts`

**Interfaces:**
- Produces CSS variables `--page`, `--surface`, `--surface-2`, `--border`, `--ink-1`, `--ink-2`, `--ink-3`, `--primary`, `--primary-soft`, `--on-primary`, `--success`, `--danger`, `--warning`, `--radius-card`, `--radius-control`, `--shadow-card` for every later page.
- Keeps existing semantic class names available so page tasks can migrate styles incrementally.

- [ ] **Step 1: Write the failing token contract test**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(import.meta.dirname, "../../client/src/index.css"), "utf8");

describe("Material 3 design tokens", () => {
  it("defines the single cool-slate and cobalt palette", () => {
    expect(css).toContain("--primary: #2D5BD8");
    expect(css).toContain("--page: #ECEFF3");
    expect(css).toContain("--surface: #FBFCFE");
    expect(css).toContain("--radius-card: 16px");
    expect(css).toContain("--radius-control: 12px");
  });

  it("does not use pure white or black as global page tokens", () => {
    expect(css).not.toMatch(/--(?:page|surface|ink-[123]):\s*#(?:fff|ffffff|000|000000)\b/i);
  });
});
```

- [ ] **Step 2: Run the token test and verify it fails**

Run: `corepack pnpm vitest run server/layout/material3Tokens.test.ts`

Expected: FAIL because the current stylesheet has `--ink`, `--paper` and no Material 3 token contract.

- [ ] **Step 3: Implement the token layer and global reset**

At the beginning of `client/src/index.css`, replace the current warm-paper variables and font import with the following contract, retaining the existing Tailwind imports after the font import:

```css
@import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap");
@import "tailwindcss";
@import "tw-animate-css";

:root {
  --page: #eceff3;
  --surface: #fbfcfe;
  --surface-2: #f3f6fa;
  --surface-3: #e7edf5;
  --border: rgba(35, 39, 47, 0.12);
  --ink-1: #23272f;
  --ink-2: #454e5e;
  --ink-3: #6f7c91;
  --primary: #2d5bd8;
  --primary-soft: rgba(45, 91, 216, 0.11);
  --on-primary: #fbfcfe;
  --success: #2f7a55;
  --danger: #b8443f;
  --warning: #b77a16;
  --radius-card: 16px;
  --radius-control: 12px;
  --shadow-card: 0 1px 3px rgba(35, 39, 47, 0.06);
  --shadow-floating: 0 24px 56px rgba(35, 39, 47, 0.16);
}

html { background: var(--page); overflow-x: clip; }
body {
  margin: 0;
  color: var(--ink-1);
  background: var(--page);
  font-family: "Roboto", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow-x: clip;
}
```

Update base buttons, links, focus rings, cards and headings to consume tokens rather than literal warm colors. Keep existing class names during this task so the site remains renderable while later tasks replace page-specific rules.

- [ ] **Step 4: Run the token test and type check**

Run: `corepack pnpm vitest run server/layout/material3Tokens.test.ts` and `corepack pnpm check`

Expected: PASS with the new token contract and no TypeScript errors.

- [ ] **Step 5: Commit and push**

```powershell
git add client/src/index.css server/layout/material3Tokens.test.ts
git commit -m "style: establish material 3 design tokens"
git push origin main
```

### Task 2: 重构后台壳层、固定侧栏和应用栏

**Files:**
- Modify: `client/src/components/NotesShell.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/index.css`
- Test: `server/layout/sideRail.test.ts`

**Interfaces:**
- `AdminFrame({ children, eyebrow, title, action })` remains the public page shell API.
- `SideRail` continues to render Wouter links and keeps the existing active-route behavior.
- Adds `#main-content` as the skip-link target without changing route paths.

- [ ] **Step 1: Extend the existing shell regression test before changing the shell**

Add these assertions to `server/layout/sideRail.test.ts`:

```ts
expect(sideRailRule).toContain("position: sticky");
expect(sideRailRule).toContain("top: 0");
expect(sideRailRule).toMatch(/height:\s*100dvh/);
expect(stylesheet).toContain(".app-topbar");
expect(stylesheet).toContain(".skip-link");
```

- [ ] **Step 2: Run the shell test and verify the new assertions fail**

Run: `corepack pnpm vitest run server/layout/sideRail.test.ts`

Expected: FAIL on the missing `.app-topbar` and `.skip-link` selectors.

- [ ] **Step 3: Implement the shell structure**

In `AdminFrame`, place the skip link before `SideRail`, keep `MobileHeader`, and change the main element to:

```tsx
<a className="skip-link" href="#main-content">跳转到主要内容</a>
<main id="main-content" className="app-main">
  <header className="app-topbar">
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
    </div>
    {action && <div className="app-topbar__actions">{action}</div>}
  </header>
  {children}
</main>
```

Keep the existing `page-header` selector as a compatibility alias only if a page still references it. Define the desktop rail with `position: sticky; top: 0; height: 100dvh; align-self: flex-start; overflow-y: auto`, a 240px width, and a visible keyboard focus ring. Add a compact mobile top bar inside `MobileHeader` and hide the rail below 760px.

- [ ] **Step 4: Run test, type check and build**

Run: `corepack pnpm vitest run server/layout/sideRail.test.ts`, `corepack pnpm check`, `corepack pnpm build`

Expected: all selected tests pass, TypeScript exits 0, and Vite/esbuild produce `dist/public` and `dist/index.js`.

- [ ] **Step 5: Commit and push**

```powershell
git add client/src/components/NotesShell.tsx client/src/App.tsx client/src/index.css server/layout/sideRail.test.ts
git commit -m "style: refine material app shell navigation"
git push origin main
```

### Task 3: 将首页改成清晰的概览信息层级

**Files:**
- Modify: `client/src/pages/AdminDashboard.tsx`
- Modify: `client/src/index.css`

**Interfaces:**
- Keeps `AdminDashboard` local publish, copy-link, toast and composer behavior.
- `AdminFrame` remains the only shell wrapper.
- Existing `api` calls and note upload behavior are untouched.

- [ ] **Step 1: Replace the decorative welcome block with semantic overview markup**

Use a compact overview header with one primary action and a status summary:

```tsx
<section className="overview-strip" aria-labelledby="overview-title">
  <div>
    <p className="section-kicker">今日概览</p>
    <h2 id="overview-title">把想说的话，留在这里。</h2>
    <p>记录一段文字或一张图片，家人会在分享空间里看到。</p>
  </div>
  <div className="overview-strip__status">
    <LivePill text="空间正常" />
    <span>最近更新：等待数据</span>
  </div>
</section>
```

Remove the hard-coded `24`、`6`、`12` statistics. Until a real summary endpoint exists, the page must show `—` or an explicit empty state instead of inventing counts.

- [ ] **Step 2: Rework dashboard sections around content priority**

Keep the existing note composer as the single primary action. Place recent notes in the wide column; move sharing status, recent activity and image memories to an auxiliary column/row. Use real `notes.length` only for the locally created notes list, and label it as local pending content if the server list has not been loaded.

- [ ] **Step 3: Add Material surfaces and state styles**

Replace warm gradients and decorative sun styles with `.overview-strip`, `.panel`, `.section-title`, `.compose-option`, `.note-row` and `.activity-row` rules that use `var(--surface)`, `var(--surface-2)`, `var(--primary-soft)`, `var(--border)`, `var(--radius-card)` and `var(--shadow-card)`. Keep the existing photo tile gradients only as content placeholders until real uploaded image URLs are available; do not introduce new image assets.

- [ ] **Step 4: Verify dashboard behavior**

Run: `corepack pnpm check` and `corepack pnpm build`. Start the local server with `NODE_ENV=development`, `PORT=3310`, then request `http://127.0.0.1:3310/health` and `http://127.0.0.1:3310/` to confirm the refactored page still serves.

- [ ] **Step 5: Commit and push**

```powershell
git add client/src/pages/AdminDashboard.tsx client/src/index.css
git commit -m "style: simplify dashboard overview"
git push origin main
```

### Task 4: 补齐首页的加载、空数据和反馈状态

**Files:**
- Modify: `client/src/pages/AdminDashboard.tsx`
- Modify: `client/src/components/DashboardLayoutSkeleton.tsx`
- Modify: `client/src/index.css`
- Create: `server/layout/dashboardStates.test.ts`

**Interfaces:**
- Adds presentational `MetricValue` and `DashboardState` helpers local to the client; no server API is added.
- Existing toast messages remain `aria-live="polite"` and existing composer callbacks remain unchanged.

- [ ] **Step 1: Write the failing source contract test**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync(path.resolve(import.meta.dirname, "../../client/src/pages/AdminDashboard.tsx"), "utf8");

describe("dashboard truthful states", () => {
  it("does not ship the old fake overview counters", () => {
    expect(dashboard).not.toContain("<strong>24</strong>");
    expect(dashboard).not.toContain("<strong>6</strong>");
    expect(dashboard).not.toContain("<strong>12</strong>");
  });

  it("exposes accessible live feedback", () => {
    expect(dashboard).toContain('aria-live="polite"');
  });
});
```

- [ ] **Step 2: Run the state test and verify it fails**

Run: `corepack pnpm vitest run server/layout/dashboardStates.test.ts`

Expected: FAIL because the old counters are still present and the toast has no `aria-live` attribute.

- [ ] **Step 3: Implement truthful state rendering**

Add small local helpers:

```tsx
function MetricValue({ value }: { value: number | null }) {
  return <strong className="metric-value">{value === null ? "—" : value}</strong>;
}
```

Use `MetricValue` with `null` for metrics that have no current API source, add `.dashboard-empty` for empty note/activity/photo areas, add `aria-live="polite"` to the toast, and make the loading skeleton match the final card geometry rather than a centered spinner.

- [ ] **Step 4: Run state tests, full tests and type check**

Run: `corepack pnpm vitest run server/layout/dashboardStates.test.ts`, `corepack pnpm test`, `corepack pnpm check`

Expected: all tests pass and TypeScript exits 0.

- [ ] **Step 5: Commit and push**

```powershell
git add client/src/pages/AdminDashboard.tsx client/src/components/DashboardLayoutSkeleton.tsx client/src/index.css server/layout/dashboardStates.test.ts
git commit -m "feat: add truthful dashboard states"
git push origin main
```

### Task 5: 将空间设置页统一为 Material 设置分组

**Files:**
- Modify: `client/src/pages/Settings.tsx`
- Modify: `client/src/index.css`

**Interfaces:**
- Keeps `Settings` toggle, copy, toast and archive callbacks.
- Keeps existing links to `/admin` and `/share/demo`.

- [ ] **Step 1: Group settings by user intent**

Use three named sections with `section`/`h2` pairs: `分享权限`, `访问密码`, `评论与通知`. Keep each setting row as a label, supporting explanation, current state and action; add `aria-describedby` where a control depends on explanatory text.

- [ ] **Step 2: Replace decorative side illustration with an information aside**

Use the aside for privacy status, the share preview action and a short recovery tip. It must use the same `--surface`/`--surface-2` hierarchy and must not introduce a second brand accent.

- [ ] **Step 3: Implement form and destructive states**

Add visible `:focus-visible` rings, `aria-pressed` to toggle buttons, `role="status"` to the copy feedback, and a separated archive action with a clear confirmation affordance. Keep password input labels visible and preserve the existing `type="password"` behavior.

- [ ] **Step 4: Run page verification**

Run: `corepack pnpm check`, `corepack pnpm build`, and `corepack pnpm test`. Confirm `/admin/settings` is included in the production build and no route imports are removed.

- [ ] **Step 5: Commit and push**

```powershell
git add client/src/pages/Settings.tsx client/src/index.css
git commit -m "style: organize settings into material sections"
git push origin main
```

### Task 6: 统一分享访问页和错误页

**Files:**
- Modify: `client/src/pages/ShareAccess.tsx`
- Modify: `client/src/pages/ShareSpace.tsx`
- Modify: `client/src/index.css`

**Interfaces:**
- Keeps `ShareAccess({ token, onUnlocked })` and the existing `ApiError` handling.
- Keeps `ShareSpace` loading, password unlock, comments and SSE status behavior.

- [ ] **Step 1: Give access and failure states one Material form contract**

Keep labels above inputs, add `aria-invalid={Boolean(error)}` and `aria-describedby="share-password-error"`, and make the error paragraph use that id. The submit button must show the current pending state and remain at least 44px high.

- [ ] **Step 2: Simplify the standalone share header**

Use a 64px top bar with the space name, live status, share action and overflow action. Keep the header sticky at `top: 0`; do not add the admin side rail to the public page.

- [ ] **Step 3: Replace warm-paper access and error surfaces**

Use `--page`, `--surface`, `--surface-2`, `--primary`, `--danger` and the shared radius/shadow tokens. Keep actual uploaded images and content unchanged; only the containing surfaces and typography change.

- [ ] **Step 4: Verify public routes**

Run: `corepack pnpm check`, `corepack pnpm build`, and `corepack pnpm test`. Request `/share/demo` from the local server and verify the response is not a 500 even when the demo token has no database record.

- [ ] **Step 5: Commit and push**

```powershell
git add client/src/pages/ShareAccess.tsx client/src/pages/ShareSpace.tsx client/src/index.css
git commit -m "style: unify public share surfaces"
git push origin main
```

### Task 7: 将分享时间线改成可阅读的内容流

**Files:**
- Modify: `client/src/pages/ShareSpace.tsx`
- Modify: `client/src/index.css`

**Interfaces:**
- Preserves `Comment`, `useSpaceEvents`, comment submission and unread update behavior.
- Keeps note, image and comment content in their current data shapes.

- [ ] **Step 1: Define the content hierarchy in markup**

Each entry must expose author, time, content type, title/body, media, actions and comments in that order. Use `article` headings and `aria-label` on icon-only actions. Keep the live update banner dismissible and keyboard reachable.

- [ ] **Step 2: Implement Material timeline surfaces**

Replace the rotated paper and ornamental sun treatment with a stable content card: `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-card)`, `box-shadow: var(--shadow-card)`. Keep the timeline connector as a single low-contrast rule and use `--primary-soft` for the type chip.

- [ ] **Step 3: Improve comment composer states**

Make the input label available to assistive technology, keep the send button at least 44px, use `aria-live="polite"` for successful sends, and preserve the existing failure toast when the API request fails.

- [ ] **Step 4: Run share-flow checks**

Run: `corepack pnpm test`, `corepack pnpm check`, `corepack pnpm build`. Confirm the existing manual flow document `tests/e2e/share-flow.manual.md` still matches the visible access, timeline and comment controls.

- [ ] **Step 5: Commit and push**

```powershell
git add client/src/pages/ShareSpace.tsx client/src/index.css
git commit -m "style: clarify share timeline content"
git push origin main
```

### Task 8: 将 AIChatBox 统一为 Material 3 辅助面板

**Files:**
- Modify: `client/src/components/AIChatBox.tsx`
- Modify: `client/src/index.css`

**Interfaces:**
- Keeps `AIChatBoxProps`, `Message`, `onSendMessage`, `isLoading`, `suggestedPrompts` and current markdown rendering.
- Does not add an AI route or change the server LLM integration contract.

- [ ] **Step 1: Normalize the component structure**

Keep a three-part layout: header/status, scrollable conversation region, and fixed bottom composer. Give the component an accessible label through a wrapping heading or `aria-label="家庭 AI 助手"`; preserve the existing `ScrollArea` viewport and auto-scroll behavior.

- [ ] **Step 2: Replace generic utility colors with shared tokens**

Use `.ai-chatbox`, `.ai-chatbox__messages`, `.ai-chatbox__message--user`, `.ai-chatbox__message--assistant`, `.ai-chatbox__composer` and `.ai-chatbox__suggestion` classes. User messages use `--primary`/`--on-primary`; assistant messages use `--surface-2`/`--ink-1`; loading uses a skeleton row and the existing spinner only inside the send control or current response indicator.

- [ ] **Step 3: Ship all component states**

Verify empty state, suggested prompt, user message, assistant markdown, loading, disabled send, long message wrapping and error handoff. Keep the textarea label/placeholder relationship accessible and retain Enter-to-send with Shift+Enter for a newline.

- [ ] **Step 4: Run component verification**

Run: `corepack pnpm check`, `corepack pnpm build`, and `corepack pnpm test`. Confirm no `AIChatBoxProps` call site breaks.

- [ ] **Step 5: Commit and push**

```powershell
git add client/src/components/AIChatBox.tsx client/src/index.css
git commit -m "style: align ai chat with material surfaces"
git push origin main
```

### Task 9: 响应式、键盘和视觉一致性收口

**Files:**
- Modify: `client/src/index.css`
- Modify: `server/layout/sideRail.test.ts`
- Create: `server/layout/responsiveRules.test.ts`

**Interfaces:**
- Keeps one desktop sticky rail and one mobile sticky top bar; no second competing sticky navigation is introduced.
- Responsive rules are CSS-only and require no runtime layout state.

- [ ] **Step 1: Write the failing responsive contract test**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(import.meta.dirname, "../../client/src/index.css"), "utf8");

describe("responsive Material 3 floor", () => {
  it("prevents horizontal overflow and protects mobile grids", () => {
    expect(css).toContain("overflow-x: clip");
    expect(css).toContain("minmax(0, 1fr)");
    expect(css).toContain("min-width: 0");
  });

  it("keeps touch controls and focus states visible", () => {
    expect(css).toMatch(/min-height:\s*44px/);
    expect(css).toContain(":focus-visible");
    expect(css).toContain("prefers-reduced-motion");
  });
});
```

- [ ] **Step 2: Run the responsive test and verify it fails**

Run: `corepack pnpm vitest run server/layout/responsiveRules.test.ts`

Expected: FAIL on at least one missing mobile-floor or 44px control rule before the final responsive pass.

- [ ] **Step 3: Implement the responsive floor**

At 1050px reduce the rail to 220px and content padding; at 760px hide `.side-rail`, show `.mobile-header`, make `.app-topbar` compact, collapse all dashboard/settings grids to one column, and keep buttons/nav labels on one line. Add `minmax(0, 1fr)` to every image-bearing grid, `min-width: 0` to flexible content children, `overflow-wrap: anywhere` to display headings, and a shared 44px control minimum.

Use exactly one `position: sticky; top: 0` rail/header rule per shell and retain `@media (prefers-reduced-motion: reduce)` with immediate transitions.

- [ ] **Step 4: Run the full verification set**

Run: `corepack pnpm test`, `corepack pnpm check`, `corepack pnpm build`, and `git diff --check`. Confirm `git status --short` contains only the intended files before committing.

- [ ] **Step 5: Commit and push**

```powershell
git add client/src/index.css server/layout/sideRail.test.ts server/layout/responsiveRules.test.ts
git commit -m "fix: harden responsive material layout"
git push origin main
```

### Task 10: 完成 finesse 设计记录与最终验收

**Files:**
- Modify: `client/src/index.css`
- Create: `.finesse/log.json`
- Modify: `docs/acceptance-checklist.md`

**Interfaces:**
- Records the approved product direction for future UI iterations; it does not affect runtime behavior.
- Acceptance notes distinguish local checks from pending real MySQL/OAuth/Docker and production validation.

- [ ] **Step 1: Stamp the approved design direction in CSS**

Make the first non-empty line of `client/src/index.css`:

```css
/* finesse · register=product · A=cool-slate+cobalt · B=Roboto-system · C=sidebar+appbar · D=feedback-only · E=material-surfaces · SOUL=5 SPECTACLE=2 DENSITY=7 */
```

- [ ] **Step 2: Record the build in `.finesse/log.json`**

Create a JSON array with the current build at the front:

```json
[
  {
    "date": "2026-09-14",
    "register": "product",
    "palette": "cool-slate+cobalt",
    "type": "Roboto-system",
    "layout": "sidebar+appbar",
    "motion": "feedback-only",
    "material": "material-surfaces",
    "soul": 5,
    "spectacle": 2,
    "density": 7
  }
]
```

Keep no more than 20 entries when future builds append to this file.

- [ ] **Step 3: Update acceptance notes**

Record that the Material 3 UI checks, local health endpoint, tests, type check and production build were run. Keep the existing explicit gaps for real MySQL/OAuth credentials, Docker daemon/container startup, full browser E2E and real-device verification; do not mark production deployment complete.

- [ ] **Step 4: Run the final pre-flight**

Run:

```powershell
corepack pnpm test
corepack pnpm check
corepack pnpm build
git diff --check
git status --short
```

Expected: all tests pass, TypeScript and build exit 0, no whitespace errors, and only the intended design-record files remain before commit.

- [ ] **Step 5: Commit and push**

```powershell
git add client/src/index.css .finesse/log.json docs/acceptance-checklist.md
git commit -m "docs: record material 3 ui acceptance"
git push origin main
```

## Execution Handoff

该计划需要按 Task 1 → Task 10 顺序执行，因为每一步都复用前一步的 token、壳层或页面状态，并且每一步都独立提交和推送。执行时优先在本地验证，所有 MySQL/OAuth、Docker 和云服务器上线工作继续留到本地验收通过之后。
