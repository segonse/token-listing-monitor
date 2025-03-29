const db = require("../config/database");

class Token {
  static async findOrCreate(
    tokenName,
    projectName = null,
    announcementId = null
  ) {
    try {
      // 先检查是否已存在相同的代币名称
      const [existingTokens] = await db.query(
        `SELECT * FROM tokens WHERE name = ?`,
        [tokenName]
      );

      if (existingTokens.length > 0) {
        // 已存在该代币名称，返回现有记录
        return existingTokens[0];
      }

      // 不存在则创建新记录
      const [result] = await db.query(
        `INSERT INTO tokens (name, project_name, announcement_id, created_at, updated_at) 
         VALUES (?, ?, ?, NOW(), NOW())`,
        [tokenName, projectName, announcementId]
      );

      return {
        id: result.insertId,
        name: tokenName,
        project_name: projectName,
        announcement_id: announcementId,
      };
    } catch (error) {
      console.error("Token findOrCreate 失败:", error.message);
      return null;
    }
  }

  static async findAll() {
    try {
      const [tokens] = await db.query(`SELECT * FROM tokens`);
      return tokens;
    } catch (error) {
      console.error("获取所有代币失败:", error.message);
      return [];
    }
  }

  static async findById(id) {
    const [rows] = await db.query("SELECT * FROM tokens WHERE id = ?", [id]);
    return rows[0];
  }

  static async findByName(name) {
    const [rows] = await db.query("SELECT * FROM tokens WHERE name = ?", [
      name,
    ]);
    return rows[0];
  }

  static async create(token) {
    const now = new Date();
    const [result] = await db.query(
      "INSERT INTO tokens (name, created_at, updated_at) VALUES (?, ?, ?)",
      [token.name, now, now]
    );
    return result.insertId;
  }

  static async update(id, token) {
    const now = new Date();
    await db.query("UPDATE tokens SET name = ?, updated_at = ? WHERE id = ?", [
      token.name,
      now,
      id,
    ]);
  }

  static async delete(id) {
    await db.query("DELETE FROM tokens WHERE id = ?", [id]);
  }
}

module.exports = Token;
