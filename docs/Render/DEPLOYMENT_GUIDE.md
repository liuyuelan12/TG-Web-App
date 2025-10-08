# Render 部署指南

## 项目概述

这是一个混合技术栈的 Telegram Bot Web 应用：
- **前端**: Next.js 15 (App Router)
- **数据库**: Prisma + SQLite
- **后端脚本**: Python 3 (Telethon)
- **认证**: JWT + NextAuth

## 部署前准备

### 1. 数据库迁移（重要）

**问题**: Render Web Services 不提供持久化文件系统，SQLite 数据库会在重启后丢失。

**解决方案**: 迁移到 PostgreSQL

#### 步骤 1: 修改 Prisma Schema

编辑 `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // 改为 postgresql
  url      = env("DATABASE_URL")
}
```

#### 步骤 2: 安装 PostgreSQL 驱动

```bash
npm install pg
```

#### 步骤 3: 更新 package.json

在 `scripts` 中添加：

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && next build"
  }
}
```

### 2. 持久化存储方案

需要持久化的文件：
- Session 文件 (`sessions/`)
- 上传文件 (`uploads/`)
- 抓取数据 (`scraped_data/`)

**方案选择**:

**方案 A: 使用 Render Disk (推荐)**
- Render 提供 Disk 存储服务
- 按月收费，但数据持久化
- 适合生产环境

**方案 B: 使用云存储 (AWS S3/Cloudflare R2)**
- 更灵活、可扩展
- 需要修改代码以支持云存储
- 成本更低（按使用量付费）

**方案 C: 暂时接受数据丢失**
- 仅用于测试
- 不推荐生产环境

### 3. 环境变量配置

创建 `.env.example` 文件：

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# NextAuth
NEXTAUTH_URL="https://your-app.onrender.com"
NEXTAUTH_SECRET="your-secret-key-here"

# JWT
JWT_SECRET="your-jwt-secret-key"

# Telegram API (如果需要)
TELEGRAM_API_ID=""
TELEGRAM_API_HASH=""

# Node Environment
NODE_ENV="production"
```

## Render 部署步骤

### 方案 1: 使用 Render Dashboard (推荐)

#### 步骤 1: 创建 PostgreSQL 数据库

1. 登录 [Render Dashboard](https://dashboard.render.com)
2. 点击 "New +" → "PostgreSQL"
3. 配置：
   - **Name**: `tg-bot-db`
   - **Database**: `tg_bot`
   - **User**: 自动生成
   - **Region**: 选择离你最近的
   - **Plan**: Free 或 Starter
4. 创建后，复制 **Internal Database URL**

#### 步骤 2: 创建 Web Service

1. 点击 "New +" → "Web Service"
2. 连接你的 GitHub 仓库
3. 配置：
   - **Name**: `tg-bot-web`
   - **Region**: 与数据库相同
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Starter ($7/month)

#### 步骤 3: 配置环境变量

在 Web Service 的 Environment 标签页添加：

```
DATABASE_URL=<从 PostgreSQL 复制的 Internal Database URL>
JWT_SECRET=<生成一个随机字符串>
NEXTAUTH_SECRET=<生成一个随机字符串>
NEXTAUTH_URL=https://<your-service-name>.onrender.com
NODE_ENV=production
```

#### 步骤 4: 配置 Python 环境

创建 `render-build.sh`:

```bash
#!/bin/bash

# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Generate Prisma Client
npx prisma generate

# Run Prisma migrations
npx prisma migrate deploy

# Build Next.js app
npm run build
```

在 Render 设置中：
- **Build Command**: `bash render-build.sh`

#### 步骤 5: 配置持久化存储 (可选)

如果需要持久化 session 文件：

1. 在 Web Service 页面，找到 "Disks" 标签
2. 点击 "Add Disk"
3. 配置：
   - **Name**: `sessions-disk`
   - **Mount Path**: `/opt/render/project/src/sessions`
   - **Size**: 1 GB (起步)
4. 同样为 `uploads` 和 `scraped_data` 创建 Disk

### 方案 2: 使用 Render MCP (AI 辅助)

你已经在 Windsurf 配置了 Render MCP，可以使用自然语言部署：

```
在 Render 上创建一个 Web Service，使用仓库 https://github.com/liuyuelan12/TG-Web-App，
运行时为 Node，构建命令为 'bash render-build.sh'，启动命令为 'npm start'，
region 选择 Oregon，plan 选择 starter
```

## 部署后配置

### 1. 运行数据库迁移

首次部署后，在 Render Shell 中运行：

```bash
npx prisma migrate deploy
```

### 2. 创建管理员用户

需要修改代码添加初始管理员创建接口，或直接在数据库中创建。

### 3. 测试功能

- 登录功能
- Session 生成
- 消息抓取
- 自动聊天

## 注意事项

### 1. 文件系统限制

Render Free Plan 的文件系统在每次部署或休眠后会重置。需要：
- 使用 Render Disk 或云存储
- 或接受数据丢失（仅测试）

### 2. Python 依赖

确保 `requirements.txt` 包含所有依赖：
```
Telethon==1.34.0
python-socks[asyncio]==2.6.1
python-dotenv==1.0.1
pandas==2.2.3
emoji==2.8.0
numpy==2.2.1
```

### 3. 性能考虑

- Free Plan 会在 15 分钟无活动后休眠
- Starter Plan ($7/月) 不休眠
- 考虑使用 Render Cron Jobs 定期 ping 以保持活跃（Free Plan）

### 4. 日志调试

在 Render Dashboard 查看：
- Logs 标签页：实时日志
- Events 标签页：部署历史

## 成本估算

### 最小配置（测试）
- PostgreSQL: Free
- Web Service: Free (有休眠)
- **总计**: $0/月

### 推荐配置（生产）
- PostgreSQL: Starter ($7/月)
- Web Service: Starter ($7/月)
- Disk (3GB): ~$1.50/月
- **总计**: ~$15.50/月

### 完整配置（高可用）
- PostgreSQL: Standard ($15/月)
- Web Service: Standard ($25/月)
- Disk (10GB): ~$5/月
- **总计**: ~$45/月

## 故障排查

### 构建失败

1. 检查 Python 是否正确安装
2. 检查 Node.js 版本（Render 默认 Node 20）
3. 查看构建日志

### 运行时错误

1. 检查环境变量是否正确设置
2. 检查数据库连接
3. 检查 Python 脚本权限

### 数据库连接失败

1. 确认 `DATABASE_URL` 使用 Internal URL
2. 检查数据库是否在同一 region
3. 运行 `npx prisma migrate deploy`

## 高级配置

### 使用 Docker (可选)

如果需要更精细的控制，可以使用 Docker：

创建 `Dockerfile`:

```dockerfile
FROM node:20-alpine

# Install Python
RUN apk add --no-cache python3 py3-pip

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY requirements.txt ./

# Install dependencies
RUN npm ci --only=production
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

在 Render 选择 "Docker" 运行时。

## 下一步

1. 确定数据库方案（PostgreSQL）
2. 决定持久化存储策略
3. 准备环境变量
4. 测试本地构建
5. 部署到 Render

## 需要帮助？

- [Render 文档](https://render.com/docs)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)
- [Prisma PostgreSQL 指南](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
