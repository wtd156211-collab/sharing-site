# 拾光笔记

家庭笔记分享网站：管理者发布文字和图片，家人通过受保护的链接查看、评论并实时同步更新。

## 当前状态

项目正在按 `docs/superpowers/plans/2026-09-13-family-notes-share.md` 分阶段开发。数据库已确定使用 MySQL；部署目标为已安装 Docker Compose 的 Ubuntu 云服务器。

## 本地开发

工作区需要 Node.js 24、Corepack 和 pnpm 10.4.1：

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm check
corepack pnpm test
corepack pnpm build
corepack pnpm dev
```

复制 `.env.example` 为 `.env` 后再启动服务。没有配置 `DATABASE_URL` 时，开发环境可以启动页面和基础路由，但业务数据接口需要 MySQL。

## 数据库

生产和测试环境使用 MySQL。数据库迁移命令为：

```powershell
corepack pnpm db:push
```

请在运行迁移前确认 `DATABASE_URL` 指向目标数据库；不要把密码、令牌或对象存储密钥写入仓库。

## Docker 部署

部署配置会在后续阶段加入 `Dockerfile`、`docker-compose.yml` 和反向代理配置。生产环境只应对外开放 80/443，MySQL 和上传目录使用独立的受保护存储。

## Git 约定

每个开发任务完成后先运行任务对应的测试、类型检查和构建，再使用 Conventional Commits 提交并推送到 `origin/main`。`.env*`、`node_modules`、构建产物和运行日志禁止提交。
