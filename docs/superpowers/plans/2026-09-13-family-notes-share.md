# 家庭笔记分享网站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 React/TypeScript 前端原型上，交付一个单体 Node.js 家庭笔记分享网站：管理者发布文字和图片，家人通过不可猜测的链接查看、评论并实时收到更新。

**Architecture:** 保留当前 Vite + React + TypeScript 前端和 Express/Node.js 服务端骨架；业务接口采用文档约定的 REST 路径，现有 tRPC 仅继续承载 Manus OAuth 兼容能力。Drizzle ORM 负责 MySQL/MariaDB 兼容的数据模型和迁移，图片通过可替换的 S3/本地存储适配器保存，SSE 负责单进程实时广播，后续多实例时再评估 Redis/数据库通知。

**Tech Stack:** React 19、TypeScript 5.9、Vite 7、Express 4、Drizzle ORM、MySQL2、Zod、SSE、S3 兼容对象存储、Docker Compose、Caddy/Nginx、Vitest。

## Global Constraints

- 第一版采用单体 Web 应用，不引入微服务、消息队列、独立搜索集群或复杂权限中心。
- 页面必须覆盖管理端、分享查看端、移动端响应式布局；沿用现有“暖米白 + 墨蓝 + 橙色”视觉基线，不另起一套设计系统。
- 第一版功能：分享空间、随机分享链接、启停/重置链接、可选密码和失效时间、文字/图片笔记、评论/回复、删除/隐藏、SSE 实时更新、管理登录、健康检查、日志和备份脚本。
- 第一版不实现：多人复杂账号体系、全文搜索、富文本编辑、AI 摘要、OCR、微信小程序、离线编辑、细粒度成员权限和多租户 SaaS。
- 单张图片上限 10 MB；仅允许 JPG、PNG、WEBP；服务端重新检查 MIME、扩展名、文件大小、尺寸和请求频率；处理时移除 EXIF 位置信息。
- 分享令牌使用至少 32 字节随机值的 Base64URL 表示，数据库只保存哈希；重置后旧令牌立即失效；分享页返回 `noindex`。
- 评论按纯文本保存和显示，最多 2,000 字符；所有写接口使用 Zod 校验、权限检查、限流和通用错误响应。
- 密钥、数据库连接串、VAPID 私钥和对象存储凭证只能来自环境变量或部署平台，不得进入 Git。
- 每个开发任务完成后必须：运行该任务的验证命令、形成一个 Conventional Commit，并推送到 `origin/main`；推送失败必须保留错误证据，不伪称已同步。
- 全部功能先在本地开发、测试和 Docker 验证；只有完整验收通过后，才在目标云服务器进行最后部署，不把开发中的代码直接发布到线上。
- 实际数据库类型、管理登录方式、域名、图片存储位置、访问密码和匿名评论规则在阶段 0 确认前不得写死。

## 当前基线与来源区分

- 产品约束来自 `D:/Aiproject/分享网站/家庭笔记分享网站：轻量化完整开发方案.docx`；该文档是规划依据，不是已经执行的命令。
- 用户本轮额外要求是：先审阅分步计划；将 `family-notes-share` 连接到 GitHub 仓库 `https://github.com/wtd156211-collab/sharing-site.git`；每完成一个开发步骤推送一次。
- 当前前端是可交互静态原型：`client/src/pages/AdminDashboard.tsx`、`ShareSpace.tsx`、`Settings.tsx` 使用本地状态和演示数据；`App.tsx` 已有管理页、设置页和 `/share/:token` 路由。
- 当前后端只有 Manus OAuth/tRPC 骨架；`drizzle/schema.ts` 只有 `users` 表；`server/storage.ts` 是 Forge 预签名存储适配器；尚无业务空间、内容、评论、事件表和 REST 路由。
- 当前目录没有 `.git`，也没有现有远程；因此本计划的第一步包含 Git 初始化和远程连接，但本轮只展示计划，不执行连接或推送。

## 开发任务

### Task 0: 边界确认、Git 基线与项目说明

**Files:**
- Create: `README.md`
- Create: `.env.example`
- Create: `docs/architecture.md`
- Include: `docs/superpowers/plans/2026-09-13-family-notes-share.md`

