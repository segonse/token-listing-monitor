const axios = require("axios");
const fs = require("fs");
const path = require("path");

// 保存文件的路径
const outputFile = path.join(__dirname, "bitgetAnn.txt");

// 获取指定页码的公告
async function fetchAnnouncements(pageNum) {
  try {
    const response = await axios.post(
      "https://www.bitget.com/v1/cms/helpCenter/content/section/helpContentDetail",
      {
        pageNum: pageNum,
        pageSize: 20,
        params: {
          sectionId: "5955813039257", // 现货的sectionId
          languageId: 3,
          firstSearchTime: 1744793559942,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      }
    );

    if (
      response.data &&
      response.data.code === "200" &&
      response.data.data &&
      response.data.data.items
    ) {
      return response.data.data;
    } else {
      console.error(`Failed to fetch page ${pageNum}: Invalid response format`);
      return { items: [], pages: 0 };
    }
  } catch (error) {
    console.error(`Error fetching page ${pageNum}:`, error.message);
    return { items: [], pages: 0 };
  }
}

// 主函数
async function main() {
  const allTitles = [];
  const totalPages = 33; // 现货公告总共33页

  console.log(
    `Starting to fetch ${totalPages} pages of Bitget spot announcements...`
  );

  // 获取所有页的公告
  for (let page = 1; page <= totalPages; page++) {
    console.log(`Fetching page ${page}/${totalPages}...`);

    const data = await fetchAnnouncements(page);

    if (data.items && data.items.length > 0) {
      // 提取标题并添加到数组
      const titles = data.items.map((item) => {
        // 提取日期（如果有）
        const showTime = item.showTime
          ? new Date(parseInt(item.showTime)).toISOString().split("T")[0]
          : "Unknown Date";

        return `${showTime}\t${item.title}`;
      });

      allTitles.push(...titles);
      console.log(`Got ${titles.length} announcements from page ${page}`);

      // 防止请求过快，添加延迟
      if (page < totalPages) {
        console.log("Waiting 1 second before next request...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } else {
      console.warn(`No items found on page ${page}`);
    }
  }

  // 保存所有标题到文件
  fs.writeFileSync(outputFile, allTitles.join("\n"), "utf8");
  console.log(
    `Done! ${allTitles.length} announcements have been saved to ${outputFile}`
  );
}

// 运行主函数
main().catch((error) => {
  console.error("An error occurred during execution:", error);
});
