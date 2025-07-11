const { Markup } = require("telegraf");

function getMainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🔔 管理订阅", "manage_subscriptions")],
    [Markup.button.callback("🔍 查询历史公告", "check_history_announcements")],
  ]);
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