**Interfaces:**
- Produces: 已确认的数据库/存储/登录/评论/域名决策表；Git `main` 分支和 `origin` 远程。

- [ ] **Step 1: 在开发前确认五项边界**：数据库类型与版本及网络可达性、服务器系统与 Docker 状态、域名或先用 IP、S3 或独立数据盘、是否需要分享密码以及评论是否完全匿名。
- [ ] **Step 2: 建立本地 Git 基线**

```powershell
git init
git branch -M main
git remote add origin https://github.com/wtd156211-collab/sharing-site.git
git status --short
```

- [ ] **Step 3: 编写 `README.md` 和 `.env.example`**：写明本地启动、`pnpm check`、`pnpm test`、`pnpm build`、数据库迁移和禁止提交密钥的规则；`.env.example` 只保留变量名和说明。
- [ ] **Step 4: 验证远程可达性并提交推送**

```powershell
git ls-remote origin
git add README.md .env.example docs
git commit -m "chore: initialize project documentation and git baseline"
git push -u origin main
```

验收：GitHub `main` 可看到基线提交；若认证失败，记录原始错误并等待用户完成 GitHub 凭据配置。

### Task 1: 服务基础、环境校验与 REST 框架

**Files:**
- Modify: `server/_core/env.ts`
- Modify: `server/_core/index.ts`
- Create: `server/_core/http.ts`
- Create: `server/routes/health.ts`
- Create: `server/routes/index.ts`
- Test: `server/routes/health.test.ts`

**Interfaces:**
- Produces: `GET /health` 返回 `{ ok: true }`；统一错误结构 `{ error: { code, message } }`；业务路由挂载点 `registerApiRoutes(app)`。

- [ ] **Step 1: 为 `/health` 写失败测试**，断言状态码 200、只返回 `ok` 字段且不泄露环境变量。
- [ ] **Step 2: 将环境变量解析集中到 `ENV`**：增加 `NODE_ENV`、`PORT`、`APP_BASE_URL`、`STORAGE_DRIVER`、`MAX_UPLOAD_MB`，缺少生产必需值时启动失败，开发测试允许无数据库启动。
- [ ] **Step 3: 注册 Express REST 路由和错误处理中间件**：JSON 请求体默认限制改为 2 MB，图片上传路由单独使用 10 MB 限制；错误日志保留服务端细节，响应只返回通用信息。
- [ ] **Step 4: 运行 `pnpm test -- server/routes/health.test.ts`、`pnpm check`、`pnpm build`，修复失败后提交并推送**：`feat: add http foundation and health endpoint`。

### Task 2: 数据模型、迁移和存储适配器

**Files:**
- Modify: `drizzle/schema.ts`
- Modify: `drizzle/relations.ts`
- Modify: `server/db.ts`
- Modify: `server/storage.ts`
- Create: `server/storage/types.ts`
- Create: `server/storage/s3.ts`
- Create: `server/storage/local.ts`
- Create: `server/repositories/spaces.ts`
- Create: `server/repositories/entries.ts`
- Create: `server/repositories/comments.ts`
- Test: `server/repositories/*.test.ts`

**Interfaces:**
- Produces: `users`、`spaces`、`entries`、`attachments`、`comments`、`access_logs`、`space_events` 表及关系；`StorageAdapter.put/getSignedUrl/delete`；仓储层只返回业务 DTO，不返回 token/password 哈希。

- [ ] **Step 1: 先写仓储测试**：空间按 `ownerId` 隔离；内容按 `createdAt` 倒序分页；隐藏/删除内容不出现在公开查询；事件 `id` 可用于断点补偿。
- [ ] **Step 2: 按文档字段建立 Drizzle 表和枚举**：空间状态 `active|paused|archived`，内容类型 `text|image|system`，可见性 `visible|hidden|deleted`；令牌和密码仅保存哈希。
- [ ] **Step 3: 生成迁移并实现 MySQL 仓储**：所有查询使用 Drizzle 条件构造，不拼接 SQL；为 `space_id`、`created_at`、`event_id`、`share_token_hash` 建索引/唯一约束。
- [ ] **Step 4: 抽象图片存储**：保留现有 Forge 适配器作为可选实现；新增 `STORAGE_DRIVER=s3|local`，生成随机对象键，公开接口只返回受权限保护的签名地址。
- [ ] **Step 5: 运行 `pnpm test -- server/repositories`、`pnpm db:push`（配置测试数据库时）、`pnpm check`、`pnpm build`，提交并推送**：`feat: add core data model and storage abstraction`。

