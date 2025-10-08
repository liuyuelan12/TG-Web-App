# Render 快速部署指南

## 🚀 5 分钟部署到 Render

### 前置要求

- [x] GitHub 账号
- [x] Render 账号（[注册](https://dashboard.render.com/register)）
- [x] 代码已推送到 GitHub

### 步骤 1: 准备仓库

1. **确保代码已提交到 GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push
   ```

2. **检查必需文件**
   - [x] `render-build.sh` - 构建脚本
   - [x] `render.yaml` - Render 配置
   - [x] `requirements.txt` - Python 依赖
   - [x] `package.json` - Node.js 依赖

### 步骤 2: 修改数据库配置（重要）

**编辑 `prisma/schema.prisma`**:

```prisma
datasource db {
  provider = "postgresql"  // 改为 postgresql
  url      = env("DATABASE_URL")
}
```

**安装 PostgreSQL 驱动**:

```bash
npm install pg
git add package.json package-lock.json prisma/schema.prisma
git commit -m "Switch to PostgreSQL"
git push
```

### 步骤 3: 使用 Render Blueprint 部署

1. **登录 Render Dashboard**
   访问: https://dashboard.render.com

2. **创建新的 Blueprint**
   - 点击 "New +" → "Blueprint"
   - 选择你的 GitHub 仓库
   - Render 会自动检测 `render.yaml`

3. **配置环境变量**
   Blueprint 会自动创建以下资源：
   - PostgreSQL 数据库
   - Web Service
   - 持久化存储 Disk

4. **开始部署**
   - 点击 "Apply"
   - 等待 5-10 分钟完成构建

### 步骤 4: 部署后设置

1. **访问你的应用**
   ```
   https://<your-service-name>.onrender.com
   ```

2. **创建管理员账户**
   首次访问会要求创建账户

3. **测试功能**
   - 登录
   - Session 管理
   - 消息抓取

## 🎯 使用 Render MCP 部署（AI 辅助）

你已经配置了 Render MCP，可以在 Windsurf 中使用自然语言：

### 方式 1: 自动部署

```
使用 render.yaml 在 Render 上部署我的项目 https://github.com/liuyuelan12/TG-Web-App
```

### 方式 2: 手动配置

```
在 Render 上创建 PostgreSQL 数据库 tg-bot-db，然后创建 Web Service 
tg-bot-web，使用仓库 https://github.com/liuyuelan12/TG-Web-App，
构建命令为 'bash render-build.sh'，启动命令为 'npm start'
```

## 📋 环境变量清单

部署后需要在 Render Dashboard 设置：

```env
DATABASE_URL=<自动从数据库获取>
JWT_SECRET=<生成随机字符串>
NEXTAUTH_SECRET=<生成随机字符串>
NEXTAUTH_URL=https://<your-service>.onrender.com
NODE_ENV=production
```

**生成随机密钥**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🐛 常见问题

### 1. 构建失败

**错误**: `Python not found`

**解决**: Render Node 环境包含 Python 3，检查构建日志

**错误**: `prisma generate failed`

**解决**: 确保 `DATABASE_URL` 正确设置

### 2. 数据库连接失败

**错误**: `Can't reach database server`

**解决**: 
- 使用 **Internal Database URL**（从 PostgreSQL 页面复制）
- 确保 Web Service 和数据库在同一 region

### 3. 应用休眠

**问题**: Free plan 15 分钟不活动后休眠

**解决**: 
- 升级到 Starter plan ($7/月)
- 或使用 Render Cron Job 定期 ping

### 4. Session 文件丢失

**问题**: 重启后 session 文件消失

**解决**: 
- 使用 Render Disk（见 render.yaml）
- 或迁移到云存储（S3/R2）

## 📊 监控和日志

### 查看日志
```
Render Dashboard → Your Service → Logs
```

### 查看指标
```
Render Dashboard → Your Service → Metrics
```

### 数据库查询
使用 Render 提供的 `psql` shell:
```
Render Dashboard → PostgreSQL → Connect
```

## 💰 成本

### Free Tier（测试）
- PostgreSQL: Free (90 天后过期)
- Web Service: Free（会休眠）
- **总计**: $0/月

### 生产环境（推荐）
- PostgreSQL: Starter ($7/月)
- Web Service: Starter ($7/月)  
- Disk 1GB: ~$0.50/月
- **总计**: ~$14.50/月

## 🔒 安全建议

1. **更换默认密钥**
   - 不要使用示例中的 `JWT_SECRET`
   - 使用强随机字符串

2. **限制数据库访问**
   - 使用 Internal Database URL
   - 不要公开数据库凭据

3. **环境变量**
   - 不要提交 `.env` 到 Git
   - 使用 Render 的环境变量管理

4. **HTTPS**
   - Render 自动提供 SSL
   - 确保 `NEXTAUTH_URL` 使用 https://

## 📚 下一步

1. [配置自定义域名](https://render.com/docs/custom-domains)
2. [设置 Cron Jobs](https://render.com/docs/cronjobs)
3. [配置 CDN](https://render.com/docs/content-delivery-network)
4. [监控和告警](https://render.com/docs/monitoring)

## 🆘 需要帮助？

- **Render 文档**: https://render.com/docs
- **社区论坛**: https://community.render.com
- **支持**: support@render.com

---

部署愉快！🎉
