# Render 部署检查清单

使用此清单确保顺利部署到 Render。

## 📋 部署前检查

### 1. 代码准备

- [ ] 所有代码已提交到 Git
- [ ] 已推送到 GitHub 仓库
- [ ] 仓库是公开的或已授权 Render 访问
- [ ] `.gitignore` 配置正确（不包含 `.env`, `node_modules` 等）

### 2. 数据库配置

- [ ] 已将 Prisma schema 从 SQLite 改为 PostgreSQL
  ```prisma
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }
  ```
- [ ] 已安装 `pg` 包: `npm install pg`
- [ ] 已创建 Prisma 迁移: `npx prisma migrate dev --name init`
- [ ] 迁移文件已提交到 Git

### 3. 必需文件

- [ ] `render-build.sh` - 构建脚本存在且可执行
- [ ] `render.yaml` - Render 配置文件（可选但推荐）
- [ ] `.env.example` - 环境变量模板
- [ ] `requirements.txt` - Python 依赖
- [ ] `package.json` - 包含正确的脚本

### 4. Package.json 脚本

- [ ] `build` 脚本: `"build": "prisma generate && next build"`
- [ ] `start` 脚本: `"start": "next start"`
- [ ] `postinstall` 脚本: `"postinstall": "prisma generate"` (可选)

### 5. 环境变量准备

准备以下环境变量的值：

- [ ] `DATABASE_URL` - 将从 Render PostgreSQL 获取
- [ ] `JWT_SECRET` - 生成一个强随机字符串
- [ ] `NEXTAUTH_SECRET` - 生成一个强随机字符串
- [ ] `NEXTAUTH_URL` - 设置为 Render 提供的 URL
- [ ] `NODE_ENV` - 设置为 `production`
- [ ] 其他应用特定的环境变量

**生成随机密钥**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 6. Python 依赖

- [ ] `requirements.txt` 包含所有依赖
- [ ] 版本已固定（如 `Telethon==1.34.0`）
- [ ] 已本地测试 Python 脚本

### 7. 持久化存储计划

选择一个选项：

- [ ] **选项 A**: 使用 Render Disk（推荐）
  - 需要 Starter plan 或更高
  - 配置挂载点: `/opt/render/project/src/sessions`
  
- [ ] **选项 B**: 使用云存储 (S3/R2)
  - 需要修改代码以支持云存储
  - 更灵活，成本更低
  
- [ ] **选项 C**: 暂时接受数据丢失（仅测试）
  - 适用于 Free plan
  - 不适合生产环境

## 🚀 Render 设置检查

### 1. PostgreSQL 数据库

- [ ] 已在 Render 创建 PostgreSQL 数据库
- [ ] 已记录数据库名称
- [ ] 已复制 **Internal Database URL**
- [ ] 区域与 Web Service 相同

### 2. Web Service

- [ ] 已创建 Web Service
- [ ] 正确连接到 GitHub 仓库
- [ ] 选择正确的分支（通常是 `main`）
- [ ] 设置构建命令: `bash render-build.sh`
- [ ] 设置启动命令: `npm start`
- [ ] 选择适当的 Plan (Free/Starter/Standard)
- [ ] 区域与数据库相同

### 3. 环境变量

在 Render Web Service 的 Environment 页面：

- [ ] `DATABASE_URL` - 已设置为 PostgreSQL Internal URL
- [ ] `JWT_SECRET` - 已设置
- [ ] `NEXTAUTH_SECRET` - 已设置
- [ ] `NEXTAUTH_URL` - 已设置为 Render URL
- [ ] `NODE_ENV=production` - 已设置
- [ ] 所有其他必需的环境变量已设置

### 4. Disk 配置（如果使用）

- [ ] 已添加 Disk
- [ ] 挂载路径: `/opt/render/project/src/sessions`
- [ ] 大小: 至少 1GB
- [ ] 必要时添加额外的 Disk (uploads, scraped_data)

## 📊 部署过程检查

### 1. 构建阶段

观察构建日志，确认：

- [ ] Node.js 依赖安装成功
- [ ] Python 依赖安装成功
- [ ] Prisma Client 生成成功
- [ ] 数据库迁移执行成功
- [ ] Next.js 构建成功
- [ ] 没有错误或警告

### 2. 部署阶段

- [ ] 服务启动成功
- [ ] Health check 通过
- [ ] 在日志中看到 "Ready on port 3000"
- [ ] 没有运行时错误

### 3. 首次访问

- [ ] 可以访问应用 URL
- [ ] 页面正常加载（不是 404 或 500）
- [ ] 可以访问登录页面
- [ ] CSS 样式正常加载

