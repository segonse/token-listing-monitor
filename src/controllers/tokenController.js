const Token = require("../models/Token");

class TokenController {
  /**
   * 搜索代币
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async searchTokens(req, res) {
    try {
      const { query, limit = 20 } = req.query;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "搜索关键词不能为空",
        });
      }

      const tokens = await Token.search(query.trim());

      // 限制返回数量
      const limitedTokens = tokens.slice(0, parseInt(limit));

      return res.json({
        success: true,
        data: limitedTokens,
        total: limitedTokens.length,
        message: `找到 ${limitedTokens.length} 个匹配的代币`,
      });
    } catch (error) {
      console.error("搜索代币失败:", error.message);
      return res.status(500).json({
        success: false,
        message: "搜索代币失败",
        error: error.message,
      });
    }
  }

  // 获取所有监控的代币
  static async getAllTokens(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const tokens = await Token.findAll();

      // 简单分页
      const paginatedTokens = tokens.slice(offset, offset + parseInt(limit));

      res.json({
        success: true,
        data: paginatedTokens,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: tokens.length,
          totalPages: Math.ceil(tokens.length / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("获取代币列表失败:", error.message);
      res.status(500).json({
        success: false,
        message: "获取代币列表失败",
      });
    }
  }

  /**
   * 根据ID获取代币详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async getTokenById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          success: false,
          message: "无效的代币ID",
        });
      }

      const token = await Token.findById(parseInt(id));

      if (!token) {
        return res.status(404).json({
          success: false,
          message: "代币不存在",
        });
      }

      // 获取相关公告
      const AnnouncementToken = require("../models/AnnouncementToken");
      const relatedAnnouncements =
        await AnnouncementToken.getAnnouncementsByTokenId(token.id);

      return res.json({
        success: true,
        data: {
          ...token,
          relatedAnnouncements: relatedAnnouncements,
        },
      });
    } catch (error) {
      console.error("获取代币详情失败:", error.message);
      return res.status(500).json({
        success: false,
        message: "获取代币详情失败",
        error: error.message,
      });
    }
  }

  // 添加新的监控代币
  static async addToken(req, res) {
    try {
      const { name, symbol } = req.body;

      if (!name && !symbol) {
        return res.status(400).json({
          success: false,
          message: "代币名称和符号至少需要提供一个",
        });
      }

      // 使用新的findOrCreate方法
      const token = await Token.findOrCreate(name, symbol);

      if (!token) {
        return res.status(500).json({
          success: false,
          message: "创建代币失败",
        });
      }

      res.json({
        success: true,
        message: `成功添加代币到监控列表`,
        data: token,
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
