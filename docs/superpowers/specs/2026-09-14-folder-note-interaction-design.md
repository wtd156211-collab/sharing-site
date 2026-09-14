# 文件夹笔记交互设计

## 目标

把 `D:\a\tools\UI组件库\Folder-blue.txt` 中的原版蓝色文件夹组件完整接入拾光笔记 Dashboard。文件夹保留原 SVG 结构、三张浮动卡片、悬停预览、点击打开和弹簧动画；真实笔记数量和内容由当前 Dashboard 的 `notes` 状态驱动。

## 交互与数据

- 在“最近笔记”区域按 `note.type` 分成“文字笔记”和“图片笔记”两个文件夹。
- 每个文件夹标题旁展示该类型真实笔记数量；没有对应笔记时显示 0。
- 文件夹点击后保持原组件的打开动画。最多三条笔记绑定到浮出的三张卡片，卡片使用笔记标题作为可访问名称；超过三条的笔记在文件夹下方显示为紧凑列表，数量不截断。
- 点击任意笔记卡片或列表项打开 Material 风格详情弹窗，展示标题、正文、类型、时间和评论数。
- 新发布的文字/图片笔记立即进入对应文件夹并更新计数；关闭弹窗不改变笔记数据。

## 组件边界

- 新增 `client/src/components/Folder.tsx`：从提供的组件原样迁移 themes、SVG path、Card 结构和 motion 参数，仅把 `motion/react` 作为正式依赖接入，并增加笔记卡片回调与键盘语义。
- 在 `AdminDashboard.tsx` 内新增文件夹分组和选中笔记状态，保留现有发布流程；详情弹窗使用现有项目的 CSS token，不引入第二套视觉系统。
- `index.css` 增加文件夹容器、笔记标签、列表和弹窗样式；文件夹主视觉沿用提供组件的蓝色，不改变全站 Material 3 壳层。

## 动效与可访问性

- 默认保留原组件的 hover/open spring 动画；`prefers-reduced-motion: reduce` 下过渡立即完成。
- 文件夹和笔记卡片使用可聚焦按钮语义，提供中文 `aria-label`；弹窗使用 `role="dialog"`、`aria-modal`、标题关联和 Escape 关闭。
- 点击遮罩或关闭按钮可退出弹窗；焦点样式使用项目统一 `:focus-visible` token。

## 错误与边界

- `notes` 为空时仍显示两个文件夹和 0 条计数，文件夹内显示空状态，不伪造内容。
- 备注正文为空时弹窗显示“暂无正文”，图片笔记保留图片类型和现有占位语义。
- 不把文件夹组件的演示卡片数量当成笔记数量；计数始终来自分组后的 `notes.length`。

## 验证

- 新增静态契约测试，确认原版 SVG path、`motion/react` 依赖适配、文件夹计数与详情弹窗语义存在。
- 运行 `corepack pnpm test`、`corepack pnpm check`、`corepack pnpm build` 和 `git diff --check`。
- 只在本地验证；不触碰 MySQL、云服务器或生产部署。
