# 📡 Telegram代理配置更新

## 🎯 更新目标

解决Telegram消息发送失败的问题，通过添加代理配置来确保Telegram API请求能够正常访问。

## 🔧 修改内容

### 1. TelegramService代理配置

**文件**: `src/services/telegramService.js`

**主要修改**:
- 添加了`tunnel`和`getDynamicProxyConfig`依赖
- 为`sendMessage`方法添加代理配置
- 为`sendMessageToUser`方法添加代理配置
- 使用与其他交易所服务相同的代理配置逻辑

**代理配置逻辑**:
```javascript
// 获取代理配置
const proxyConfig = getDynamicProxyConfig();

// 创建代理隧道
const agent = tunnel.httpsOverHttp({
  proxy: {
    host: proxyConfig.host,
    port: proxyConfig.port,
    proxyAuth: `${proxyConfig.auth.username}:${proxyConfig.auth.password}`,
  },
});

// 在axios请求中使用代理
const response = await axios.post(url, data, {
  httpsAgent: agent,
  timeout: 30000,
});
```

### 2. 微信推送功能注释

**文件**: `src/services/monitorService.js`

**修改内容**:
- 注释掉了微信用户的消息推送逻辑
- 保留了代码结构，便于后续恢复
- 添加了跳过日志，明确显示微信推送已禁用

**注释的功能**:
- `WechatService.formatAnnouncementMessage()`
- `WechatService.sendMessageToUser()`
- 微信消息发送成功/失败的处理逻辑

## 📁 新增文件

### 测试脚本
- `test/test_telegram_proxy.js` - Telegram代理配置测试脚本

## 🔍 测试验证

### 运行测试脚本
```bash
node test/test_telegram_proxy.js
```

### 测试内容
1. **环境变量检查**
   - TELEGRAM_BOT_TOKEN
   - TELEGRAM_CHAT_ID  
   - PROXY_HOST
   - PROXY_PORT
   - PROXY_PASSWORD

2. **消息发送测试**
   - 发送消息到默认聊天
   - 发送消息到指定用户（如果配置了TEST_TELEGRAM_USER_ID）

3. **消息格式化测试**
   - 验证公告消息格式化功能

## 🌐 代理配置要求

### 环境变量
确保以下环境变量已正确配置：

```bash
# Telegram配置
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# 代理配置（与其他服务共用）
PROXY_HOST=your_proxy_host
PROXY_PORT=your_proxy_port
PROXY_PASSWORD=your_proxy_password

# 可选：测试用户ID
TEST_TELEGRAM_USER_ID=your_test_user_id
```

### 代理类型
- 使用HTTP代理隧道（tunnel.httpsOverHttp）
- 支持用户名/密码认证
- 自动生成随机会话ID

## 📊 预期效果

### 解决的问题
1. **Telegram API访问失败**
   - 之前：`发送Telegram消息给用户 xxx 出错:`
   - 现在：通过代理正常访问Telegram API

2. **微信IP限制问题**
   - 之前：`not allow to access from your ip`
   - 现在：暂时禁用微信推送，避免错误日志

### 系统行为变化
1. **Telegram用户**：正常接收公告通知
2. **微信用户**：暂时不接收通知，日志显示跳过
3. **错误日志**：大幅减少网络相关错误

## ⚠️ 注意事项

1. **代理依赖**
   - 确保代理服务器稳定可用
   - 代理配置与其他交易所服务保持一致

2. **微信功能**
   - 当前已禁用，需要时可以取消注释恢复
   - 需要解决IP白名单问题后再启用

3. **测试建议**
   - 运行测试脚本验证配置
   - 观察实际运行日志确认效果

## 🔄 后续计划

1. **验证Telegram代理效果**
   - 监控下次定时任务的执行日志
   - 确认Telegram消息发送成功

2. **微信功能恢复**（可选）
   - 解决IP白名单问题
   - 取消注释相关代码

3. **代理配置优化**（如需要）
   - 根据实际使用情况调整超时时间
   - 优化错误处理逻辑

---

**更新时间**: 2025-01-17
**版本**: v2.1.1 - Telegram代理配置