### Task 3: 管理者认证与空间管理

**Files:**
- Modify: `server/routers.ts`（保留现有 OAuth/tRPC）
- Modify: `server/_core/context.ts`
- Create: `server/auth/admin.ts`
- Create: `server/routes/admin.ts`
- Create: `client/src/lib/api.ts`
- Create: `client/src/pages/AdminLogin.tsx`（仅在阶段 0 选择独立管理登录时启用）
- Modify: `client/src/pages/AdminDashboard.tsx`
- Modify: `client/src/App.tsx`
- Test: `server/auth/admin.test.ts`、`server/routes/admin.test.ts`

**Interfaces:**
- Produces: `POST /api/admin/login`、`GET /api/admin/spaces`、`POST /api/admin/spaces`、`PATCH /api/admin/spaces/:id`、`POST /api/admin/spaces/:id/reset-link`、`DELETE /api/admin/spaces/:id`；前端 `api.admin.*` typed helpers。

- [x] **Step 1: 根据阶段 0 决策实现管理登录**：复用现有 Manus OAuth 会话并要求 `user.role=admin`；独立密码登录留到后续确有需要时再评估。
- [x] **Step 2: 为管理路由写未登录、非管理员、跨 owner 访问失败测试**，断言 401/403 且响应不含会话、令牌或密码哈希。
- [x] **Step 3: 实现空间 CRUD 和令牌重置**：令牌使用 `crypto.randomBytes(32)` + Base64URL，数据库存 SHA-256 哈希；创建/重置只在管理响应中返回一次原始链接。
- [ ] **Step 4: 将 `AdminDashboard` 的演示状态替换为查询、创建笔记入口和空间统计；保留现有视觉结构**（内容发布入口随 Task 5 接入）。
- [x] **Step 5: 运行相关 Vitest、`pnpm check`、`pnpm build`，提交并推送**：`feat: add admin authentication and space management`。

### Task 4: 分享访问、密码和失效策略

**Files:**
- Create: `server/auth/shareAccess.ts`
- Create: `server/routes/share.ts`
- Create: `client/src/pages/ShareAccess.tsx`（仅在需要密码时显示）
- Modify: `client/src/pages/ShareSpace.tsx`
- Modify: `client/src/pages/Settings.tsx`
- Modify: `client/src/App.tsx`
- Test: `server/auth/shareAccess.test.ts`、`server/routes/share.test.ts`

**Interfaces:**
- Produces: `GET /api/share/:token`、`GET /api/share/:token/entries`；密码验证后的短期 HttpOnly 会话；失效、暂停、归档、错误令牌的明确 404/410/401 行为。

- [x] **Step 1: 写访问矩阵测试**：有效令牌可读；错误/重置前令牌不可读；暂停或过期空间不可读；开启密码时未验证只能得到密码提示；验证会话不能访问其他空间。
- [x] **Step 2: 实现令牌哈希比对和可选密码哈希校验**：Cookie 使用 `HttpOnly`、生产 `Secure`、`SameSite=Lax` 和 12 小时有效期；分享页设置 `X-Robots-Tag: noindex`。
- [x] **Step 3: 将 `ShareSpace` 改为按 URL token 加载空间元数据；密码状态进入 `ShareAccess`，不再在组件内写死分享 token**（完整时间线分页在 Task 5 接入）。
- [x] **Step 4: 运行访问测试和构建，提交并推送**：`feat: add protected share access flow`。

### Task 5: 文字、图片、评论和对话时间线

**Files:**
- Modify: `server/routes/share.ts`
- Create: `server/validation/content.ts`
- Create: `server/services/imageProcessor.ts`
- Create: `server/services/comments.ts`
- Modify: `client/src/pages/AdminDashboard.tsx`
- Modify: `client/src/pages/ShareSpace.tsx`
- Create: `client/src/components/EntryTimeline.tsx`
- Create: `client/src/components/ImageUploader.tsx`
- Test: `server/services/imageProcessor.test.ts`、`server/services/comments.test.ts`、`server/routes/content.test.ts`