## ✅ 功能测试

部署后测试所有核心功能：

### 认证系统
- [ ] 可以注册新账户
- [ ] 可以登录
- [ ] 可以登出
- [ ] JWT token 正常工作
- [ ] 中间件正确验证权限

### Session 管理
- [ ] 可以生成新 session
- [ ] Session 文件正确保存
- [ ] 可以查看 session 列表
- [ ] 可以删除 session
- [ ] Session 信息准确显示

### 消息抓取
- [ ] 可以启动抓取任务
- [ ] Python 脚本正确执行
- [ ] 抓取数据正确保存
- [ ] 可以下载抓取结果

### 自动聊天
- [ ] 可以上传消息源
- [ ] 可以启动自动聊天
- [ ] 可以停止自动聊天
- [ ] 日志正确显示

### 管理功能（如果有）
- [ ] 管理员可以访问管理页面
- [ ] 可以管理用户
- [ ] 可以查看系统状态

## 🔍 监控和维护

### 设置监控

- [ ] 启用 Render 健康检查
- [ ] 配置告警（如果需要）
- [ ] 定期检查日志
- [ ] 监控磁盘使用（如果使用 Disk）

### 备份策略

- [ ] 设置数据库自动备份
- [ ] 定期导出重要数据
- [ ] 测试恢复流程

### 性能优化

- [ ] 启用 HTTP/2
- [ ] 配置适当的超时设置
- [ ] 考虑使用 CDN（对于静态资源）

## 🐛 故障排查

如果遇到问题，检查：

### 构建失败
- [ ] 查看构建日志中的错误
- [ ] 检查 `render-build.sh` 语法
- [ ] 确认所有依赖都在 package.json/requirements.txt 中
- [ ] 验证 Node.js 和 Python 版本兼容性

### 运行时错误
- [ ] 查看运行日志
- [ ] 检查环境变量是否正确设置
- [ ] 确认数据库连接正常
- [ ] 验证 Prisma Client 已生成

### 数据库问题
- [ ] 检查 `DATABASE_URL` 格式
- [ ] 使用 Internal URL 而非 External
- [ ] 确认迁移已应用: `npx prisma migrate deploy`
- [ ] 检查数据库是否在同一区域

### 文件系统问题
- [ ] 确认 Disk 已正确挂载
- [ ] 检查挂载路径是否正确
- [ ] 验证权限设置
- [ ] 检查磁盘空间

## 📝 部署后任务

### 立即执行

- [ ] 创建管理员账户
- [ ] 更改默认密码/密钥
- [ ] 测试所有核心功能
- [ ] 记录应用 URL 和凭据

### 短期内执行

- [ ] 配置自定义域名（如果需要）
- [ ] 设置 HTTPS 重定向
- [ ] 优化环境变量
- [ ] 审查和优化日志级别

### 长期维护

- [ ] 建立监控和告警
- [ ] 制定备份计划
- [ ] 定期更新依赖
- [ ] 性能调优
- [ ] 安全审计

## 💡 优化建议

### 性能
- [ ] 启用 Next.js 图片优化
- [ ] 配置适当的缓存策略
- [ ] 使用 React.memo 减少重渲染
- [ ] 优化数据库查询

### 安全
- [ ] 实施速率限制
- [ ] 添加 CSRF 保护
- [ ] 定期轮换密钥
- [ ] 审计日志访问

### 可靠性
- [ ] 实施重试逻辑
- [ ] 添加健康检查端点
- [ ] 配置适当的超时
- [ ] 实施优雅关闭

## 📊 成本优化

### Free Tier
- [ ] 数据库将在 90 天后过期
- [ ] 服务会在 15 分钟不活动后休眠
- [ ] 计划升级时间

### Paid Plans
- [ ] 评估实际使用情况
- [ ] 考虑预留实例折扣
- [ ] 监控超额使用
- [ ] 优化磁盘使用

## 🎓 学习资源

- [ ] 阅读 [Render 文档](https://render.com/docs)
- [ ] 学习 [Next.js 部署最佳实践](https://nextjs.org/docs/deployment)
- [ ] 了解 [Prisma 生产部署](https://www.prisma.io/docs/guides/deployment)
- [ ] 加入 [Render 社区](https://community.render.com)

## ✨ 完成！

当所有项都检查完毕，你的应用就成功部署到 Render 了！

---

**需要帮助？** 查看：
- [快速开始指南](QUICK_START.md)
- [完整部署指南](DEPLOYMENT_GUIDE.md)
- [数据库迁移指南](DATABASE_MIGRATION.md)

祝部署顺利！🚀
