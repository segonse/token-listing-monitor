const FundingRateService = require("../../fundingRateService");
const menus = require("../menus/fundingRateMenus");

// 用户查询状态管理
const fundingRateStates = new Map();

// 清理过期状态（30分钟）
function cleanupExpiredStates() {
  const now = Date.now();
  const expireTime = 30 * 60 * 1000; // 30分钟

  for (const [chatId, state] of fundingRateStates.entries()) {
    if (now - state.lastActivity > expireTime) {
      fundingRateStates.delete(chatId);
    }
  }
}

// 定期清理过期状态
const cleanupInterval = setInterval(cleanupExpiredStates, 10 * 60 * 1000);

function setupFundingRateActions(bot) {
  // 主入口：资金费率查询
  bot.bot.action("funding_rate_query", async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();

    // 初始化用户状态
    fundingRateStates.set(chatId, {
      step: "time",
      lastActivity: Date.now(),
    });

    return ctx.reply("💰 <b>资金费率查询</b>\n\n" + "请选择查询的时间范围：", {
      parse_mode: "HTML",
      reply_markup: menus.getTimeSelectionMenu().reply_markup,
    });
  });

  // 时间选择处理
  bot.bot.action(/^fr_time_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const timeType = ctx.match[1];
    const state = fundingRateStates.get(chatId);

    if (!state) {
      return ctx.reply("会话已过期，请重新开始查询", menus.getErrorMenu());
    }

    if (timeType === "custom") {
      state.step = "custom_time";
      state.lastActivity = Date.now();

      return ctx.reply(
        "📅 <b>自定义时间范围</b>\n\n" +
          "请按以下格式输入时间范围：\n" +
          "<code>2024-01-01 2024-01-31</code>\n\n" +
          "格式说明：开始日期 结束日期（用空格分隔）",
        {
          parse_mode: "HTML",
          reply_markup: menus.getCustomTimeMenu().reply_markup,
        }
      );
    }

    // 处理预设时间范围
    const dateRange = FundingRateService.getDateRange(timeType);
    state.startDate = dateRange.startDate;
    state.endDate = dateRange.endDate;
    state.step = "exchange";
    state.lastActivity = Date.now();

    // 获取可用交易所
    try {
      const exchanges = await FundingRateService.getAvailableExchanges();

      if (exchanges.length === 0) {
        return ctx.reply("❌ 暂无可用的交易所数据", menus.getErrorMenu());
      }

      return ctx.reply(
        `📅 <b>已选择时间范围</b>\n` +
          `${state.startDate} ~ ${state.endDate}\n\n` +
          `🏢 请选择交易所：`,
        {
          parse_mode: "HTML",
          reply_markup: menus.getExchangeMenu(exchanges).reply_markup,
        }
      );
    } catch (error) {
      console.error("获取交易所列表失败:", error);
      return ctx.reply(
        "❌ 获取交易所列表失败，请稍后重试",
        menus.getErrorMenu()
      );
    }
  });

  // 交易所选择处理
  bot.bot.action(/^fr_exchange_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const exchange = ctx.match[1];
    const state = fundingRateStates.get(chatId);

    if (!state) {
      return ctx.reply("会话已过期，请重新开始查询", menus.getErrorMenu());
    }

    state.exchange = exchange;
    state.step = "quote";
    state.lastActivity = Date.now();

    // 获取该交易所的计价币种
    try {
      const quoteAssets = await FundingRateService.getAvailableQuoteAssets(
        exchange
      );

      if (quoteAssets.length === 0) {
        return ctx.reply(
          `❌ ${exchange} 暂无可用的计价币种数据`,
          menus.getErrorMenu()
        );
      }

      return ctx.reply(
        `🏢 <b>已选择交易所</b>\n${exchange}\n\n` + `💱 请选择计价币种：`,
        {
          parse_mode: "HTML",
          reply_markup: menus.getQuoteAssetMenu(quoteAssets).reply_markup,
        }
      );
    } catch (error) {
      console.error("获取计价币种列表失败:", error);
      return ctx.reply(
        "❌ 获取计价币种列表失败，请稍后重试",
        menus.getErrorMenu()
      );
    }
  });

  // 计价币种选择处理
  bot.bot.action(/^fr_quote_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const quoteAsset = ctx.match[1];
    const state = fundingRateStates.get(chatId);

    if (!state) {
      return ctx.reply("会话已过期，请重新开始查询", menus.getErrorMenu());
    }

    state.quoteAsset = quoteAsset;
    state.step = "symbol";
    state.lastActivity = Date.now();

    // 直接提示用户输入币种名称
    return ctx.reply(
      `💱 <b>已选择计价币种</b>\n${quoteAsset}\n\n` +
        `🔍 请输入要查询的币种名称（如：BTC、ETH、ADA）：`,
      {
        parse_mode: "HTML",
        reply_markup: menus.getCustomTimeMenu().reply_markup,
      }
    );
  });

  // 币种选择处理
  bot.bot.action(/^fr_symbol_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const symbol = ctx.match[1];
    const state = fundingRateStates.get(chatId);

    if (!state) {
      return ctx.reply("会话已过期，请重新开始查询", menus.getErrorMenu());
    }

    state.symbol = symbol;
    state.step = "result";
    state.lastActivity = Date.now();

    // 执行查询
    await performFundingRateQuery(ctx, state);
  });

  // 返回按钮处理
  bot.bot.action("fr_back_time", async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const state = fundingRateStates.get(chatId);

    if (state) {
      state.step = "time";
      state.lastActivity = Date.now();
    }

    return ctx.reply("💰 <b>资金费率查询</b>\n\n" + "请选择查询的时间范围：", {
      parse_mode: "HTML",
      reply_markup: menus.getTimeSelectionMenu().reply_markup,
    });
  });

  bot.bot.action("fr_back_exchange", async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const state = fundingRateStates.get(chatId);

    if (!state) {
      return ctx.reply("会话已过期，请重新开始查询", menus.getErrorMenu());
    }

    state.step = "exchange";
    state.lastActivity = Date.now();

    try {
      const exchanges = await FundingRateService.getAvailableExchanges();

      return ctx.reply(
        `📅 <b>时间范围</b>\n` +
          `${state.startDate} ~ ${state.endDate}\n\n` +
          `🏢 请选择交易所：`,
        {
          parse_mode: "HTML",
          reply_markup: menus.getExchangeMenu(exchanges).reply_markup,
        }
      );
    } catch (error) {
      return ctx.reply("❌ 获取交易所列表失败", menus.getErrorMenu());
    }
  });

  bot.bot.action("fr_back_quote", async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const state = fundingRateStates.get(chatId);

    if (!state) {
      return ctx.reply("会话已过期，请重新开始查询", menus.getErrorMenu());
    }

    state.step = "quote";
    state.lastActivity = Date.now();

    try {
      const quoteAssets = await FundingRateService.getAvailableQuoteAssets(
        state.exchange
      );

      return ctx.reply(
        `🏢 <b>交易所</b>\n${state.exchange}\n\n` + `💱 请选择计价币种：`,
        {
          parse_mode: "HTML",
          reply_markup: menus.getQuoteAssetMenu(quoteAssets).reply_markup,
        }
      );
    } catch (error) {
      return ctx.reply("❌ 获取计价币种列表失败", menus.getErrorMenu());
    }
  });

  // 重新开始查询
  bot.bot.action("fr_restart", async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();

    // 清除状态，重新开始
    fundingRateStates.delete(chatId);

    // 直接调用启动逻辑，而不是错误的函数调用
    fundingRateStates.set(chatId, {
      step: "time",
      lastActivity: Date.now(),
    });

    return ctx.reply("💰 <b>资金费率查询</b>\n\n" + "请选择查询的时间范围：", {
      parse_mode: "HTML",
      reply_markup: menus.getTimeSelectionMenu().reply_markup,
    });
  });
}

