const db = require("../config/database");

class Announcement {
  static async findAll() {
    const [rows] = await db.query("SELECT * FROM announcements");
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query("SELECT * FROM announcements WHERE id = ?", [
      id,
    ]);
    return rows[0];
  }

  static async findByURL(url) {
    const [rows] = await db.query("SELECT * FROM announcements WHERE url = ?", [
      url,
    ]);
    return rows[0];
  }

  static async create(announcement) {
    const now = new Date();
    const [result] = await db.query(
      "INSERT INTO announcements (exchange, title, description, type, url, publishTime, token_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        announcement.exchange,
        announcement.title,
        announcement.description,
        announcement.type,
        announcement.url,
        announcement.publishTime,
        announcement.token_id,
        now,
        now,
      ]
    );
    return result.insertId;
  }

  static async update(id, announcement) {
    const now = new Date();
    await db.query(
      "UPDATE announcements SET exchange = ?, title = ?, description = ?, type = ?, url = ?, publishTime = ?, token_id = ?, updated_at = ? WHERE id = ?",
      [
        announcement.exchange,
        announcement.title,
        announcement.description,
        announcement.type,
        announcement.url,
        announcement.publishTime,
        announcement.token_id,
        now,
        id,
      ]
    );
  }

  static async delete(id) {
    await db.query("DELETE FROM announcements WHERE id = ?", [id]);
  }
}

module.exports = Announcement;
