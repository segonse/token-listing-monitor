-- 运行所有数据库迁移
-- 执行顺序很重要，请按顺序执行

-- 1. 创建公告-代币关联表
SOURCE create_announcement_tokens_table.sql;

-- 2. 检查并更新tokens表结构（如果需要）
-- 确保tokens表有symbol字段
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'tokens' 
    AND COLUMN_NAME = 'symbol'
);

SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE tokens ADD COLUMN symbol VARCHAR(20) NULL AFTER name',
  'SELECT "Symbol column already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. 检查并移除tokens表的announcement_id字段（如果存在）
-- 因为现在使用关联表
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'tokens' 
    AND COLUMN_NAME = 'announcement_id'
);

SET @sql = IF(@column_exists > 0, 
  'ALTER TABLE tokens DROP COLUMN announcement_id',
  'SELECT "announcement_id column does not exist" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. 为tokens表添加索引（如果不存在）
-- 为symbol字段添加索引
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'tokens' 
    AND INDEX_NAME = 'idx_symbol'
);

SET @sql = IF(@index_exists = 0, 
  'ALTER TABLE tokens ADD INDEX idx_symbol (symbol)',
  'SELECT "Symbol index already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 为name字段添加索引
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'tokens' 
    AND INDEX_NAME = 'idx_name'
);

SET @sql = IF(@index_exists = 0, 
  'ALTER TABLE tokens ADD INDEX idx_name (name)',
  'SELECT "Name index already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. 更新user_subscriptions表的注释
ALTER TABLE user_subscriptions MODIFY COLUMN token_filter VARCHAR(255) NULL COMMENT '代币筛选条件（现在存储代币ID）';

-- 显示迁移完成信息
SELECT 'All migrations completed successfully!' as status;
