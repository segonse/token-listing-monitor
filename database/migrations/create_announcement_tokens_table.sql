-- 创建公告-代币关联表
CREATE TABLE IF NOT EXISTS announcement_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  announcement_id INT NOT NULL,
  token_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 外键约束
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE,
  
  -- 唯一约束，防止重复关联
  UNIQUE KEY unique_announcement_token (announcement_id, token_id),
  
  -- 索引优化查询
  INDEX idx_announcement_id (announcement_id),
  INDEX idx_token_id (token_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公告和代币的关联表';

-- 为了兼容性，先检查tokens表是否存在announcement_id字段
-- 如果存在，我们需要迁移数据到新的关联表
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'tokens' 
    AND COLUMN_NAME = 'announcement_id'
);

-- 如果announcement_id字段存在，迁移数据
SET @sql = IF(@column_exists > 0, 
  'INSERT IGNORE INTO announcement_tokens (announcement_id, token_id) 
   SELECT announcement_id, id FROM tokens WHERE announcement_id IS NOT NULL',
  'SELECT "No migration needed" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
