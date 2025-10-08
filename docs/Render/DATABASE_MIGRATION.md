# 数据库迁移指南：SQLite → PostgreSQL

## 为什么要迁移？

Render 的 Web Services 使用**临时文件系统**，每次重启或部署后文件会重置。SQLite 数据库存储在文件系统中，因此会丢失数据。

**解决方案**: 使用 PostgreSQL（Render 提供的托管数据库服务）

## 迁移步骤

### 步骤 1: 备份现有数据（如果有）

如果你有本地 SQLite 数据需要迁移：

```bash
# 导出数据（如果需要）
npx prisma db pull
```

### 步骤 2: 修改 Prisma Schema

编辑 `prisma/schema.prisma`：

**之前（SQLite）**:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

**之后（PostgreSQL）**:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 步骤 3: 安装 PostgreSQL 驱动

```bash
npm install pg
```

### 步骤 4: 创建初始迁移

```bash
# 创建迁移文件
npx prisma migrate dev --name init

# 或者重置迁移历史
rm -rf prisma/migrations
npx prisma migrate dev --name init
```

### 步骤 5: 更新环境变量

**本地开发 (`.env`)**:
```env
# 选项 1: 继续使用 SQLite（开发环境）
DATABASE_URL="file:./dev.db"

# 选项 2: 使用本地 PostgreSQL
DATABASE_URL="postgresql://localhost:5432/tg_bot?schema=public"

# 选项 3: 连接到 Render PostgreSQL（测试）
DATABASE_URL="postgresql://user:pass@oregon-postgres.render.com/db"
```

**生产环境 (Render)**:
```env
DATABASE_URL="<Render PostgreSQL Internal URL>"
```

### 步骤 6: 测试迁移

```bash
# 生成 Prisma Client
npx prisma generate

# 运行迁移
npx prisma migrate deploy

# 打开 Prisma Studio 检查
npx prisma studio
```

### 步骤 7: 提交更改

```bash
git add prisma/ package.json package-lock.json
git commit -m "Migrate to PostgreSQL for Render deployment"
git push
```

## 本地开发选项

### 选项 1: 继续使用 SQLite（推荐）

开发环境使用 SQLite，生产环境使用 PostgreSQL：

**`prisma/schema.prisma`**:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**`.env.local`** (本地开发):
```env
# Prisma 支持 SQLite URL 即使 provider 是 postgresql（某些限制）
DATABASE_URL="file:./dev.db"
```

**`.env.production`** (Render):
```env
DATABASE_URL="<PostgreSQL URL>"
```

**注意**: 这种方法有限制，某些 PostgreSQL 特性在 SQLite 中不可用。

### 选项 2: 本地安装 PostgreSQL

使用 Homebrew 安装：

```bash
# 安装 PostgreSQL
brew install postgresql@16

# 启动服务
brew services start postgresql@16

# 创建数据库
createdb tg_bot

# 更新 .env
DATABASE_URL="postgresql://localhost:5432/tg_bot?schema=public"
```

使用 Docker：

```bash
# 启动 PostgreSQL 容器
docker run -d \
  --name postgres-dev \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=tg_bot \
  -p 5432:5432 \
  postgres:16-alpine

# 更新 .env
DATABASE_URL="postgresql://postgres:password@localhost:5432/tg_bot?schema=public"
```

### 选项 3: 使用 Render PostgreSQL（开发）

连接到 Render 的开发数据库：

```bash
# 从 Render Dashboard 复制 External Database URL
DATABASE_URL="postgresql://user:pass@oregon-postgres.render.com/db"
```

**警告**: 不要在生产数据库上开发！

## 数据迁移（可选）

如果需要从 SQLite 迁移现有数据到 PostgreSQL：

### 方法 1: 使用 Prisma

```bash
# 1. 导出 SQLite 数据到 SQL
sqlite3 prisma/dev.db .dump > backup.sql

# 2. 转换并导入到 PostgreSQL（需要手动调整 SQL）
# 这个过程比较复杂，建议使用专门工具
```

### 方法 2: 使用第三方工具

- **pgLoader**: SQLite → PostgreSQL 迁移工具
- **prisma-schema-transformer**: 自动迁移工具

### 方法 3: 手动重建（推荐小数据量）

```bash
# 1. 在新 PostgreSQL 数据库运行迁移
DATABASE_URL="<PostgreSQL URL>" npx prisma migrate deploy

# 2. 使用 Prisma Studio 或脚本手动导入数据
npx prisma studio
```

## 验证迁移

### 检查 Schema

```bash
# 查看 Prisma schema
npx prisma db pull

# 比较本地和远程 schema
npx prisma migrate diff \
  --from-url "file:./dev.db" \
  --to-url "<PostgreSQL URL>"
```

### 测试应用

```bash
# 本地测试
npm run dev

# 测试功能
- [ ] 用户注册/登录
- [ ] Session 创建
- [ ] 数据持久化
```

## 常见问题

### 1. `prisma generate` 失败

**错误**: 
```
Prisma Client did not initialize yet
```

**解决**:
```bash
rm -rf node_modules/.prisma
npx prisma generate
```

### 2. 迁移冲突

**错误**: 
```
Migration ... failed
```

**解决**:
```bash
# 重置迁移历史（仅开发环境）
npx prisma migrate reset

# 或强制应用
npx prisma migrate deploy --skip-seed
```

### 3. 连接超时

**错误**: 
```
Can't reach database server
```

**解决**:
- 检查 `DATABASE_URL` 格式
- 确保网络连接
- 使用 Internal URL（Render 内部连接）

### 4. SSL 证书错误

**错误**: 
```
certificate verify failed
```

**解决**:
添加 SSL 参数：
```
DATABASE_URL="postgresql://...?sslmode=require"
```

## Render 特定配置

### 使用 Internal Database URL

在 Render Dashboard：
1. PostgreSQL → Info → **Internal Database URL**
2. 复制到 Web Service 的环境变量

**格式**:
```
postgres://user:pass@hostname:5432/database
```

### 自动迁移

在 `render-build.sh` 中：
```bash
# 运行迁移（已包含）
npx prisma migrate deploy
```

### 环境特定配置

```bash
# 检测环境
if [ "$NODE_ENV" = "production" ]; then
  echo "Running production migrations"
  npx prisma migrate deploy
else
  echo "Development mode"
fi
```

## 回滚计划

如果迁移出现问题：

### 本地回滚

```bash
# 1. 恢复 SQLite schema
git checkout HEAD~1 prisma/schema.prisma

# 2. 重新生成 client
npx prisma generate

# 3. 恢复数据库
cp backup.db prisma/dev.db
```

### Render 回滚

```bash
# 1. 在 Render Dashboard 回滚部署
Deployments → ... → Rollback

# 2. 或推送修复
git revert HEAD
git push
```

## 最佳实践

1. **环境分离**: 开发用 SQLite，生产用 PostgreSQL
2. **备份数据**: 定期备份生产数据库
3. **测试迁移**: 先在暂存环境测试
4. **版本控制**: 提交所有迁移文件
5. **监控**: 使用 Prisma Pulse 或 Render 监控

## 下一步

完成数据库迁移后：
1. [部署到 Render](QUICK_START.md)
2. [配置持久化存储](DEPLOYMENT_GUIDE.md#2-持久化存储方案)
3. [设置监控和备份](https://render.com/docs/databases)

---

遇到问题？查看 [Prisma PostgreSQL 文档](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
