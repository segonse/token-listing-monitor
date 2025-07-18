const axios = require("axios");
const tunnel = require("tunnel");
const { getDynamicProxyConfig } = require("../utils/proxyHelper");
require("dotenv").config();

class TelegramService {
  static async sendMessage(message) {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;

      if (!botToken || !chatId) {
        throw new Error("Telegram配置缺失，请检查环境变量");
      }

      // 获取代理配置
      const proxyConfig = getDynamicProxyConfig();

      // 创建代理隧道
      const agent = tunnel.httpsOverHttp({
        proxy: {
          host: proxyConfig.host,
          port: proxyConfig.port,
          proxyAuth: `${proxyConfig.auth.username}:${proxyConfig.auth.password}`,
        },
      });

      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        },
        {
          httpsAgent: agent,
          timeout: 30000,
        }
      );

      if (response.data && response.data.ok) {
        return true;
      } else {
        console.error(`发送Telegram消息失败: ${JSON.stringify(response.data)}`);
        return false;
      }
    } catch (error) {
      console.error("发送Telegram消息出错:", error.message);
      return false;
    }
  }

  static async sendMessageToUser(userId, message) {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;

      if (!botToken || !userId) {
        throw new Error("Telegram配置缺失或用户ID无效");
      }

      // 获取代理配置
      const proxyConfig = getDynamicProxyConfig();

      // 创建代理隧道
      const agent = tunnel.httpsOverHttp({
        proxy: {
          host: proxyConfig.host,
          port: proxyConfig.port,
          proxyAuth: `${proxyConfig.auth.username}:${proxyConfig.auth.password}`,
        },
      });

      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: userId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        },
        {
          httpsAgent: agent,
          timeout: 30000,
        }
      );

      if (response.data && response.data.ok) {
        return true;
      } else {
        console.error(
          `发送Telegram消息给用户 ${userId} 失败: ${JSON.stringify(
            response.data
          )}`
        );
        return false;
      }
    } catch (error) {
      console.error(`发送Telegram消息给用户 ${userId} 出错:`, error.message);
      return false;
    }
  }

  static formatAnnouncementMessage(announcement) {
    // Telegram支持HTML格式
    let message = `<b>🔔 发现新公告！</b>\n\n`;
    message += `<b>📌 交易所:</b> ${announcement.exchange}\n`;
    message += `<b>📌 类型:</b> ${announcement.type}\n`;
    message += `<b>📌 标题:</b> ${announcement.title}\n`;

    // 添加代币信息显示
    if (announcement.tokenInfoArray && announcement.tokenInfoArray.length > 0) {
      const tokenList = announcement.tokenInfoArray
        .map((token) => {
          if (token.name && token.symbol) {
            return `${token.symbol}(${token.name})`;
          } else if (token.symbol) {
            return token.symbol;
          } else if (token.name) {
            return token.name;
          }
          return null;
        })
        .filter((token) => token !== null)
        .join(", ");

      if (tokenList) {
        message += `<b>📌 相关代币:</b> ${tokenList}\n`;
      }
    }

    // 格式化为中国时区的时间字符串
    const chinaTimeString = announcement.publishTime.toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    message += `<b>📌 发布时间:</b> ${chinaTimeString}\n`;
    message += `<b>📌 查看详情:</b> ${announcement.url}`;

    return message;
  }
}

module.exports = TelegramService;
