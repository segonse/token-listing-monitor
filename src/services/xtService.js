const cheerio = require("cheerio");
const { getDynamicProxyConfig } = require("../utils/proxyHelper");
// 导入 node-tls-client 库
const nodeTlsClient = require("../utils/node-tls-client");

class XtService {
  static async getAnnouncements() {
    try {
      // 获取代理配置
      const proxyConfig = getDynamicProxyConfig();
      const proxyUrl = `http://${proxyConfig.auth.username}:${proxyConfig.auth.password}@${proxyConfig.host}:${proxyConfig.port}`;

      // 定义请求头
      const headers = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Cache-Control": "max-age=0",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      };

      // 创建 TLS 客户端
      const client = nodeTlsClient.createClient({
        headers: headers,
        proxy: proxyUrl,
        logLevel: nodeTlsClient.LOG_LEVEL.WARN,
      });

      // 发送请求获取 HTML 内容
      const targetUrl =
        "https://xtsupport.zendesk.com/hc/zh-cn/sections/900000084163-%E6%95%B0%E5%AD%97%E8%B4%A7%E5%B8%81%E5%8F%8A%E4%BA%A4%E6%98%93%E5%AF%B9%E4%B8%8A%E6%96%B0?page=1";
      const response = await client.get(targetUrl, {
        insecureSkipVerify: true,
      });

      if (response.status !== 200) {
        throw new Error(`获取 XT 交易所公告失败: HTTP ${response.status}`);
      }

      // 获取响应内容
      const htmlContent = await response.text();
      //   console.log(htmlContent);

      // 使用 cheerio 解析 HTML
      const $ = cheerio.load(htmlContent);

      const announcements = [];

      // 获取公告列表
      $(".article-list-item").each((index, element) => {
        const $element = $(element);
        const $link = $element.find("a");
        const title = $link.text().trim();
        const url = "https://xtsupport.zendesk.com" + $link.attr("href");

        // 根据标题判断公告类型
        let type = "others";
        if (title.includes("上线") && title.includes("交易")) {
          type = "spot-listing";
        } else if (title.includes("上线") && title.includes("期货")) {
          type = "futures";
        }

        // 提取代币名称和符号
        const tokenMatch = title.match(/上线([A-Za-z0-9]+)[（(]([^)）]+)[)）]/);
        const description = tokenMatch
          ? `代币: ${tokenMatch[1]}, 全称: ${tokenMatch[2]}`
          : "暂无详细描述";

        // 创建公告对象
        announcements.push({
          exchange: "XT",
          title: title,
          description: description,
          type: type,
          url: url,
          publishTime: new Date(), // 由于页面上没有显示具体时间，使用当前时间
        });
      });
      //   console.log(announcements);

      console.log(`获取到 ${announcements.length} 条 XT 交易所公告`);
      return announcements;
    } catch (error) {
      console.error("获取 XT 交易所公告失败:", error.message);
      return [];
    }
  }
}

module.exports = XtService;
