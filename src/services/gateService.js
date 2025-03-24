const WebSocket = require("ws");
const { getDynamicProxyConfig } = require("../utils/proxyHelper");

class GateService {
  static async getAnnouncements() {
    return new Promise((resolve, reject) => {
      const announcements = [];
      // 移除 tunnel 代理，因为看起来当前 WebSocket 连接是可以建立的
      const ws = new WebSocket("wss://api.gateio.ws/ws/v4/ann");

      const timeout = setTimeout(() => {
        console.log(
          "Gate.io WebSocket 超时关闭，已收集到 " +
            announcements.length +
            " 条公告"
        );

        ws.close();
        // 确保总是返回数组
        resolve(announcements);
      }, 10000); // 10秒超时

      ws.on("open", () => {
        console.log("Gate.io WebSocket 连接已建立");
        // 订阅公告，获取更多历史公告
        ws.send(
          JSON.stringify({
            time: Math.floor(Date.now() / 1000),
            channel: "announcement.summary_listing",
            event: "subscribe",
            payload: ["cn"],
          })
        );
      });

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());

          // 处理公告消息
          if (
            message.channel === "announcement.summary_listing" &&
            message.event === "update" &&
            message.result
          ) {
            const announcement = message.result;
            const title = announcement.title;

            // 解析标题中的代币信息
            const tokenMatch =
              title.match(/将上线([A-Za-z0-9]+)/) ||
              title.match(/上线([A-Za-z0-9]+)现货交易/) ||
              title.match(/上架代币：([A-Za-z0-9]+)/);

            // 判断公告类型
            let type = "others";
            if (title.includes("盘前")) {
              type = "pre-market";
            } else if (title.includes("Launchpool")) {
              type = "launchpool";
            } else if (
              title.includes("现货交易") ||
              title.includes("上架代币")
            ) {
              type = "spot-listing";
            }

            console.log(`添加 Gate.io 公告: ${title}`);
            announcements.push({
              exchange: "Gate.io",
              title: announcement.title,
              description: announcement.brief,
              type: type,
              url: announcement.origin_url,
              publishTime: new Date(announcement.published_at * 1000),
            });
          }
        } catch (error) {
          console.error("处理 Gate.io 公告消息失败:", error);
        }
      });

      ws.on("error", (error) => {
        console.error("Gate.io WebSocket 错误:", error);
        clearTimeout(timeout);
        // 发生错误时也要确保返回数组
        resolve(announcements);
      });

      ws.on("close", () => {
        console.log(
          `Gate.io WebSocket 连接已关闭，收集到 ${announcements.length} 条公告`
        );
        clearTimeout(timeout);
        // 连接关闭时返回已收集的公告
        resolve(announcements);
      });
    });
  }
}

module.exports = GateService;
