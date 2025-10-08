# Render 部署文档

欢迎使用 Render 部署指南！本目录包含将 TG Bot Web 应用部署到 Render 所需的所有文档。

## 📚 文档索引

### 快速开始
- **[QUICK_START.md](QUICK_START.md)** - ⚡ 5 分钟快速部署指南
  - 最快的方式部署你的应用
  - 使用 Render Blueprint 自动配置
  - 适合急于上线的场景

### 完整指南
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - 📖 完整部署指南
  - 详细的部署步骤和配置
  - 多种部署方案对比
  - 成本分析和优化建议
  - 故障排查指南

### 数据库迁移
- **[DATABASE_MIGRATION.md](DATABASE_MIGRATION.md)** - 🗄️ SQLite → PostgreSQL 迁移
  - 为什么需要迁移
  - 详细的迁移步骤
  - 本地开发环境配置
  - 数据迁移方法

### 检查清单
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - ✅ 部署检查清单
  - 部署前准备
  - 配置验证
  - 功能测试
  - 监控和维护

### MCP 使用
- **[Render_MCP.md](Render_MCP.md)** - 🤖 Render MCP Server 文档
  - 什么是 MCP
  - 如何配置 MCP
  - 使用示例
  - AI 辅助部署

## 🚀 推荐阅读顺序

### 首次部署
1. [QUICK_START.md](QUICK_START.md) - 快速了解部署流程
2. [DATABASE_MIGRATION.md](DATABASE_MIGRATION.md) - 迁移数据库
3. [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - 检查所有步骤
4. [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - 详细参考

### 已有经验
1. [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - 快速检查
2. [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - 参考特定章节

### 使用 AI 助手
1. [Render_MCP.md](Render_MCP.md) - 配置 MCP
2. 使用自然语言部署

## 🎯 常见场景

### 场景 1: 我想尽快部署测试
→ 阅读 [QUICK_START.md](QUICK_START.md)，使用 Free tier

### 场景 2: 我需要生产级部署
→ 阅读 [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)，选择 Paid plan

### 场景 3: 我在使用 Cursor/Windsurf
→ 阅读 [Render_MCP.md](Render_MCP.md)，使用 AI 辅助部署

### 场景 4: 部署失败了
→ 查看 [DEPLOYMENT_GUIDE.md#故障排查](DEPLOYMENT_GUIDE.md#故障排查)

### 场景 5: 需要数据持久化
→ 阅读 [DEPLOYMENT_GUIDE.md#持久化存储方案](DEPLOYMENT_GUIDE.md#持久化存储方案)

## 📦 项目配置文件

部署所需的配置文件（位于项目根目录）：

- `render-build.sh` - Render 构建脚本
- `render.yaml` - Render Blueprint 配置
- `.env.example` - 环境变量模板
- `requirements.txt` - Python 依赖
- `package.json` - Node.js 依赖
- `prisma/schema.prisma` - 数据库 Schema

## 🔑 关键概念

### Render 服务类型

**Web Service**
- 运行你的 Next.js 应用
- 自动 HTTPS
- 自动 CDN
- 健康检查

**PostgreSQL**
- 托管数据库
- 自动备份
- 高可用性
- 内部连接

**Disk**
- 持久化存储
- 挂载到特定路径
- 按 GB 计费
- 数据保留

### 环境配置

**Development**
- SQLite 数据库（可选）
- 本地 Python 环境
- 完整日志

**Production (Render)**
- PostgreSQL 数据库
- 云端 Python 环境
- 优化日志

### 成本规划

**Free Tier**
- 适合测试
- 有限制（休眠、过期）
- $0/月

**Starter Plan**
- 适合小型生产应用
- 无休眠
- ~$14/月

**Standard Plan**
- 适合中型应用
- 更多资源
- ~$45/月

详见 [DEPLOYMENT_GUIDE.md#成本估算](DEPLOYMENT_GUIDE.md#成本估算)

## 🛠️ 技术栈

### 前端/后端
- Next.js 15 (App Router)
- React 19
- TailwindCSS
- TypeScript

### 数据库
- Prisma ORM
- PostgreSQL (生产)
- SQLite (开发)

### Python 环境
- Python 3.x
- Telethon
- pandas
- 其他依赖见 `requirements.txt`

### 认证
- NextAuth
- JWT
- Cookie-based sessions

## 🔐 安全注意事项

1. **不要提交敏感信息**
   - `.env` 文件已在 `.gitignore`
   - 使用 Render 环境变量管理

2. **使用强密钥**
   - `JWT_SECRET` 应该是强随机字符串
   - `NEXTAUTH_SECRET` 同样如此
   - 生成方法见文档

3. **数据库安全**
   - 使用 Internal Database URL
   - 不要公开数据库凭据
   - 定期更新密码

4. **HTTPS**
   - Render 自动提供 SSL
   - 强制使用 HTTPS

## 📊 监控和日志

### Render Dashboard
- **Logs**: 实时应用日志
- **Metrics**: CPU、内存、请求统计
- **Events**: 部署历史
- **Shell**: 远程命令行

### 日志级别
- **Development**: 详细日志
- **Production**: 警告和错误

### 监控工具
- Render 内置监控
- 可选: Sentry, LogRocket
- 数据库: Prisma Pulse

## 🆘 获取帮助

### 文档资源
- [Render 官方文档](https://render.com/docs)
- [Next.js 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)

### 社区支持
- [Render Community](https://community.render.com)
- [Next.js Discussions](https://github.com/vercel/next.js/discussions)
- [Prisma Discord](https://discord.gg/prisma)

### 商业支持
- Render Support: support@render.com
- Enterprise 客户有专属支持

## 🎓 进阶主题

完成基础部署后，可以探索：

- **自定义域名**: 绑定自己的域名
- **CDN 配置**: 优化静态资源分发
- **Cron Jobs**: 定时任务
- **Background Workers**: 后台作业
- **横向扩展**: 多实例部署
- **CI/CD**: 自动化部署流程
- **监控和告警**: 生产级监控

详见 [DEPLOYMENT_GUIDE.md#高级配置](DEPLOYMENT_GUIDE.md#高级配置)

## 🗺️ 路线图

- [x] 基础部署指南
- [x] 数据库迁移指南
- [x] 部署检查清单
- [x] MCP 集成文档
- [ ] Docker 部署方案
- [ ] 云存储集成指南
- [ ] CI/CD 流程示例
- [ ] 性能优化指南
- [ ] 安全加固指南

## 📝 更新日志

### 2025-10-09
- 创建完整的部署文档集
- 添加 Render Blueprint 配置
- 添加数据库迁移指南
- 添加部署检查清单

## 🤝 贡献

发现文档问题或有改进建议？
1. 提交 Issue
2. 发起 Pull Request
3. 联系维护者

## 📄 许可

本文档遵循项目许可证。

---

**准备好开始了吗？** 👉 从 [QUICK_START.md](QUICK_START.md) 开始！

**需要详细指导？** 👉 查看 [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

**使用 AI 助手？** 👉 配置 [Render_MCP.md](Render_MCP.md)