**Interfaces:**
- Produces: `POST /api/share/:token/entries`、`POST /api/share/:token/images`、`POST /api/share/:token/comments`、`DELETE /api/admin/entries/:id`、`DELETE /api/admin/comments/:id`；时间线 DTO 仅包含前端所需字段。

- [x] **Step 1: 写输入拒绝测试**：空文字、超过 2,000 字符评论、非图片 MIME、扩展名不匹配、超过 10 MB、超尺寸图片均返回 400；关闭评论返回 403。
- [x] **Step 2: 实现文本和评论服务**：纯文本存储，React 默认转义显示；回复关系校验同属一个空间；管理员删除使用 `deleted` 语义。
- [x] **Step 3: 实现图片处理**：服务端通过 Sharp 读取文件头确认类型，随机化存储键，生成缩略图并在旋转重编码时移除 EXIF；原图接口沿用分享访问检查。
- [ ] **Step 4: 将管理端发布弹窗和分享页时间线接入真实 API；上传显示压缩/上传进度、预览、失败重试；移动端拍照上传使用 `accept="image/*"`**（已提供 API 与上传组件，完整时间线交互在下一轮前端验收补齐）。
- [x] **Step 5: 运行内容/上传测试、`pnpm check`、`pnpm build`，提交并推送**：`feat: add notes images and conversations`。

### Task 6: SSE 实时同步、断线重连和补偿

**Files:**
- Create: `server/realtime/spaceEvents.ts`
- Modify: `server/routes/share.ts`
- Create: `server/routes/events.ts`
- Create: `client/src/hooks/useSpaceEvents.ts`
- Modify: `client/src/pages/ShareSpace.tsx`
- Modify: `client/src/components/NotesShell.tsx`
- Test: `server/realtime/spaceEvents.test.ts`、`server/routes/events.test.ts`

**Interfaces:**
- Produces: `GET /api/share/:token/events`、`GET /api/share/:token/sync?afterEventId=`；事件 `entry.created`、`comment.created`、`comment.replied`、`entry.deleted`、`space.updated`、`sync.ping`；前端 Hook 暴露 `{ status, lastEventId, unreadCount, reconnect }`。

- [x] **Step 1: 写事件测试**：不同空间互不串流；事件 payload 仅保留实体 ID/状态等安全字段。
- [x] **Step 2: 实现单进程连接注册、心跳和广播；SSE 响应设置 `text/event-stream`、禁缓存和连接清理。
- [x] **Step 3: 实现 `afterEventId` 补偿：按事件编号补拉；前端以 `lastEventId` 去重。
- [x] **Step 4: 实现 `useSpaceEvents` 递增重连间隔 1/2/5/10/30 秒、前后台重连和“有新内容”提示；不强制滚动打断阅读。
- [x] **Step 5: 运行事件/路由测试、`pnpm check`、`pnpm build`，提交并推送**：`feat: add sse realtime synchronization`。

### Task 7: 安全加固与反滥用

**Files:**
- Modify: `server/_core/index.ts`
- Modify: `server/routes/admin.ts`
- Modify: `server/routes/share.ts`
- Create: `server/security/rateLimit.ts`
- Create: `server/security/headers.ts`
- Create: `server/security/redaction.ts`
- Test: `server/security/security.test.ts`

**Interfaces:**
- Produces: API 限流、CSP/`X-Content-Type-Options`/`Referrer-Policy` 等安全响应头、脱敏日志和越权/XSS/CSRF 回归测试。

- [x] **Step 1: 写安全回归测试**：覆盖限流、来源校验、安全头和递归日志脱敏；越权与内容接口测试已在前序路由测试覆盖。
- [x] **Step 2: 增加 IP 维度 API 限流；写接口统一使用来源校验，匿名评论仍受空间访问和评论开关约束。
- [x] **Step 3: 增加 CSP、`X-Content-Type-Options`、`Referrer-Policy`、SameSite/HttpOnly 策略和统一错误映射；日志使用 `redact` 清除 token、cookie、密码、Push 字段。
- [x] **Step 4: 运行安全测试、`pnpm check`、`pnpm build`，提交并推送**：`fix: harden sharing and content security`。

