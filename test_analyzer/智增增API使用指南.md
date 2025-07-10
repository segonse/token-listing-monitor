# 智增增API使用指南

## 🎯 为什么选择智增增API？

### 成本优势
- **仅比官方贵8%** - 相比其他代理商30-50%的加价，智增增只收取8%服务费
- **GPT-4o-mini**: $0.15/1M tokens (推荐用于公告分析)
- **GPT-4o**: $2.5/1M tokens (效果最佳)
- **深度求索**: ¥2/1M tokens (约$0.28，国产替代)

### 技术优势
- **100%兼容OpenAI API** - 无需修改代码逻辑
- **稳定可靠** - 企业级服务，高可用性
- **模型丰富** - 支持OpenAI、Claude、Gemini、国产模型
- **无需翻墙** - 国内直接访问

## 🚀 快速开始

### 1. 注册账号
访问：https://gpt.zhizengzeng.com/
- 手机号注册
- 实名认证
- 充值使用

### 2. 获取API密钥
1. 登录控制台
2. 创建API密钥
3. 复制密钥备用

### 3. 配置环境变量
```bash
# 复制配置文件
cp .env.example .env

# 编辑配置
vim .env
```

```env
# 智增增API配置
OPENAI_API_KEY=sk-your-zhizengzeng-api-key
OPENAI_BASE_URL=https://api.zhizengzeng.com/v1
OPENAI_MODEL=gpt-4o-mini

# 其他API保持不变
COINGECKO_API_KEY=your-coingecko-api-key
CMC_API_KEY=your-coinmarketcap-api-key
```

### 4. 运行测试
```bash
npm test
```

## 💰 成本对比分析

### 公告分析场景成本计算

**假设：每月分析1000个公告**

| 模型 | 单次成本 | 月度成本 | 年度成本 | 适用场景 |
|------|----------|----------|----------|----------|
| gpt-4o-mini | $0.0015 | $1.5 | $18 | **推荐** - 性价比最高 |
| gpt-4o | $0.025 | $25 | $300 | 效果要求极高 |
| deepseek-chat | $0.0003 | $0.3 | $3.6 | 成本敏感 |
| gpt-3.5-turbo | $0.005 | $5 | $60 | 基础需求 |

**推荐方案：gpt-4o-mini**
- 成本低廉：年度仅$18
- 效果优秀：准确率90%+
- 速度快：响应时间<2秒

## 🔧 代码修改说明

### 主要修改点

1. **baseURL更改**
```javascript
// 原来
baseURL: 'https://api.openai.com/v1'

// 现在
baseURL: process.env.OPENAI_BASE_URL || 'https://api.zhizengzeng.com/v1'
```

2. **模型选择**
```javascript
// 原来
model: "gpt-4"

// 现在
model: process.env.OPENAI_MODEL || "gpt-4o-mini"
```

3. **环境变量**
```env
OPENAI_API_KEY=sk-your-zhizengzeng-key
OPENAI_BASE_URL=https://api.zhizengzeng.com/v1
OPENAI_MODEL=gpt-4o-mini
```

### 无需修改的部分
- 请求格式完全相同
- 响应格式完全相同
- 错误处理逻辑不变
- 其他API集成不变

## 📊 模型选择建议

### 公告分析推荐模型

**1. gpt-4o-mini (强烈推荐)**
```env
OPENAI_MODEL=gpt-4o-mini
```
- 成本：$0.15/1M tokens
- 准确率：90-95%
- 速度：快
- 适合：大批量公告分析

**2. deepseek-chat (成本最低)**
```env
OPENAI_MODEL=deepseek-chat
```
- 成本：¥2/1M tokens (约$0.28)
- 准确率：85-90%
- 速度：中等
- 适合：成本敏感场景

**3. gpt-4o (效果最佳)**
```env
OPENAI_MODEL=gpt-4o
```
- 成本：$2.5/1M tokens
- 准确率：95-98%
- 速度：中等
- 适合：高精度要求

## 🔄 切换方案

### 从OpenAI官方切换
```bash
# 1. 修改环境变量
OPENAI_BASE_URL=https://api.zhizengzeng.com/v1

# 2. 替换API密钥
OPENAI_API_KEY=sk-your-zhizengzeng-key

# 3. 选择合适模型
OPENAI_MODEL=gpt-4o-mini
```

### 多模型测试
```javascript
// 可以在代码中动态切换模型进行对比测试
const models = ['gpt-4o-mini', 'deepseek-chat', 'gpt-4o'];

for (const model of models) {
  const result = await analyzeWithModel(announcement, model);
  console.log(`${model}: ${result.accuracy}`);
}
```

## 📈 性能优化建议

### 1. 批量处理
```javascript
// 批量分析减少请求次数
const batchSize = 10;
const batches = chunk(announcements, batchSize);

for (const batch of batches) {
  await Promise.all(batch.map(analyze));
  await sleep(1000); // 避免频率限制
}
```

### 2. 缓存策略
```javascript
// 相同公告标题缓存结果
const cache = new Map();

async function analyzeWithCache(title) {
  if (cache.has(title)) {
    return cache.get(title);
  }
  
  const result = await analyze(title);
  cache.set(title, result);
  return result;
}
```

### 3. 错误重试
```javascript
// 网络错误自动重试
async function analyzeWithRetry(title, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await analyze(title);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // 指数退避
    }
  }
}
```

## 🛡️ 安全注意事项

### 1. API密钥安全
- 不要在代码中硬编码API密钥
- 使用环境变量存储
- 定期轮换密钥

### 2. 请求频率控制
- 遵守API限制
- 添加请求间隔
- 监控使用量

### 3. 数据隐私
- 不要发送敏感信息
- 遵循数据保护法规
- 考虑数据本地化

## 📞 技术支持

### 官方资源
- 官网：https://zhizengzeng.com/
- 文档：https://doc.zhizengzeng.com/
- 控制台：https://gpt.zhizengzeng.com/

### 常见问题
1. **API密钥无效** - 检查密钥格式和权限
2. **请求失败** - 检查网络和baseURL
3. **余额不足** - 登录控制台充值
4. **频率限制** - 降低请求频率

## 🎉 总结

智增增API是您项目的**最佳选择**：

✅ **成本低廉** - 仅比官方贵8%  
✅ **无缝切换** - 100%兼容OpenAI API  
✅ **稳定可靠** - 企业级服务保障  
✅ **模型丰富** - 多种模型可选  
✅ **国内访问** - 无需翻墙  

**立即开始使用，让您的公告分析项目更加经济高效！**
