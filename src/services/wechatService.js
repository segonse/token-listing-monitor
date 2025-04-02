const axios = require("axios");
require("dotenv").config();

class WechatService {
  static async getAccessToken() {
    try {
      const corpid = process.env.WECHAT_CORPID;
      const corpsecret = process.env.WECHAT_CORPSECRET;

      if (!corpid || !corpsecret) {
        throw new Error("企业微信配置缺失，请检查环境变量");
      }

      const response = await axios.get(
        `https://qyapi.weixin.qq.com/cgi-bin/gettoken`,
        {
          params: {
            corpid,
            corpsecret,
          },
        }
      );

      if (response.data && response.data.access_token) {
        return response.data.access_token;
      } else {
        throw new Error(
          `获取企业微信AccessToken失败: ${JSON.stringify(response.data)}`
        );
      }
    } catch (error) {
      console.error("获取企业微信AccessToken失败:", error.message);
      throw error;
    }
  }

  static async sendMessage(message) {
    try {
      const token = await this.getAccessToken();

      if (!token) {
        console.error("获取微信token失败");
        return false;
      }

      const response = await axios.post(
        `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`,
        {
          touser: "@all",
          msgtype: "text",
          agentid: process.env.WECHAT_AGENTID,
          text: {
            content: message,
          },
        }
      );

      if (response.data.errcode === 0) {
        return true;
      } else {
        console.error("发送微信消息失败:", response.data.errmsg);
        return false;
      }
    } catch (error) {
      console.error("发送微信消息出错:", error.message);
      return false;
    }
  }

  static async sendMessageToUser(userId, message) {
    try {
      const token = await this.getAccessToken();

      if (!token) {
        console.error("获取微信token失败");
        return false;
      }

      const response = await axios.post(
        `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`,
        {
          touser: userId,
          msgtype: "text",
          agentid: process.env.WECHAT_AGENTID,
          text: {
            content: message,
          },
        }
      );

      if (response.data.errcode === 0) {
        return true;
      } else {
        console.error(`发送微信消息给 ${userId} 失败:`, response.data.errmsg);
        return false;
      }
    } catch (error) {
      console.error(`发送微信消息给 ${userId} 出错:`, error.message);
      return false;
    }
  }

  static formatAnnouncementMessage(announcement) {
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

    let message = `🔔 发现新公告！\n\n`;
    message += `📌 交易所: ${announcement.exchange}\n`;
    message += `📌 类型: ${announcement.type}\n`;
    message += `📌 标题: ${announcement.title}\n`;

    if (announcement.tokenName) {
      message += `📌 代币: ${announcement.tokenName}\n`;
    }

    if (announcement.projectName) {
      message += `📌 项目: ${announcement.projectName}\n`;
    }

    message += `📌 发布时间: ${chinaTimeString}\n`;
    message += `📌 查看详情: ${announcement.url}`;

    return message;
  }

  // 保留原来的方法以兼容
  static formatTokenAnnouncementMessage(token, announcement) {
    return this.formatAnnouncementMessage(announcement);
  }
}

module.exports = WechatService;