// 执行资金费率查询
async function performFundingRateQuery(ctx, state) {
  const loadingMessage = await ctx.reply("🔄 正在查询资金费率数据，请稍候...");

  try {
    const queryParams = {
      exchange: state.exchange,
      symbol: state.symbol,
      quoteAsset: state.quoteAsset,
      startDate: state.startDate,
      endDate: state.endDate,
    };

    const result = await FundingRateService.queryFundingRate(queryParams);

    // 删除加载消息
    try {
      await ctx.deleteMessage(loadingMessage.message_id);
    } catch (e) {
      // 忽略删除消息失败的错误
    }

    if (!result || !result.hasData) {
      return ctx.reply(
        `❌ <b>未找到数据</b>\n\n` +
          `该时间段内没有 ${state.symbol} 在 ${state.exchange} 的资金费率数据。\n\n` +
          `请尝试：\n` +
          `• 选择其他时间段\n` +
          `• 选择其他交易对\n` +
          `• 检查币种名称是否正确`,
        {
          parse_mode: "HTML",
          reply_markup: menus.getResultActionsMenu().reply_markup,
        }
      );
    }

    // 格式化查询结果
    const resultMessage = formatFundingRateResult(result, queryParams);

    return ctx.reply(resultMessage, {
      parse_mode: "HTML",
      reply_markup: menus.getResultActionsMenu().reply_markup,
    });
  } catch (error) {
    console.error("查询资金费率失败:", error);

    // 删除加载消息
    try {
      await ctx.deleteMessage(loadingMessage.message_id);
    } catch (e) {
      // 忽略删除消息失败的错误
    }

    return ctx.reply("❌ 查询失败，请稍后重试", {
      reply_markup: menus.getErrorMenu().reply_markup,
    });
  }
}

