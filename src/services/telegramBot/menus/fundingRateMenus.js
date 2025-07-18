const { Markup } = require("telegraf");

// 时间选择菜单
function getTimeSelectionMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📅 今天", "fr_time_today")],
    [Markup.button.callback("📅 最近7天", "fr_time_7d")],
    [Markup.button.callback("📅 最近30天", "fr_time_30d")],
    [Markup.button.callback("📅 自定义时间", "fr_time_custom")],
    [Markup.button.callback("🏠 返回主菜单", "back_to_main")],
  ]);
}

// 动态交易所菜单
function getExchangeMenu(exchanges) {
  const buttons = [];

  // 每行最多2个按钮
  for (let i = 0; i < exchanges.length; i += 2) {
    const row = [];
    row.push(
      Markup.button.callback(
        `🏢 ${exchanges[i]}`,
        `fr_exchange_${exchanges[i]}`
      )
    );
    if (i + 1 < exchanges.length) {
      row.push(
        Markup.button.callback(
          `🏢 ${exchanges[i + 1]}`,
          `fr_exchange_${exchanges[i + 1]}`
        )
      );
    }
    buttons.push(row);
  }

  buttons.push([Markup.button.callback("🔙 返回", "fr_back_time")]);
  buttons.push([Markup.button.callback("🏠 主菜单", "back_to_main")]);

  return Markup.inlineKeyboard(buttons);
}

// 动态计价币种菜单
function getQuoteAssetMenu(quoteAssets) {
  const buttons = [];

  // 每行最多3个按钮
  for (let i = 0; i < quoteAssets.length; i += 3) {
    const row = [];
    for (let j = 0; j < 3 && i + j < quoteAssets.length; j++) {
      const asset = quoteAssets[i + j];
      row.push(Markup.button.callback(`💱 ${asset}`, `fr_quote_${asset}`));
    }
    buttons.push(row);
  }

  buttons.push([Markup.button.callback("🔙 返回", "fr_back_exchange")]);
  buttons.push([Markup.button.callback("🏠 主菜单", "back_to_main")]);

  return Markup.inlineKeyboard(buttons);
}

// 币种搜索结果菜单
function getSymbolSelectionMenu(symbols) {
  const buttons = [];

  // 每行1个按钮，便于查看
  symbols.forEach((symbolInfo) => {
    const displayText =
      typeof symbolInfo === "string"
        ? `🪙 ${symbolInfo}`
        : `🪙 ${symbolInfo.displayName || symbolInfo.baseAsset}`;
    const callbackData =
      typeof symbolInfo === "string"
        ? `fr_symbol_${symbolInfo}`
        : `fr_symbol_${symbolInfo.symbol}`;

    buttons.push([Markup.button.callback(displayText, callbackData)]);
  });

  // 限制显示数量，如果超过10个，显示"查看更多"
  if (buttons.length > 10) {
    buttons.splice(10);
    buttons.push([Markup.button.callback("📄 查看更多...", "fr_more_symbols")]);
  }

  buttons.push([Markup.button.callback("🔙 返回", "fr_back_quote")]);
  buttons.push([Markup.button.callback("🏠 主菜单", "back_to_main")]);

  return Markup.inlineKeyboard(buttons);
}

// 查询结果操作菜单
function getResultActionsMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🔄 重新查询", "fr_restart")],
    [Markup.button.callback("📊 查看详情", "fr_view_details")],
    [Markup.button.callback("🏠 返回主菜单", "back_to_main")],
  ]);
}

// 自定义时间输入提示菜单
function getCustomTimeMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🔙 返回时间选择", "fr_back_time")],
    [Markup.button.callback("🏠 主菜单", "back_to_main")],
  ]);
}

// 错误处理菜单
function getErrorMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🔄 重试", "fr_restart")],
    [Markup.button.callback("🏠 返回主菜单", "back_to_main")],
  ]);
}

module.exports = {
  getTimeSelectionMenu,
  getExchangeMenu,
  getQuoteAssetMenu,
  getSymbolSelectionMenu,
  getResultActionsMenu,
  getCustomTimeMenu,
  getErrorMenu,
};
