# TG Bot Web App

一个基于 Next.js 的 Telegram Bot Web 应用，支持 Session 管理、消息抓取和自动聊天功能。

## ✨ 功能特性

- 🔐 用户认证和权限管理
- 📱 Telegram Session 管理
- 💬 消息抓取 (Chat Scraper)
- 🤖 自动聊天 (Auto Chat)
- 👥 多用户支持
- 📊 数据导出和分析

## 🛠️ 技术栈

- **前端**: Next.js 15 (App Router), React 19, TailwindCSS
- **后端**: Next.js API Routes, Python 3
- **数据库**: Prisma ORM + SQLite (开发) / PostgreSQL (生产)
- **认证**: NextAuth + JWT
- **Telegram**: Telethon (Python)

## 🚀 本地开发

### 前置要求

- Node.js 20+
- Python 3.x
- npm 或 yarn

### 安装依赖

```bash
# 安装 Node.js 依赖
npm install

# 安装 Python 依赖
pip install -r requirements.txt
```

### 配置环境变量

复制 `.env.example` 到 `.env`:

```bash
cp .env.example .env
```

编辑 `.env` 并填入必要的配置。

### 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 运行迁移
npx prisma migrate dev

# (可选) 查看数据库
npx prisma studio
```

### 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 📦 部署

### 部署到 Render

本项目提供了完整的 Render 部署方案。查看详细文档：

- **[快速开始](docs/Render/QUICK_START.md)** - 5 分钟快速部署
- **[完整指南](docs/Render/DEPLOYMENT_GUIDE.md)** - 详细的部署步骤
- **[数据库迁移](docs/Render/DATABASE_MIGRATION.md)** - SQLite → PostgreSQL
- **[检查清单](docs/Render/DEPLOYMENT_CHECKLIST.md)** - 部署前检查

**一键部署** (使用 Blueprint):

1. Fork 此仓库
2. 在 Render Dashboard 选择 "New +" → "Blueprint"
3. 连接你的仓库
4. 点击 "Apply"

详见 [docs/Render/README.md](docs/Render/README.md)

### 部署到 Railway

本项目完整支持 Railway 部署，包括代理配置和数据持久化方案。

**特性**:
- ✅ 代理配置支持环境变量动态更新（无需重新部署）
- ✅ 持久化卷保存用户 session 数据（不会因重新部署丢失）
- ✅ 一键连接 GitHub 自动部署

查看详细配置指南：**[RAILWAY_SETUP.md](RAILWAY_SETUP.md)**

### 部署到其他平台

- **Vercel**: 需要使用 Vercel Postgres
- **AWS/GCP**: 使用 Docker 部署

## 📖 项目结构

```
tg-bot-web/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── admin/        # 管理 API
│   │   ├── auth/         # 认证 API
│   │   ├── auto-chat/    # 自动聊天 API
│   │   ├── chat-scraper/ # 消息抓取 API
│   │   └── session/      # Session 管理 API
│   ├── admin/            # 管理页面
│   ├── auto-chat/        # 自动聊天页面
│   ├── chat-scraper/     # 消息抓取页面
│   └── session-gen/      # Session 生成页面
├── components/            # React 组件
├── docs/                 # 文档
│   └── Render/          # Render 部署文档
├── lib/                  # 工具库
├── prisma/              # Prisma Schema 和迁移
├── scripts/             # Python 脚本
│   ├── auto_chat.py     # 自动聊天脚本
│   ├── scrape_messages.py # 消息抓取脚本
│   ├── session_gen.py   # Session 生成脚本
│   └── ...
├── sessions/            # Telegram Session 文件
├── uploads/             # 上传文件
├── scraped_data/        # 抓取的数据
├── render-build.sh      # Render 构建脚本
├── render.yaml          # Render Blueprint 配置
└── package.json
```

## 🔧 配置说明

### 环境变量

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `DATABASE_URL` | 数据库连接 URL | ✅ |
| `JWT_SECRET` | JWT 密钥 | ✅ |
| `NEXTAUTH_SECRET` | NextAuth 密钥 | ✅ |
| `NEXTAUTH_URL` | 应用 URL | ✅ |
| `NODE_ENV` | 环境 (development/production) | ✅ |
| `API_ID` | Telegram API ID | ⚠️ |
| `API_HASH` | Telegram API Hash | ⚠️ |
| `PROXY_CONFIGS` | 代理配置（支持动态更新） | ❌ |
| `SESSIONS_DIR` | Session 文件存储路径 | ❌ |
| `MEDIA_DIR` | 媒体文件存储路径 | ❌ |
| `PROJECT_ROOT` | 项目根目录路径 | ❌ |

### Python 脚本

Python 脚本通过 Next.js API Routes 使用 `child_process.spawn` 调用。

主要脚本：
- `session_gen.py` - 生成 Telegram session
- `scrape_messages.py` - 抓取群组消息
- `auto_chat.py` - 自动回复聊天
- `update_profile.py` - 更新用户资料

## 🔐 安全注意事项

- ✅ 所有敏感信息使用环境变量
- ✅ JWT token 存储在 HTTP-only cookies
- ✅ 中间件验证所有受保护路由
- ✅ 密码使用 bcrypt 加密
- ✅ Session 文件按用户隔离

## 🧪 测试

```bash
# 运行测试 (如果有)
npm test

# 测试 Python 脚本
python scripts/test_sessions.py
```

## 📝 开发规范

- 使用 TypeScript 类型检查
- 遵循 ESLint 规则
- API 路由使用统一的错误处理
- Python 脚本使用类型提示

## 🐛 故障排查

### 常见问题

**问题**: Python 脚本执行失败

**解决**: 
- 检查 Python 环境和依赖
- 查看 API 路由日志
- 确认脚本路径正确

**问题**: 数据库连接失败

**解决**:
- 检查 `DATABASE_URL` 格式
- 运行 `npx prisma migrate deploy`
- 查看 Prisma 日志

**问题**: Session 文件丢失

**解决**:
- 使用持久化存储 (Render Disk 或 Railway Volume)
- 配置 `SESSIONS_DIR` 环境变量指向持久化卷
- 或迁移到云存储 (S3/R2)
- 详见 [Railway 配置指南](RAILWAY_SETUP.md#2-使用持久化存储保存用户数据)

**问题**: 代理过期需要频繁更新

**解决**:
- 使用环境变量配置代理（推荐）
- 在 Railway/Render 控制台直接修改环境变量
- 无需修改代码或重新部署
- 详见 [Railway 配置指南](RAILWAY_SETUP.md#1-使用环境变量管理代理配置)

更多问题见 [部署指南](docs/Render/DEPLOYMENT_GUIDE.md#故障排查)

## 🤝 贡献

欢迎贡献！请：

1. Fork 此仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 发起 Pull Request

## 📄 许可

本项目采用 [MIT License](LICENSE)

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)
- [Telethon 文档](https://docs.telethon.dev)
- [Render 文档](https://render.com/docs)

## 📧 联系方式

如有问题或建议，请提交 [Issue](https://github.com/liuyuelan12/TG-Web-App/issues)

---

Built with ❤️ using Next.js and Python
