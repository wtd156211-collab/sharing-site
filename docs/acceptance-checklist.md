# 拾光笔记验收清单

## 本地自动化证据

- [x] `corepack pnpm install --frozen-lockfile`
- [x] `corepack pnpm test`（当前 39 个测试通过，包含 Material 3 响应式契约）
- [x] `corepack pnpm check`
- [x] `corepack pnpm build`
- [x] `docker compose config`（使用临时环境变量，未写入 `.env`）
- [ ] `docker compose build` 与容器 `/health`（等待 Docker Desktop Linux daemon 启动）

## Material 3 界面改版验收

- [x] 冷灰底色、Cobalt 主色、Roboto/Roboto Mono 字体 token 已统一落地
- [x] 管理端侧栏 + 顶栏、公开分享页、设置页、时间线和 AI 助手已统一为 Material surface/card 体系
- [x] 桌面侧栏保持固定，窄屏折叠为移动顶栏；概览区和主要栅格在 760px 以下收为单列
- [x] 键盘 `:focus-visible`、跳转主内容、`aria-live` 状态反馈、44px 触控目标和 `prefers-reduced-motion` 已加入
- [x] `server/routes/health.test.ts` 健康路由契约测试通过；未宣称真实容器健康检查完成

## 功能验收（需要本地 MySQL 与 Manus OAuth 配置）

- [ ] 管理员登录后创建、修改、暂停、归档空间
- [ ] 创建/重置链接后旧链接立即失效，原始 token 不出现在日志或数据库明文
- [ ] 正确、错误、过期、暂停、归档链接分别得到预期 200/404/410
- [ ] 密码空间未解锁只返回密码提示，解锁后短期 HttpOnly 会话可读
- [ ] 文字、单图、多图上传；非图片、扩展名不匹配、超过 10 MB、超尺寸图片被拒绝
- [ ] 评论开关、纯文本 XSS、回复跨空间校验、管理员删除
- [ ] 两个浏览器窗口验证 SSE 新内容提示、断线重连和 `afterEventId` 补偿

## 安全与运维验收

- [ ] 修改 space/entry/comment ID 不能越权
- [ ] 登录、评论、上传超过频率返回 429
- [ ] 检查 CSP、`X-Content-Type-Options`、`Referrer-Policy` 和 HTTPS
- [ ] 执行 `scripts/backup-db.ps1`、`scripts/backup-uploads.ps1` 与 `scripts/restore-drill.ps1`
- [ ] 备份异机、加密、保留 14 天，并记录恢复耗时

## 真实设备验收

- [ ] Android 真机拍照上传、图片加载和断线恢复
- [ ] iPhone 真机拍照上传、图片加载和响应式布局

自动化浏览器依赖尚未安装，因此当前保留等价手工步骤；真实设备和线上部署必须在本地 Docker/MySQL 验收完成后进行。
