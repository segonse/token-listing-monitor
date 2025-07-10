const axios = require("axios");
require("dotenv").config();

class AIAnalyzerService {
  constructor() {
    this.config = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || "",
        baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      },
    };
  }

  /**
   * 使用AI分析公告标题，提取分类和代币信息
   * @param {string} title - 公告标题
   * @param {string} exchange - 交易所名称
   * @param {string} prompt - 分析提示词
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeAnnouncement(title, exchange = "unknown", prompt) {
    if (!prompt) {
      throw new Error("分析提示词(prompt)不能为空");
    }

    if (!this.config.openai.apiKey) {
      throw new Error("未配置OpenAI API Key，请设置OPENAI_API_KEY环境变量");
    }

    // 重试机制：最多重试2次，间隔2秒
    const maxRetries = 2;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`AI分析尝试 ${attempt + 1}/${maxRetries + 1}: ${title}`);

        const response = await axios.post(
          `${this.config.openai.baseURL}/chat/completions`,
          {
            model: this.config.openai.model,
            messages: [
              {
                role: "system",
                content:
                  "你是一个专业的加密货币交易所公告分析专家，擅长准确分类公告类型和提取代币信息。",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.1,
          },
          {
            headers: {
              Authorization: `Bearer ${this.config.openai.apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 30000,
          }
        );

        const content = response.data.choices[0].message.content;
        console.log(`AI分析结果 (${title}):`, content);

        // 尝试解析JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          
          return this.validateAndNormalizeResult(result, title, exchange);
        } else {
          throw new Error("无法解析AI响应为JSON格式");
        }
      } catch (error) {
        lastError = error;
        console.error(`AI分析尝试 ${attempt + 1} 失败:`, error.message);

        // 如果不是最后一次尝试，等待2秒后重试
        if (attempt < maxRetries) {
          console.log("2秒后重试...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    // 所有重试都失败，抛出最后一个错误
    throw new Error(`AI分析失败，已重试${maxRetries}次: ${lastError.message}`);
  }

  /**
   * 验证和标准化AI分析结果
   * @param {Object} result - AI返回的原始结果
   * @param {string} title - 原始标题
   * @param {string} exchange - 交易所
   * @returns {Object} 标准化后的结果
   */
  validateAndNormalizeResult(result, title, exchange) {
    // 确保必要字段存在
    const normalized = {
      categories: Array.isArray(result.categories)
        ? result.categories
        : ["未分类"],
      confidence:
        typeof result.confidence === "number" ? result.confidence : 0.5,
      tokens: Array.isArray(result.tokens) ? result.tokens : [],
      exchange: exchange,
      analysis: result.analysis || "AI分析完成",
    };

    // 验证代币信息格式
    normalized.tokens = normalized.tokens
      .filter(
        (token) =>
          token && typeof token.symbol === "string" && token.symbol.length > 0
      )
      .map((token) => ({
        name: token.name,
        symbol: token.symbol,
      }));

    return normalized;
  }

  /**
   * 批量分析公告
   * @param {Array} announcements - 公告数组
   * @param {string} prompt - 分析提示词
   * @returns {Promise<Array>} 分析结果数组
   */
  async batchAnalyze(announcements, prompt) {
    const results = [];

    for (let i = 0; i < announcements.length; i++) {
      const announcement = announcements[i];
      console.log(
        `分析公告 ${i + 1}/${announcements.length}: ${announcement.title}`
      );

      try {
        const result = await this.analyzeAnnouncement(
          announcement.title,
          announcement.exchange,
          prompt
        );
        results.push({
          ...announcement,
          aiAnalysis: result,
        });

        // 避免API限制
        if (i < announcements.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`分析公告失败: ${announcement.title}`, error.message);
        results.push({
          ...announcement,
          aiAnalysis: {
            categories: ["未分类"],
            confidence: 0,
            tokens: [],
            exchange: announcement.exchange,
            analysis: `分析失败: ${error.message}`,
          },
        });
      }
    }

    return results;
  }
}

module.exports = AIAnalyzerService;
