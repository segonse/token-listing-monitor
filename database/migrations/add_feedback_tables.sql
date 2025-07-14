-- 创建管理员表
CREATE TABLE IF NOT EXISTS admins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(100) NOT NULL UNIQUE COMMENT '用户ID，格式如 tg_123456789',
  name VARCHAR(100) COMMENT '管理员名称',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
) COMMENT='管理员表';

-- 创建用户反馈表
CREATE TABLE IF NOT EXISTS user_feedback (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户数据库ID',
  telegram_user_id VARCHAR(100) NOT NULL COMMENT 'Telegram用户ID',
  type ENUM('bug', 'feature', 'improvement', 'other') NOT NULL COMMENT '反馈类型',
  title VARCHAR(200) NOT NULL COMMENT '反馈标题',
  content TEXT NOT NULL COMMENT '反馈内容',
  status ENUM('pending', 'in_progress', 'resolved', 'rejected') DEFAULT 'pending' COMMENT '处理状态',
  admin_reply TEXT COMMENT '管理员回复',
  admin_id INT COMMENT '处理的管理员ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_telegram_user_id (telegram_user_id),
  INDEX idx_status (status),
  INDEX idx_type (type),
  INDEX idx_created_at (created_at)
) COMMENT='用户反馈表';

-- 插入默认管理员（请根据实际情况修改user_id）
-- INSERT INTO admins (user_id, name) VALUES ('tg_6499471563', '系统管理员');
