const { Markup } = require("telegraf");
const ExchangeDataService = require("../../exchangeDataService");

// 历史查询 - 交易所选择菜单
async function getExchangesMenu() {
  const availableExchanges = await ExchangeDataService.getAvailableExchanges();
  const buttons = [];

  // 添加"全部交易所"选项
  buttons.push([
    Markup.button.callback("🌐 全部交易所", "exchange_all_exchanges"),
  ]);

  // 动态生成交易所按钮（每行2个）
  for (let i = 0; i < availableExchanges.length; i += 2) {
    const row = [];
    for (let j = i; j < Math.min(i + 2, availableExchanges.length); j++) {
      const exchange = availableExchanges[j];
      row.push(
        Markup.button.callback(exchange, `exchange_${exchange}`)
      );
    }
    buttons.push(row);
  }

  buttons.push([
    Markup.button.callback("🏠 返回主菜单", "back_to_main"),
  ]);

  return Markup.inlineKeyboard(buttons);
}

// 历史查询 - 公告类型选择菜单
async function getAnnouncementTypesMenu(exchange) {
  let availableTypes;
  
  if (exchange === "all_exchanges") {
    availableTypes = await ExchangeDataService.getAllAnnouncementTypes();
  } else {
    availableTypes = await ExchangeDataService.getAnnouncementTypesByExchanges([exchange]);
  }

  const buttons = [];

  // 添加"全部类型"选项
  buttons.push([
    Markup.button.callback("📋 全部类型", `type_${exchange}_all`),
  ]);

  // 动态生成类型按钮（每行2个）
  for (let i = 0; i < availableTypes.length; i += 2) {
    const row = [];
    for (let j = i; j < Math.min(i + 2, availableTypes.length); j++) {
      const type = availableTypes[j];
      row.push(
        Markup.button.callback(type, `type_${exchange}_${type}`)
      );
    }
    buttons.push(row);
  }

  buttons.push([
    Markup.button.callback("⬅️ 返回", "check_history_announcements"),
  ]);

  return Markup.inlineKeyboard(buttons);
}

// 代币筛选菜单
function getTokenFilterMenu(exchange, type) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🌟 不筛选", `filter_${exchange}_${type}_none`)],
    [Markup.button.callback("🔍 输入代币名称/符号", `filter_${exchange}_${type}_input`)],
    [Markup.button.callback("⬅️ 返回", `exchange_${exchange}`)],
  ]);
}

// 结果数量选择菜单
function getLimitMenu(exchange, type) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("5条", `execute_query_${exchange}_${type}_5`),
      Markup.button.callback("10条", `execute_query_${exchange}_${type}_10`),
    ],
    [
      Markup.button.callback("20条", `execute_query_${exchange}_${type}_20`),
      Markup.button.callback("50条", `execute_query_${exchange}_${type}_50`),
    ],
    [Markup.button.callback("⬅️ 返回", `type_${exchange}_${type}`)],
  ]);
}

module.exports = {
  getExchangesMenu,
  getAnnouncementTypesMenu,
  getTokenFilterMenu,
  getLimitMenu,
};
