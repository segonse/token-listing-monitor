# 代币上市监控系统

该系统用于监控 Bybit 等交易所的代币上市公告，并通过企业微信发送通知。

## 功能特点

- 定期从 Bybit API 获取最新公告
- 根据监控的代币列表匹配相关公告
- 通过企业微信发送实时通知
- 提供 API 接口管理监控的代币

## 安装与配置

### 前置条件

- Node.js 16+
- MySQL 5.7+
- 企业微信应用配置

### 安装步骤

1. 克隆代码库

```
git clone https://github.com/your-username/token-listing-monitor.git
cd token-listing-monitor
```

2. 安装依赖

```
npm install
```

3. 配置环境变量

复制`.env.example`文件为`.env`，并进行必要的配置：

```
cp .env.example .env
```

填写 MySQL 数据库连接信息和企业微信配置信息：

```
# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=token_listing_monitor

# 企业微信配置
WECHAT_CORPID=your_corpid
WECHAT_CORPSECRET=your_corpsecret
WECHAT_AGENTID=your_agentid

# API配置
PORT=3000
```

4. 启动应用

```
npm start
```

## API 接口

### 代币管理

- `GET /api/tokens` - 获取所有监控的代币
- `POST /api/tokens` - 添加新的监控代币 (参数: name)
- `DELETE /api/tokens/:id` - 删除监控代币

### 公告查询

- `GET /api/announcements` - 获取所有公告
- `GET /api/announcements/token/:tokenId` - 获取特定代币的公告

### 手动触发检查

- `POST /api/monitor/check-now` - 立即执行一次检查

## 用法示例

1. 添加监控代币:

```
curl -X POST http://localhost:3000/api/tokens -H "Content-Type: application/json" -d '{"name":"BTC"}'
```

2. 手动触发检查:

```
curl -X POST http://localhost:3000/api/monitor/check-now
```

## 许可证

MIT
