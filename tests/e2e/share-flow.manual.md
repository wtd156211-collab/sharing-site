# 分享流程手工冒烟脚本

1. 在 `.env` 配置本地 MySQL、`JWT_SECRET` 和 Manus OAuth 后运行 `corepack pnpm db:push`、`corepack pnpm dev`。
2. 用管理员账号请求 `POST /api/admin/spaces`，保存响应中的一次性 `shareUrl`，确认数据库 `shareTokenHash` 不是明文 token。
3. 无密码空间：请求 `GET /api/share/<token>` 和 `/entries`，确认状态 200；把 token 改一位，确认 404。
4. 在管理端设置密码后，未带访问 Cookie 请求元数据应为 401/PASSWORD_REQUIRED；`POST /unlock` 后确认 `Set-Cookie` 含 `HttpOnly`、`SameSite=Lax`，再请求 entries。
5. 使用 `Content-Type: image/jpeg` 上传合法图片；重复测试错误 MIME、错误扩展名、超过 10 MB 和超尺寸文件，确认均为 400。
6. 在两个浏览器窗口打开同一分享链接，一端发布文字或评论，另一端确认无需刷新出现“有新内容”；断开网络后恢复，确认 `/sync?afterEventId=` 不重复事件。
7. 关闭评论后重复评论请求应为 403；发送 `<script>alert(1)</script>`，确认页面按纯文本显示。
8. 执行备份脚本与恢复演练脚本，记录 `docs/acceptance-checklist.md` 和 `scripts/backup-restore.test.md` 中的结果。
