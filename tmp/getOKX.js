const axios = require("axios");
const tunnel = require("tunnel");
const fs = require("fs").promises;
const { getDynamicProxyConfig } = require("../src/utils/proxyHelper");
require("dotenv").config();

async function getOKXAnnouncements() {
  try {
    // 获取随机代理配置
    const proxyConfig = getDynamicProxyConfig();

    // 创建代理隧道
    const agent = tunnel.httpsOverHttp({
      proxy: {
        host: proxyConfig.host,
        port: proxyConfig.port,
        proxyAuth: `${proxyConfig.auth.username}:${proxyConfig.auth.password}`,
      },
    });

    let allTitles = [];

    // 获取1-12页的公告
    for (let page = 1; page <= 1; page++) {
      try {
        const response = await axios.get(
          "https://www.okx.com/api/v5/support/announcements",
          {
            params: {
              page: page,
              annType: "announcements-jumpstart",
            },
            httpsAgent: agent,
            timeout: 30000,
          }
        );

        if (
          response.data &&
          response.data.code === "0" &&
          response.data.data &&
          response.data.data.length > 0
        ) {
          const announcements = response.data.data[0].details || [];
          const titles = announcements.map((item) => item.title);
          allTitles = allTitles.concat(titles);
        }

        // 添加延迟，避免请求过快
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`获取第${page}页OKX公告失败:`, error.message);
      }
    }

    // 将所有标题写入文件，每个标题占一行
    if (allTitles.length > 0) {
      await fs.writeFile("tmp/OKX2.txt", allTitles.join("\n"));
      console.log(`成功获取${allTitles.length}条公告标题并保存到文件`);
    } else {
      console.log("未获取到任何公告");
    }
  } catch (error) {
    console.error("脚本执行失败:", error.message);
  }
}

// 执行函数
getOKXAnnouncements();
