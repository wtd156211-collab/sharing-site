# 原版蓝色文件夹笔记交互 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `Folder-blue.txt` 的原版 SVG/motion 文件夹效果接入 Dashboard，让真实笔记按类型显示数量，文件夹内的每条笔记都可打开详情弹窗。

**Architecture:** 新增 `Folder.tsx` 作为原版视觉组件边界，使用 `motion/react` 保留原组件的动画参数、SVG path 和三张 Card 层叠。`AdminDashboard` 负责按 `note.type` 分组、传入卡片回调并管理详情弹窗；CSS 只补容器和 Material 3 弹窗样式，不重画文件夹。

**Tech Stack:** React 19、TypeScript、`motion`（`motion/react`）、lucide-react、现有 Material 3 CSS token、Vitest。

## Global Constraints

- 原版蓝色文件夹的 SVG path、三张浮动卡片、悬停预览和 spring 参数必须保留。
- 笔记计数只能来自分组后的真实 `notes.length`，不得把演示卡片数量当成笔记数量。
- 详情弹窗必须支持关闭按钮、遮罩点击、Escape、`role="dialog"`、`aria-modal="true"` 和可见标题关联。
- `prefers-reduced-motion: reduce` 下动画立即完成；文件夹和笔记卡片必须可键盘聚焦。
- 只在本地修改和验证；不触碰 MySQL、云服务器或生产部署。
- 每个任务完成后运行该任务的测试/检查并提交、推送一次。

---

### Task 1: 接入原版文件夹组件与 motion 依赖

**Files:**
- Create: `client/src/components/Folder.tsx`
- Modify: `package.json`, `pnpm-lock.yaml`
- Create: `server/layout/folderNote.test.ts`

**Interfaces:**
- `Folder` props: `color?: "black" | "white" | "blue"`, `size?: "sm" | "md" | "lg"`, `cards?: FolderCard[]`, `onCardClick?: (card: FolderCard) => void`, plus normal `div` props。
- `FolderCard`: `{ id: number | string; title: string; onClick?: () => void }`。
- Produces an importable `Folder` component that later tasks render inside Dashboard.

- [ ] **Step 1: Write the failing contract test**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.resolve(import.meta.dirname, "../../client/src/components/Folder.tsx"), "utf8");

