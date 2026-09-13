# 本地依赖安全审计

审计日期：2026-09-13

命令：`corepack pnpm audit --prod`

当前依赖树报告 85 项（10 low、51 moderate、23 high、1 critical），主要来自现有 AWS SDK 的 `fast-xml-parser`、tRPC 11.6、Express 4 的 `path-to-regexp`，以及前端图表/Markdown 依赖的传递包。该结果已记录，未在本阶段进行无关的大版本升级；上线前需逐项确认可升级版本、回归测试和兼容性，并优先修复 critical/high 项。

应用代码已通过：令牌/密码不入日志和响应、统一安全响应头、来源校验、API 限流、图片类型与尺寸校验、分享链接权限检查。
