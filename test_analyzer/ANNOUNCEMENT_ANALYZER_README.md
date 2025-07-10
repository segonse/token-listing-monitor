# 公告分析器 - AI驱动的加密货币交易所公告分析工具

## 功能特性

🤖 **AI智能分析** - 使用GPT-4自动分类公告类型和提取代币信息  
📊 **多源数据聚合** - 整合CoinGecko、CoinMarketCap等数据源  
🔄 **批量处理** - 支持批量分析多个公告  
📈 **详细报告** - 生成分析报告和统计数据  
💾 **结果保存** - 自动保存分析结果为JSON格式  

## 支持的公告类型

- ✅ **NEW_LISTING** - 新代币上线
- ❌ **DELISTING** - 代币下线  
- 🔄 **TRADING_PAIR** - 新交易对添加
- 🔧 **MAINTENANCE** - 系统维护
- 🎉 **PROMOTION** - 活动推广
- 🪂 **AIRDROP** - 空投相关
- 📝 **OTHER** - 其他类型

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置API密钥

复制环境变量模板：
```bash
cp .env.example .env
```

编辑 `.env` 文件，填入您的API密钥：

```env
# 必需 - OpenAI API密钥
OPENAI_API_KEY=sk-your-openai-api-key

# 可选 - CoinGecko API密钥 (免费版可不填)
COINGECKO_API_KEY=your-coingecko-api-key

# 推荐 - CoinMarketCap API密钥
CMC_API_KEY=your-coinmarketcap-api-key
```

### 3. 运行测试

```bash
npm test
```

### 4. 自定义使用

```javascript
const AnnouncementAnalyzer = require('./announcement_analyzer');

async function analyzeMyAnnouncements() {
  const analyzer = new AnnouncementAnalyzer();
  
  // 分析单个公告
  const result = await analyzer.processAnnouncement(
    "Binance Will List Pepe (PEPE) in the Innovation Zone",
    "binance"
  );
  
  console.log(result);
}
```

## API密钥获取

### OpenAI API (必需)
1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 注册账号并创建API密钥
3. 确保账户有足够余额 (每次调用约$0.01-0.03)

### CoinGecko API (可选)
1. 访问 [CoinGecko API](https://www.coingecko.com/en/api)
2. 免费版每分钟10-50次请求
3. 付费版可获得更高限制

### CoinMarketCap API (推荐)
1. 访问 [CoinMarketCap API](https://coinmarketcap.com/api/)
2. 免费版每月10,000次请求
3. 数据质量和覆盖面较好

## 使用示例

### 批量分析公告

```javascript
const announcements = [
  {
    title: "Binance Will List Pepe (PEPE) in the Innovation Zone",
    exchange: "binance"
  },
  {
    title: "OKX Will List Arbitrum (ARB) for Spot Trading", 
    exchange: "okx"
  }
];

const analyzer = new AnnouncementAnalyzer();
await analyzer.processAnnouncements(announcements);
analyzer.generateReport();
analyzer.saveResults();
```

### 输出示例

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "original_title": "Binance Will List Pepe (PEPE) in the Innovation Zone",
  "exchange": "binance",
  "analysis": {
    "category": "NEW_LISTING",
    "confidence": 0.98,
    "tokens": [
      {
        "name": "Pepe",
        "symbol": "PEPE",
        "trading_pairs": ["USDT", "BTC", "ETH"]
      }
    ],
    "analysis": "这是一个新代币上线公告"
  },
  "enriched_tokens": [
    {
      "name": "Pepe",
      "symbol": "PEPE",
      "price_usd": 0.00000123,
      "market_cap": 500000000,
      "contract_address": "0x6982508145454ce325ddbe47a25d4ec3d2311933",
      "homepage": "https://pepe.vip"
    }
  ]
}
```

## 成本估算

### OpenAI API成本
- GPT-4调用: ~$0.03/1K tokens
- 每个公告约100-200 tokens
- **单次分析成本: $0.003-0.006**
- **100个公告约: $0.30-0.60**

### 数据源API成本
- CoinGecko: 免费版足够测试使用
- CoinMarketCap: 免费版每月10K请求
- **基本免费使用**

## 注意事项

⚠️ **API限制**
- OpenAI有速率限制，建议添加延迟
- CoinGecko免费版有请求限制
- 建议生产环境使用付费API

⚠️ **准确性**
- AI分析准确率约90-95%
- 建议人工审核重要结果
- 持续优化提示词可提高准确率

⚠️ **合规性**
- 遵循各API服务商的使用条款
- 不要过度频繁请求
- 注意数据使用的法律法规

## 扩展功能

### 添加新的数据源
```javascript
async getTokenInfoFromNewSource(symbol) {
  // 实现新的数据源集成
}
```

### 自定义分析逻辑
```javascript
// 修改提示词以适应特定需求
const customPrompt = `
根据您的具体需求定制分析逻辑...
`;
```

### 结果后处理
```javascript
// 添加自定义的结果处理逻辑
processResults(results) {
  // 自定义处理逻辑
}
```

## 故障排除

### 常见错误

1. **OpenAI API错误**
   - 检查API密钥是否正确
   - 确认账户余额充足
   - 检查网络连接

2. **数据源API错误**
   - 检查API密钥配置
   - 确认请求频率未超限
   - 检查代币符号是否正确

3. **JSON解析错误**
   - GPT-4偶尔返回格式不规范
   - 脚本会自动重试和容错处理

### 调试模式

设置环境变量启用详细日志：
```bash
NODE_ENV=development npm test
```

## 贡献

欢迎提交Issue和Pull Request来改进这个工具！

## 许可证

MIT License