### Task 8: Docker、反向代理、备份和可观测性

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `deploy/Caddyfile`
- Create: `scripts/backup-db.ps1`
- Create: `scripts/backup-uploads.ps1`
- Create: `scripts/restore-drill.ps1`
- Modify: `README.md`
- Test: `scripts/backup-restore.test.md`（演练记录模板）

**Interfaces:**
- Produces: `docker compose up -d` 可启动应用；Caddy 只暴露 80/443 并限制上传；`/health` 可供监控；数据库和图片分开备份并可恢复。

- [x] **Step 1: 构建多阶段 Node 镜像**：使用锁文件安装依赖，生产镜像不包含源码密钥；通过环境变量配置数据库和存储。
- [x] **Step 2: 编写 Compose 和 Caddy 配置**：应用仅绑定 `127.0.0.1:3001`，Caddy 使用独立 profile；数据库端口不映射公网；上传目录挂载独立数据卷。
- [x] **Step 3: 编写每日数据库/图片备份和恢复演练脚本**：脚本校验非空备份，生产加密与异机存放策略写入演练模板，记录保留 14 天和恢复耗时。
- [ ] **Step 4: 本地执行 `docker compose config`、镜像构建、容器 `/health` 检查和一次临时目录恢复演练，提交并推送**：`chore: add production deployment and backup tooling`（已完成 config；当前 Docker Desktop Linux daemon 未运行，镜像/容器检查待本地 daemon 可用后补做）。

### Task 9: 端到端验收与试运行

**Files:**
- Create: `tests/e2e/share-flow.spec.ts`（若环境可用则使用 Playwright；否则保留等价手工脚本）
- Create: `docs/acceptance-checklist.md`
- Modify: `README.md`

**Interfaces:**
- Produces: 可追踪的功能、安全、运维和移动端验收证据；失败项带复现步骤和日志位置。

- [ ] **Step 1: 自动化或手工执行功能清单**：清单和手工脚本已建立，完整执行需本地 MySQL、OAuth 与 Docker daemon。
- [x] **Step 2: 执行安全清单**：ID 越权、纯文本 XSS、非图片/超大上传、限流、退出会话和敏感日志已有自动化覆盖或代码审计记录。
- [ ] **Step 3: 执行运维清单**：备份/恢复脚本已提供，重启数据、恢复对应关系、HTTPS 和磁盘告警待 Docker 环境演练。
- [ ] **Step 4: 在真实 Android 和 iPhone 上检查拍照上传、图片加载、响应式布局；区分本地模拟、浏览器自动化和真实设备证据**（待本地完整验收后）。
- [ ] **Step 5: 汇总一周家庭试运行反馈，确认是否需要后续扩展；运行完整 `pnpm test`、`pnpm check`、`pnpm build`，提交并推送**：`test: complete release acceptance checks`（代码验证已通过，真实试运行未开始）。

### Task 10: 后续扩展（不阻塞第一版上线）

**Files:**
- Create when approved: `server/notifications/*`、`client/public/sw.js`、`client/public/manifest.webmanifest`、`client/src/pages/NotificationSettings.tsx`
- Extend when approved: `drizzle/schema.ts` with `push_subscriptions` and `notification_preferences`

**Scope:** 第一版稳定后，按文档顺序实现事件通知偏好、Notifications API、Web Push/VAPID、Service Worker、PWA 和真实 Android/iPhone 验证；不把 Web Push 失败回滚为已保存的笔记/评论，也不在通知载荷中放完整私密正文或原图。

**Trigger:** 只有用户确认试运行需求后才启动；每个扩展仍单独测试、提交和推送。

## 计划自检

- 方案中的第一版功能逐项映射到 Task 2–9；实时同步、断线补偿和通知扩展分别拆开，未把 WebSocket 当作默认依赖。
- 安全章节的令牌、密码、上传、评论、会话、日志、限流和 HTTPS 要求映射到 Task 3、4、5、7、8。
- 方案中的五项部署前确认被放入 Task 0；未确认项不会在代码中硬编码。
- 每个任务都有文件边界、接口产物、验证命令和一次提交/推送点；验收条件均可执行和复现。
