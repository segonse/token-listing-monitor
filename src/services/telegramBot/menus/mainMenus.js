const { Markup } = require("telegraf");

function getMainMenu(isAdmin = false) {
  const buttons = [
    [Markup.button.callback("🔔 管理订阅", "manage_subscriptions")],
    [Markup.button.callback("🔍 查询历史公告", "check_history_announcements")],
  ];

  if (isAdmin) {
    buttons.push([
      Markup.button.callback("📊 查看反馈", "admin_view_feedback"),
    ]);
  } else {
    buttons.push([Markup.button.callback("💬 反馈建议", "user_feedback")]);
  }

  return Markup.inlineKeyboard(buttons);
}

function getResultNavMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("返回交易所选择", "check_history_announcements")],
    [Markup.button.callback("返回主菜单", "back_to_main")],
  ]);
}

module.exports = {
  getMainMenu,
  getResultNavMenu,
};