// 格式化查询结果
function formatFundingRateResult(result, params) {
  const totalRatePercent = FundingRateService.formatPercentage(
    result.total_rate,
    6
  );
  const avgRatePercent = FundingRateService.formatPercentage(
    result.avg_rate,
    6
  );

  return `
📊 <b>资金费率查询结果</b>

🏢 <b>交易所:</b> ${params.exchange}
💱 <b>交易对:</b> ${params.symbol}
📅 <b>查询时间:</b> ${params.startDate} ~ ${params.endDate}

📈 <b>总费率:</b> ${totalRatePercent}
📊 <b>平均费率:</b> ${avgRatePercent}
🔢 <b>收费次数:</b> ${result.periods_count} 次

⏰ <b>数据时间范围:</b>
${FundingRateService.formatDate(
  result.start_time
)} ~ ${FundingRateService.formatDate(result.end_time)}
  `;
}

// 处理文本输入（自定义时间和币种搜索）
async function handleFundingRateTextInput(bot, ctx) {
  const chatId = ctx.chat.id.toString();
  const text = ctx.message.text;
  const state = fundingRateStates.get(chatId);

  if (!state) {
    return false; // 不是资金费率查询的文本输入
  }

  if (state.step === "custom_time") {
    // 处理自定义时间输入
    const timePattern = /^(\d{4}-\d{2}-\d{2})\s+(\d{4}-\d{2}-\d{2})$/;
    const match = text.match(timePattern);

    if (!match) {
      return ctx.reply(
        "❌ 时间格式不正确\n\n" +
          "请按以下格式输入：\n" +
          "<code>2024-01-01 2024-01-31</code>",
        {
          parse_mode: "HTML",
          reply_markup: menus.getCustomTimeMenu().reply_markup,
        }
      );
    }

    const startDate = match[1];
    const endDate = match[2];

    // 验证日期有效性
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return ctx.reply("❌ 开始日期不能晚于结束日期", {
        reply_markup: menus.getCustomTimeMenu().reply_markup,
      });
    }

    state.startDate = startDate;
    state.endDate = endDate;
    state.step = "exchange";
    state.lastActivity = Date.now();

    // 获取可用交易所
    try {
      const exchanges = await FundingRateService.getAvailableExchanges();

      return ctx.reply(
        `📅 <b>已设置时间范围</b>\n` +
          `${startDate} ~ ${endDate}\n\n` +
          `🏢 请选择交易所：`,
        {
          parse_mode: "HTML",
          reply_markup: menus.getExchangeMenu(exchanges).reply_markup,
        }
      );
    } catch (error) {
      return ctx.reply("❌ 获取交易所列表失败", menus.getErrorMenu());
    }
  }

  if (state.step === "symbol") {
    // 处理币种搜索
    const keyword = text.trim().toUpperCase();

    if (keyword.length < 1) {
      return ctx.reply("请输入至少1个字符进行搜索");
    }

    try {
      const symbols = await FundingRateService.searchSymbols(
        state.exchange,
        state.quoteAsset,
        keyword
      );

      if (symbols.length === 0) {
        return ctx.reply(
          `❌ 未找到匹配 "${keyword}" 的币种\n\n` +
            "请尝试：\n" +
            "• 检查拼写是否正确\n" +
            "• 使用币种简称（如BTC而不是Bitcoin）\n" +
            "• 尝试其他关键词",
          {
            parse_mode: "HTML",
            reply_markup: menus.getCustomTimeMenu().reply_markup,
          }
        );
      }

      return ctx.reply(
        `🔍 <b>搜索结果</b>\n关键词: ${keyword}\n\n` +
          `找到 ${symbols.length} 个匹配的币种，请选择：`,
        {
          parse_mode: "HTML",
          reply_markup: menus.getSymbolSelectionMenu(symbols).reply_markup,
        }
      );
    } catch (error) {
      console.error("搜索币种失败:", error);
      return ctx.reply("❌ 搜索失败，请稍后重试", menus.getErrorMenu());
    }
  }

  return true; // 已处理
}

module.exports = {
  setupFundingRateActions,
  handleFundingRateTextInput,
};
