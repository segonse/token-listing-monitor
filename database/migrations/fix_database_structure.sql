-- 修复数据库结构问题
-- 1. 修改tokens表name字段允许NULL
-- 2. 修改user_subscriptions表token_filter字段类型为INT并添加外键约束

-- 1. 修改tokens表name字段允许NULL
ALTER TABLE tokens MODIFY COLUMN name VARCHAR(100) NULL COMMENT '代币名称（允许为空，支持只有symbol的情况）';

-- 2. 备份现有的token_filter数据（如果有的话）
CREATE TEMPORARY TABLE temp_token_filters AS
SELECT id, token_filter 
FROM user_subscriptions 
WHERE token_filter IS NOT NULL AND token_filter != '';

-- 3. 修改user_subscriptions表token_filter字段类型为INT
ALTER TABLE user_subscriptions MODIFY COLUMN token_filter INT NULL COMMENT '代币ID筛选（关联tokens表的id字段）';

-- 4. 添加外键约束
ALTER TABLE user_subscriptions 
ADD CONSTRAINT fk_token_filter 
FOREIGN KEY (token_filter) REFERENCES tokens(id) ON DELETE SET NULL;

-- 5. 为token_filter字段添加索引
ALTER TABLE user_subscriptions ADD INDEX idx_token_filter (token_filter);

-- 6. 清理无效的token_filter数据（因为类型已改变，原有的文本数据会变成0或NULL）
UPDATE user_subscriptions SET token_filter = NULL WHERE token_filter = 0;

-- 显示修复完成信息
SELECT 'Database structure fixed successfully!' as status;

-- 显示表结构信息
DESCRIBE tokens;
DESCRIBE user_subscriptions;
