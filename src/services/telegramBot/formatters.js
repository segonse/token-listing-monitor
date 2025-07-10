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
  message += `<b>📌 发布时间:</b> ${chinaTimeString}\n\n`;

  // if (announcement.tokenInfoArray && announcement.tokenInfoArray.length > 0) {
  //   message += "<b>📌 代币信息:</b>\n";
  //   announcement.tokenInfoArray.forEach((token) => {
  //     if (token.tokenName) message += `   - 代币: ${token.tokenName}\n`;
  //     if (token.projectName) message += `   - 项目: ${token.projectName}\n`;
  //   });
  //   message += "\n";
  // }

  message += `<a href="${announcement.url}">查看详情</a>`;

  return message;
}

module.exports = {
  formatAnnouncementMessage,
};
