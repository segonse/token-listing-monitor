const { Markup } = require("telegraf");
const ExchangeDataService = require("../../exchangeDataService");

// 订阅管理主菜单
function getSubscriptionMainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("➕ 添加订阅", "add_subscription")],
    [Markup.button.callback("📋 查看订阅", "view_subscriptions")],
    [Markup.button.callback("🗑️ 删除订阅", "delete_subscription")],
    [Markup.button.callback("🏠 返回主菜单", "back_to_main")],
  ]);
}

// 交易所选择菜单（多选）- 动态生成
async function getExchangeSelectionMenu(selectedExchanges = []) {
  const availableExchanges = await ExchangeDataService.getAvailableExchanges();
  const buttons = [];

  // 全选按钮
  const allSelected = selectedExchanges.length === availableExchanges.length;
  buttons.push([
    Markup.button.callback(
      allSelected ? "✅ 全选" : "⬜ 全选",
      "toggle_all_exchanges"
    ),
  ]);

  // 交易所按钮（每行2个）
  for (let i = 0; i < availableExchanges.length; i += 2) {
    const row = [];
    for (let j = i; j < Math.min(i + 2, availableExchanges.length); j++) {
      const exchange = availableExchanges[j];
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

// 公告类型选择菜单（多选）- 动态生成
async function getAnnouncementTypeSelectionMenu(selectedTypes = [], selectedExchanges = []) {
  let availableTypes;
  
  if (selectedExchanges && selectedExchanges.length > 0) {
    // 根据选择的交易所获取可用的公告类型
    availableTypes = await ExchangeDataService.getAnnouncementTypesByExchanges(selectedExchanges);
  } else {
    // 如果没有选择交易所，获取所有公告类型
    availableTypes = await ExchangeDataService.getAllAnnouncementTypes();
  }
  
  const buttons = [];

  if (availableTypes.length === 0) {
    buttons.push([
      Markup.button.callback("❌ 所选交易所暂无公告类型", "no_action")
    ]);
    buttons.push([
      Markup.button.callback("⬅️ 返回", "add_subscription"),
    ]);
    return Markup.inlineKeyboard(buttons);
  }

  // 全选按钮
  const allSelected = selectedTypes.length === availableTypes.length;
  buttons.push([
    Markup.button.callback(
      allSelected ? "✅ 全选" : "⬜ 全选",
      "toggle_all_types"
    ),
  ]);

  // 类型按钮（每行2个）
  for (let i = 0; i < availableTypes.length; i += 2) {
    const row = [];
    for (let j = i; j < Math.min(i + 2, availableTypes.length); j++) {
      const type = availableTypes[j];
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
    Markup.button.callback("⬅️ 返回", "add_subscription"),
    Markup.button.callback("➡️ 下一步", "select_token_filter"),
  ]);

  return Markup.inlineKeyboard(buttons);
}

// 代币筛选菜单
function getTokenFilterSelectionMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🌟 不筛选（订阅所有）", "no_token_filter")],
    [Markup.button.callback("🔍 输入代币名称/符号", "input_token_filter")],
    [Markup.button.callback("🆕 选择最近添加的代币", "select_recent_tokens")],
    [Markup.button.callback("⬅️ 返回", "select_announcement_types")],
  ]);
}

// 代币搜索结果菜单
function getTokenSearchResultsMenu(searchResults, query) {
  const buttons = [];

  if (searchResults.length === 0) {
    buttons.push([
      Markup.button.callback("✅ 直接使用输入值", `use_input_${query}`),
    ]);
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

  // 添加更多选项
  buttons.push([
    Markup.button.callback("🔍 重新搜索", "input_token_filter"),
    Markup.button.callback("🚫 不筛选代币", "no_token_filter"),
  ]);

  buttons.push([
    Markup.button.callback("⬅️ 返回上一步", "select_token_filter"),
  ]);

  return Markup.inlineKeyboard(buttons);
}

// 删除订阅菜单
function getDeleteSubscriptionMenu(subscriptions) {
  const buttons = [];

  if (subscriptions.length === 0) {
    buttons.push([Markup.button.callback("❌ 没有可删除的订阅", "no_action")]);
  } else {
    // 显示订阅列表供选择删除
    subscriptions.forEach((sub, index) => {
      const displayText = `${index + 1}. ${sub.exchange} - ${
        sub.announcement_type
      }${sub.token_filter ? ` (${sub.token_filter})` : ""}`;
      buttons.push([
        Markup.button.callback(
          displayText.length > 30
            ? displayText.substring(0, 30) + "..."
            : displayText,
          `delete_sub_${sub.id}`
        ),
      ]);
    });

    // 添加批量删除选项
    buttons.push([
      Markup.button.callback("🗑️ 删除所有订阅", "delete_all_subscriptions"),
    ]);
  }

  buttons.push([Markup.button.callback("⬅️ 返回", "manage_subscriptions")]);

  return Markup.inlineKeyboard(buttons);
}

module.exports = {
  getSubscriptionMainMenu,
  getExchangeSelectionMenu,
  getAnnouncementTypeSelectionMenu,
  getTokenFilterSelectionMenu,
  getTokenSearchResultsMenu,
  getDeleteSubscriptionMenu,
};
