const { Markup } = require("telegraf");
const queries = require("./queries");

function getMainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🔔 管理订阅", "manage_subscriptions")],
    [Markup.button.callback("🔍 查询历史公告", "check_history_announcements")],
    [Markup.button.callback("📈 查看系统状态", "check_system_status")],
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
        "是，输入代币符号/名称",
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

// 订阅管理主菜单
function getSubscriptionMainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("➕ 添加订阅", "add_subscription")],
    [Markup.button.callback("📋 查看订阅", "view_subscriptions")],
    [Markup.button.callback("🗑️ 删除订阅", "delete_subscription")],
    [Markup.button.callback("🔄 快速订阅", "quick_subscribe")],
    [Markup.button.callback("🏠 返回主菜单", "back_to_main")],
  ]);
}

// 交易所选择菜单（多选）
function getExchangeSelectionMenu(selectedExchanges = []) {
  const exchanges = [
    "Binance",
    "OKX",
    "Bitget",
    "Bybit",
    "Kucoin",
    "HTX",
    "Gate",
    "XT",
  ];
  const buttons = [];

  // 全选按钮
  const allSelected = selectedExchanges.length === exchanges.length;
  buttons.push([
    Markup.button.callback(
      allSelected ? "✅ 全选" : "⬜ 全选",
      "toggle_all_exchanges"
    ),
  ]);

  // 交易所按钮（每行2个）
  for (let i = 0; i < exchanges.length; i += 2) {
    const row = [];
    for (let j = i; j < Math.min(i + 2, exchanges.length); j++) {
      const exchange = exchanges[j];
      const isSelected = selectedExchanges.includes(exchange);
      row.push(
        Markup.button.callback(
          `${isSelected ? "✅" : "⬜"} ${exchange}`,
          `toggle_exchange_${exchange}`
        )
      );
    }
    buttons.push(row);
  }

  // 控制按钮
  buttons.push([
    Markup.button.callback("⬅️ 返回", "manage_subscriptions"),
    Markup.button.callback("➡️ 下一步", "select_announcement_types"),
  ]);

  return Markup.inlineKeyboard(buttons);
}

// 公告类型选择菜单（多选）
function getAnnouncementTypeSelectionMenu(selectedTypes = []) {
  const types = [
    "上新",
    "盘前",
    "合约",
    "下架",
    "launchpool",
    "launchpad",
    "创新",
    "HODLer",
    "Megadrop",
    "Alpha",
  ];
  const buttons = [];

  // 全选按钮
  const allSelected = selectedTypes.length === types.length;
  buttons.push([
    Markup.button.callback(
      allSelected ? "✅ 全选" : "⬜ 全选",
      "toggle_all_types"
    ),
  ]);

  // 类型按钮（每行2个）
  for (let i = 0; i < types.length; i += 2) {
    const row = [];
    for (let j = i; j < Math.min(i + 2, types.length); j++) {
      const type = types[j];
      const isSelected = selectedTypes.includes(type);
      row.push(
        Markup.button.callback(
          `${isSelected ? "✅" : "⬜"} ${type}`,
          `toggle_type_${type}`
        )
      );
    }
    buttons.push(row);
  }

  // 控制按钮
  buttons.push([
    Markup.button.callback("⬅️ 返回", "select_exchanges"),
    Markup.button.callback("➡️ 下一步", "select_token_filter"),
  ]);

  return Markup.inlineKeyboard(buttons);
}

// 代币筛选菜单
function getTokenFilterSelectionMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🌟 不筛选（订阅所有）", "no_token_filter")],
    [Markup.button.callback("🔍 输入代币名称/符号", "input_token_filter")],
    [Markup.button.callback("📈 选择热门代币", "select_popular_tokens")],
    [Markup.button.callback("⬅️ 返回", "select_announcement_types")],
  ]);
}

// 代币搜索结果菜单
function getTokenSearchResultsMenu(searchResults, query) {
  const buttons = [];

  if (searchResults.length === 0) {
    buttons.push([Markup.button.callback("❌ 未找到匹配的代币", "no_action")]);
  } else {
    // 显示搜索结果（最多10个）
    searchResults.slice(0, 10).forEach((token) => {
      buttons.push([
        Markup.button.callback(
          `${token.display}`,
          `select_token_${token.value}`
        ),
      ]);
    });
  }

  buttons.push([
    Markup.button.callback("🔍 重新搜索", "input_token_filter"),
    Markup.button.callback("⬅️ 返回", "select_token_filter"),
  ]);

  return Markup.inlineKeyboard(buttons);
}

module.exports = {
  getMainMenu,
  getExchangesMenu,
  getAnnouncementTypesMenu,
  getTokenFilterMenu,
  getLimitMenu,
  getResultNavMenu,
  // 新增的订阅管理菜单
  getSubscriptionMainMenu,
  getExchangeSelectionMenu,
  getAnnouncementTypeSelectionMenu,
  getTokenFilterSelectionMenu,
  getTokenSearchResultsMenu,
};
