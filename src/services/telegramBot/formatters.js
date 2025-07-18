function formatAnnouncementMessage(announcement) {
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

  let message = `<b>🔔 ${announcement.exchange}公告</b>\n\n`;
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

  message += `<b>📌 发布时间:</b> ${chinaTimeString}\n\n`;
  message += `<a href="${announcement.url}">查看详情</a>`;

  return message;
}

module.exports = {
  formatAnnouncementMessage,
};
