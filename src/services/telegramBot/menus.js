const { Markup } = require("telegraf");
const queries = require("./queries");

function getMainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📢 订阅公告推送", "subscribe_announcements")],
    [Markup.button.callback("🔍 查询历史公告", "check_history_announcements")],
    // 其他功能按钮...
  ]);
}

async function getExchangesMenu() {
  const exchanges = await queries.getExchangesList();

  // 构建动态键盘
  const buttons = [];
  const maxPerRow = 2; // 每行两个按钮

  for (let i = 0; i < exchanges.length; i += maxPerRow) {
    const row = [];
    for (let j = 0; j < maxPerRow && i + j < exchanges.length; j++) {
      const exchange = exchanges[i + j];
      row.push(
        Markup.button.callback(exchange, `check_${exchange.toLowerCase()}`)
      );
    }
    buttons.push(row);
  }

  // 添加最后一行
  buttons.push([
    Markup.button.callback("查看所有交易所", "check_all_exchanges"),
    Markup.button.callback("返回", "back_to_main"),
  ]);

  return Markup.inlineKeyboard(buttons);
}

async function getAnnouncementTypesMenu(exchange) {
  const types = await queries.getAnnouncementTypes(exchange);

  // 构建动态键盘
  const buttons = [];
  const maxPerRow = 2; // 每行两个按钮

  for (let i = 0; i < types.length; i += maxPerRow) {
    const row = [];
    for (let j = 0; j < maxPerRow && i + j < types.length; j++) {
      const type = types[i + j];
      row.push(Markup.button.callback(type, `type_${exchange}_${type}`));
    }
    buttons.push(row);
  }

  // 添加最后一行
  buttons.push([
    Markup.button.callback("所有类型", `type_${exchange}_all`),
    Markup.button.callback("返回", "check_history_announcements"),
  ]);

  return Markup.inlineKeyboard(buttons);
}

function getTokenFilterMenu(exchange, type) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "是，输入代币名称",
        `filter_token_${exchange}_${type}`
      ),
    ],
    [
      Markup.button.callback(
        "否，继续查询",
        `select_limit_${exchange}_${type}`
      ),
    ],
  ]);
}

function getLimitMenu(exchange, type) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("1条", `execute_query_${exchange}_${type}_1`),
      Markup.button.callback("5条", `execute_query_${exchange}_${type}_5`),
    ],
    [
      Markup.button.callback("10条", `execute_query_${exchange}_${type}_10`),
      Markup.button.callback("20条", `execute_query_${exchange}_${type}_20`),
    ],
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
  getExchangesMenu,
  getAnnouncementTypesMenu,
  getTokenFilterMenu,
  getLimitMenu,
  getResultNavMenu,
};
