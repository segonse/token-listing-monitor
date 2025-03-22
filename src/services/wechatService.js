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

  static async sendMessage(message, touser = "@all") {
    try {
      const accessToken = await this.getAccessToken();
      const agentid = process.env.WECHAT_AGENTID;

      if (!agentid) {
        throw new Error("企业微信AgentID缺失，请检查环境变量");
      }

      const response = await axios.post(
        `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`,
        {
          touser,
          msgtype: "text",
          agentid,
          text: {
            content: message,
          },
          safe: 0,
        }
      );

      if (response.data && response.data.errcode === 0) {
        console.log("企业微信消息发送成功");
        return true;
      } else {
        throw new Error(
          `企业微信消息发送失败: ${JSON.stringify(response.data)}`
        );
      }
    } catch (error) {
      console.error("企业微信消息发送失败:", error.message);
      return false;
    }
  }

  static formatTokenAnnouncementMessage(token, announcement) {
    let typeDesc;

    // 根据交易所和类型显示不同的类型描述
    switch (announcement.type) {
      case "pre-market":
        typeDesc = "盘前交易";
        break;
      case "spot-listing":
        typeDesc = "现货上市";
        break;
      default:
        typeDesc = announcement.type;
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

    return (
      `🔔 发现代币上市信息！\n\n` +
      `📌 代币名称: ${token.name}\n` +
      `📌 交易所: ${announcement.exchange}\n` +
      `📌 类型: ${typeDesc}\n` +
      `📌 标题: ${announcement.title}\n` +
      `📌 发布时间: ${chinaTimeString}\n` +
      `📌 查看详情: ${announcement.url}`
    );
  }
}

module.exports = WechatService;
