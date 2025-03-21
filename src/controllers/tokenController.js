const Token = require("../models/Token");

class TokenController {
  // 获取所有监控的代币
  static async getAllTokens(req, res) {
    try {
      const tokens = await Token.findAll();
      res.json({
        success: true,
        data: tokens,
      });
    } catch (error) {
      console.error("获取代币列表失败:", error.message);
      res.status(500).json({
        success: false,
        message: "获取代币列表失败",
      });
    }
  }

  // 添加新的监控代币
  static async addToken(req, res) {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "代币名称不能为空",
        });
      }

      // 检查是否已存在
      const existingToken = await Token.findByName(name);
      if (existingToken) {
        return res.status(400).json({
          success: false,
          message: `代币 ${name} 已经在监控列表中`,
        });
      }

      // 创建新代币
      const id = await Token.create({ name });

      res.json({
        success: true,
        message: `成功添加代币 ${name} 到监控列表`,
        data: { id, name },
      });
    } catch (error) {
      console.error("添加代币失败:", error.message);
      res.status(500).json({
        success: false,
        message: "添加代币失败",
      });
    }
  }

  // 删除监控代币
  static async deleteToken(req, res) {
    try {
      const { id } = req.params;

      const token = await Token.findById(id);
      if (!token) {
        return res.status(404).json({
          success: false,
          message: "代币不存在",
        });
      }

      await Token.delete(id);

      res.json({
        success: true,
        message: `成功从监控列表中移除代币 ${token.name}`,
      });
    } catch (error) {
      console.error("删除代币失败:", error.message);
      res.status(500).json({
        success: false,
        message: "删除代币失败",
      });
    }
  }
}

module.exports = TokenController;