describe("original folder component contract", () => {
  it("keeps the supplied SVG path and motion/react API", () => {
    expect(source).toContain("M0 25C0 11.1929");
    expect(source).toContain('from "motion/react"');
    expect(source).toContain("rotateX");
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `corepack pnpm vitest run server/layout/folderNote.test.ts`

Expected: FAIL because `Folder.tsx` does not exist yet.

- [ ] **Step 3: Add the dependency and migrate the component**

Run: `corepack pnpm add motion`

Copy the supplied `themes`, `sizeScales`, `BASE_WIDTH`, `BASE_HEIGHT`, `FLAP_PATH`, `Card` SVG and spring transitions into `Folder.tsx`. Replace the demo-only internal state with these exact interfaces while retaining:

```tsx
const [isHovered, setIsHovered] = useState(false);
const [isOpen, setIsOpen] = useState(false);
// original spring values: stiffness 120, damping 13/14
```

Wrap each supplied Card in a keyboard-focusable `<button type="button">`; when a supplied `FolderCard` exists, call its `onClick` and expose `aria-label={card.title}`. Keep the original `blue` theme as the Dashboard default.

- [ ] **Step 4: Run the focused test and type check**

Run: `corepack pnpm vitest run server/layout/folderNote.test.ts` and `corepack pnpm check`

Expected: the contract test passes and TypeScript exits 0.

- [ ] **Step 5: Commit and push**

```powershell
git add client/src/components/Folder.tsx server/layout/folderNote.test.ts package.json pnpm-lock.yaml
git commit -m "feat: add original animated folder component"
git push origin main
```

### Task 2: 用真实笔记生成文件夹和数量

**Files:**
- Modify: `client/src/pages/AdminDashboard.tsx`
- Modify: `server/layout/folderNote.test.ts`

**Interfaces:**
- Add local helper `groupNotesByType(notes: Note[]): Record<NoteType, Note[]>` where `NoteType = "text" | "image"`.
- Dashboard renders exactly two groups: `{ type: "text", label: "文字笔记" }` and `{ type: "image", label: "图片笔记" }`.
- Each group passes `notes.length` to its count badge and at most the first three notes as `FolderCard[]`.

- [ ] **Step 1: Extend the failing contract test**

```ts
it("derives folder labels and counts from note types", () => {
  const dashboard = readFileSync(path.resolve(import.meta.dirname, "../../client/src/pages/AdminDashboard.tsx"), "utf8");
  expect(dashboard).toContain("文字笔记");
  expect(dashboard).toContain("图片笔记");
  expect(dashboard).toContain("notes.length");
  expect(dashboard).toContain("groupNotesByType");
});
```

- [ ] **Step 2: Run the focused test and confirm the new assertions fail**

Run: `corepack pnpm vitest run server/layout/folderNote.test.ts`

Expected: FAIL because the Dashboard still renders one flat `notes-list` without folder grouping.

- [ ] **Step 3: Implement grouping and folder rendering**

Define a `Note` type for the existing note shape, derive groups from `notes`, and replace the flat list inside the recent-notes panel with a `note-folders` grid. Render both groups even when empty:

```tsx
const noteGroups = [
  { type: "text" as const, label: "文字笔记" },
  { type: "image" as const, label: "图片笔记" },
];
const grouped = groupNotesByType(notes);
```

Show each group label and `${grouped[type].length} 条`; pass cards with `id`, `title`, and a callback that sets the selected note. Keep the existing panel footer link.

- [ ] **Step 4: Run tests, check, and build**

Run: `corepack pnpm vitest run server/layout/folderNote.test.ts`, `corepack pnpm check`, `corepack pnpm build`

Expected: focused tests pass, TypeScript and production build exit 0.

- [ ] **Step 5: Commit and push**

```powershell
git add client/src/pages/AdminDashboard.tsx server/layout/folderNote.test.ts
git commit -m "feat: group dashboard notes into folders"
git push origin main
```

### Task 3: 增加笔记详情弹窗和关闭行为

**Files:**
- Modify: `client/src/pages/AdminDashboard.tsx`
- Modify: `server/layout/folderNote.test.ts`

**Interfaces:**
- `selectedNote: Note | null` state; `openNote(note: Note)` sets it; `closeNote()` clears it.
- Dialog title id: `note-detail-title`.

- [ ] **Step 1: Add failing dialog contract assertions**

```ts
it("opens a semantic note detail dialog", () => {
  const dashboard = readFileSync(path.resolve(import.meta.dirname, "../../client/src/pages/AdminDashboard.tsx"), "utf8");
  expect(dashboard).toContain('role="dialog"');
  expect(dashboard).toContain('aria-modal="true"');
  expect(dashboard).toContain("note-detail-title");
  expect(dashboard).toContain("Escape");
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `corepack pnpm vitest run server/layout/folderNote.test.ts`

Expected: FAIL because Dashboard has only the composer dialog and no selected-note dialog.

- [ ] **Step 3: Implement open/close and Escape behavior**

Add `useEffect` that listens for `keydown` only while `selectedNote` is non-null. Render a second dialog with title, type label, time, body (`note.body || "暂无正文"`) and comment count. The backdrop closes only when `event.target === event.currentTarget`; the close button calls `closeNote()` and has `aria-label="关闭笔记详情"`.

- [ ] **Step 4: Run tests and type check**

Run: `corepack pnpm vitest run server/layout/folderNote.test.ts`, `corepack pnpm check`

Expected: all focused tests pass and TypeScript exits 0.

- [ ] **Step 5: Commit and push**

```powershell
git add client/src/pages/AdminDashboard.tsx server/layout/folderNote.test.ts
git commit -m "feat: open notes in detail dialog"
git push origin main
```

### Task 4: 保留原版层次并补齐 Material 3 容器与移动端规则

**Files:**
- Modify: `client/src/index.css`
- Modify: `server/layout/folderNote.test.ts`

**Interfaces:**
- CSS classes: `.note-folders`, `.note-folder-card`, `.note-folder__count`, `.folder-note-list`, `.folder-note-item`, `.note-detail-modal`.

- [ ] **Step 1: Add failing CSS contract assertions**

```ts
it("provides a responsive folder surface without replacing the original animation", () => {
  const css = readFileSync(path.resolve(import.meta.dirname, "../../client/src/index.css"), "utf8");
  expect(css).toContain(".note-folders");
  expect(css).toContain(".note-detail-modal");
  expect(css).toMatch(/@media\\s*\\(max-width:\s*760px\\)[\\s\\S]*\\.note-folders/);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `corepack pnpm vitest run server/layout/folderNote.test.ts`

Expected: FAIL because the new folder and dialog classes have no styling.

- [ ] **Step 3: Add focused CSS**

Use existing tokens: `var(--surface)`, `var(--surface-2)`, `var(--border)`, `var(--primary)`, `var(--radius-card)`. Give each folder card enough height for the original 321×270 composition, keep `overflow: visible`, and avoid clipping the floating cards. Add a compact note list below open folders, 44px minimum controls, visible focus rings, and a single-column `@media (max-width: 760px)` layout. Do not add a gradient or replace the SVG blue theme.

- [ ] **Step 4: Run the complete verification**

Run: `corepack pnpm test`, `corepack pnpm check`, `corepack pnpm build`, `git diff --check`

Expected: all tests pass, TypeScript/build exit 0, and no whitespace errors.

- [ ] **Step 5: Commit and push**

```powershell
git add client/src/index.css server/layout/folderNote.test.ts
git commit -m "style: compose original folders into material dashboard"
git push origin main
```

### Task 5: 最终本地验收与记录

**Files:**
- Modify: `docs/acceptance-checklist.md`

- [ ] **Step 1: Run the final commands**

```powershell
corepack pnpm test
corepack pnpm check
corepack pnpm build
git diff --check
git status --short
```

- [ ] **Step 2: Record only verified facts**

Add a note that original Folder-blue SVG/motion interaction, real note counts, click-to-detail dialog, keyboard Escape and responsive folder layout were locally verified. Keep MySQL/OAuth, Docker daemon/container, full browser E2E, real-device checks and production deployment explicitly unchecked.

- [ ] **Step 3: Commit and push**

```powershell
git add docs/acceptance-checklist.md
git commit -m "docs: record folder note acceptance"
git push origin main
```
