# 公告监控系统优化更新日志

## 🚀 主要优化内容

### 1. AI调用优化 ⚡
**问题**: 每次检查都对所有公告进行AI分析，导致API调用量过高
**解决方案**: 
- 改为基于 `URL + 标题内容` 进行去重判断
- 只对真正的增量公告调用AI分析
- 预计可减少80%以上的AI API调用量

### 2. 数据库结构优化 🗃️
**新增表**: `announcement_tokens` - 公告与代币的关联表
- 支持一对多关系（一个公告可关联多个代币）
- 提供更灵活的查询和订阅管理
- 优化了数据存储结构

### 3. 代币提取逻辑增强 🔍
**原有限制**: 只提取同时包含name和symbol的代币信息
**新增功能**:
- 支持提取只有symbol的代币信息（如"ETHUSDT永续合约"中的ETH）
- 渐进式数据完善：首次只有symbol，后续获取到name时自动更新
- 更全面的代币信息收集

### 4. 订阅系统重构 📋
**改进**:
- `token_filter`字段现在存储代币表的ID而非文本
- 支持精确的代币匹配
- 提供代币搜索API，用户可通过按钮选择代币
- 更智能的订阅管理

## 📁 新增文件

### 模型文件
- `src/models/AnnouncementToken.js` - 公告-代币关联模型

### 数据库迁移
- `database/migrations/create_announcement_tokens_table.sql` - 创建关联表
- `database/migrations/run_all_migrations.sql` - 执行所有迁移

### 测试文件
- `test/test_new_features.js` - 新功能测试脚本

## 🔧 修改的文件

### 核心服务
- `src/services/monitorService.js` - 优化去重逻辑，减少AI调用
- `src/services/subscriptionService.js` - 更新订阅匹配逻辑
- `src/services/binanceService.js` - 增强代币提取提示词
- `src/services/okxService.js` - 增强代币提取提示词
- `src/services/bitgetService.js` - 使用新的代币提取方法

### 模型
- `src/models/Token.js` - 重构findOrCreate方法，支持渐进式数据完善
- `src/models/Announcement.js` - 使用新的关联表结构

### 控制器和路由
- `src/controllers/tokenController.js` - 添加搜索和详情API
- `src/routes/index.js` - 新增代币搜索路由

## 🚀 新增API端点

### 代币相关
- `GET /api/tokens/search?query=关键词` - 搜索代币
- `GET /api/tokens/:id` - 获取代币详情及相关公告

## 📊 预期效果

### 成本优化
- **AI调用量减少**: 80%+ 的AI API调用量减少
- **查询性能提升**: 基于ID的精确匹配替代文本模糊匹配

### 功能增强
- **数据完整性**: 更全面的代币信息收集
- **用户体验**: 智能的代币选择界面
- **扩展性**: 支持复杂的代币关联关系

### 系统稳定性
- **去重准确性**: 基于URL+标题的更可靠去重机制
- **数据一致性**: 规范化的数据存储结构

## 🔄 迁移步骤

1. **执行数据库迁移**:
   ```bash
   mysql -u username -p database_name < database/migrations/run_all_migrations.sql
   ```

2. **测试新功能**:
   ```bash
   node test/test_new_features.js
   ```

3. **重启服务**:
   ```bash
   pm2 restart all
   ```

## ⚠️ 注意事项

1. **向后兼容**: 现有的订阅数据需要手动迁移到新的ID格式
2. **AI提示词**: 已更新Binance和OKX的AI分析提示词
3. **数据库索引**: 新增了代币表的name和symbol索引，提升查询性能

## 🧪 测试建议

运行测试脚本验证以下功能：
- 代币的查找和创建
- 文本中代币信息的提取
- 公告与代币的关联
- 代币搜索功能
- 订阅匹配逻辑

---

**更新时间**: 2025-01-17
**版本**: v2.0.0
