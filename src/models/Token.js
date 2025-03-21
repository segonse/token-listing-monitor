const db = require("../config/database");

class Token {
  static async findAll() {
    const [rows] = await db.query("SELECT * FROM tokens");
    return rows;
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
