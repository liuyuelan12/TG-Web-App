# Railway 部署配置指南

本文档说明如何在 Railway 上配置项目，解决代理过期和用户数据持久化问题。

## 问题说明

1. **代理配置过期**：代理服务器会不定时过期，需要频繁更新
2. **用户数据丢失**：每次重新部署时，Railway 会重建容器，导致用户 session 文件丢失

## 解决方案

### 1. 使用环境变量管理代理配置

#### 在 Railway 控制台设置环境变量

1. 打开你的 Railway 项目
2. 进入 **Variables** 标签
3. 添加以下环境变量：

```
PROXY_CONFIGS=socks5://zhouhaha:963091790@102.177.147.43:50101,socks5://zhouhaha:963091790@102.177.146.2:50101
```

#### 环境变量格式说明

- 多个代理用**英文逗号**分隔
- 单个代理格式：`socks5://用户名:密码@地址:端口`
- 示例：
  ```
  socks5://username:password@102.177.147.43:50101
  ```

#### 更新代理的方法

**重要**：更新代理时**不需要修改代码或重新部署**！

1. 在 Railway 控制台找到 `PROXY_CONFIGS` 环境变量
2. 点击编辑，更新代理地址
3. 保存后，Railway 会自动重启服务（但不会重新构建）
4. 新的代理配置立即生效

### 2. 使用持久化存储保存用户数据

Railway 支持 **Persistent Volumes**，可以在重新部署时保留数据。

#### 方法 A：挂载持久化卷（推荐）

1. 在 Railway 项目中，点击 **Volumes** 标签
2. 点击 **+ New Volume**
3. 配置卷：
   - **Mount Path**: `/app/sessions`（这是用户 session 文件存储路径）
   - **Size**: 选择合适的大小（例如 1GB）
4. 保存配置

5. 确保环境变量中设置：
   ```
   SESSIONS_DIR=/app/sessions
   ```

这样，即使重新部署，`/app/sessions` 目录下的所有用户数据都会被保留。

#### 方法 B：使用外部数据库（可选）

如果需要更高级的数据管理，可以：

1. 在 Railway 添加 **PostgreSQL** 服务
2. 修改代码，将用户 session 信息存储到数据库而不是文件系统
3. 这种方式更适合大规模用户场景

### 3. 完整的环境变量配置

在 Railway Variables 标签中设置以下环境变量：

```bash
# Telegram API 配置
API_ID=你的API_ID
API_HASH=你的API_HASH

# 代理配置（支持动态更新）
PROXY_CONFIGS=socks5://username:password@addr1:port1,socks5://username:password@addr2:port2

# 数据持久化路径（如果使用 Volume）
SESSIONS_DIR=/app/sessions
MEDIA_DIR=/app/scraped_data

# 项目根目录
PROJECT_ROOT=/app
```

## 部署流程

### 首次部署

1. 连接 GitHub 仓库到 Railway
2. 设置所有必要的环境变量
3. 创建 Volume 并挂载到 `/app/sessions`
4. 部署项目

### 更新代理配置（无需重新部署）

1. 进入 Railway 控制台 → Variables
2. 修改 `PROXY_CONFIGS` 值
3. 保存后服务会自动重启，新配置生效
4. **用户数据不会丢失**

### 更新代码（不影响用户数据）

1. Push 代码到 GitHub
2. Railway 自动触发重新部署
3. 因为使用了 Volume，用户 session 文件会保留
4. 代理配置从环境变量读取，无需修改代码

## 验证配置

部署后，检查以下内容：

1. **代理配置是否生效**：
   - 查看日志，确认代理从环境变量加载
   
2. **数据持久化是否工作**：
   - 添加一个测试用户
   - 触发一次重新部署
   - 检查测试用户数据是否仍然存在

3. **更新代理测试**：
   - 修改 `PROXY_CONFIGS` 环境变量
   - 等待服务重启
   - 检查新代理是否生效

## 优势总结

✅ **代理更新**：修改环境变量即可，无需推送代码  
✅ **数据持久化**：使用 Volume，重新部署不丢失用户数据  
✅ **安全性**：敏感信息不暴露在代码仓库中  
✅ **灵活性**：可以为不同环境配置不同的代理  

## 故障排查

### 代理无法连接

1. 检查 `PROXY_CONFIGS` 格式是否正确
2. 确认代理服务器地址、端口、用户名、密码无误
3. 查看 Railway 日志中的代理配置加载信息

### 用户数据丢失

1. 确认 Volume 已正确创建并挂载到 `/app/sessions`
2. 检查 `SESSIONS_DIR` 环境变量是否设置正确
3. 查看文件系统中 Volume 挂载路径

### 环境变量未生效

1. 保存环境变量后，需要等待服务重启
2. 检查日志中是否有环境变量加载的错误信息
3. 确认变量名拼写正确，没有多余空格

## 联系支持

如有问题，请查看：
- Railway 官方文档：https://docs.railway.app/
- Volume 指南：https://docs.railway.app/reference/volumes
