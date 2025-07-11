const SubscriptionService = require("../../subscriptionService");
const menus = require("../menus");
const TokenSearchService = require("../../tokenSearchService");

// 用户状态管理
const userStates = new Map();
const userSelections = new Map();

// 状态清理配置
const STATE_TIMEOUT = 30 * 60 * 1000; // 30分钟超时
const stateTimestamps = new Map();

// 清理过期状态的函数
function cleanupExpiredStates() {
  const now = Date.now();
  const expiredChatIds = [];

  for (const [chatId, timestamp] of stateTimestamps.entries()) {
    if (now - timestamp > STATE_TIMEOUT) {
      expiredChatIds.push(chatId);
    }
  }

  expiredChatIds.forEach((chatId) => {
    userStates.delete(chatId);
    userSelections.delete(chatId);
    stateTimestamps.delete(chatId);
    console.log(`清理过期状态: ${chatId}`);
  });

  if (expiredChatIds.length > 0) {
    console.log(`清理了 ${expiredChatIds.length} 个过期状态`);
  }
}

// 更新状态时间戳
function updateStateTimestamp(chatId) {
  stateTimestamps.set(chatId, Date.now());
}

// 清理特定用户状态
function clearUserState(chatId) {
  userStates.delete(chatId);
  userSelections.delete(chatId);
  stateTimestamps.delete(chatId);
}

// 定期清理过期状态（每10分钟执行一次）
const cleanupInterval = setInterval(cleanupExpiredStates, 10 * 60 * 1000);

// 程序退出时清理定时器
process.on("SIGINT", () => {
  clearInterval(cleanupInterval);
});

process.on("SIGTERM", () => {
  clearInterval(cleanupInterval);
});

// 完成订阅创建
async function finalizeSubscription(ctx, chatId, selection) {
  const telegramChatId = ctx.chat.id.toString();
  const userId = `tg_${telegramChatId}`;

  const [users] = await require("../../../config/database").query(
    "SELECT id FROM users WHERE user_id = ?",
    [userId]
  );

  if (users.length === 0) {
    return ctx.reply("请先使用 /start 命令初始化账户");
  }

  const userDbId = users[0].id;

  // 生成订阅组合
  const subscriptions = [];
  for (const exchange of selection.exchanges) {
    for (const type of selection.types) {
      subscriptions.push({
        exchange,
        announcementType: type,
        tokenFilter: selection.tokenFilter,
      });
    }
  }

  const success = await SubscriptionService.addBatchSubscriptions(
    userDbId,
    subscriptions
  );

  if (success) {
    let message = "✅ <b>订阅添加成功！</b>\n\n";
    message += `📊 <b>订阅详情：</b>\n`;
    message += `• 交易所：${selection.exchanges.join(", ")}\n`;
    message += `• 公告类型：${selection.types.join(", ")}\n`;
    if (selection.tokenFilter) {
      message += `• 代币筛选：${selection.tokenFilter}\n`;
    }
    message += `• 总计：${subscriptions.length} 个订阅\n`;

    // 清理用户状态
    clearUserState(chatId);

    return ctx.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: menus.getSubscriptionMainMenu().reply_markup,
    });
  } else {
    return ctx.editMessageText(
      "❌ <b>订阅添加失败</b>\n\n请稍后重试或联系管理员。",
      {
        parse_mode: "HTML",
        reply_markup: menus.getSubscriptionMainMenu().reply_markup,
      }
    );
  }
}

function setupSubscriptionActions(bot) {
  // 设置文本输入处理的状态管理器
  const textInputActions = require("./textInputActions");
  textInputActions.setStateManagers(userStates, userSelections);

  // 添加订阅 - 选择交易所
  bot.bot.action("add_subscription", async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    userSelections.set(chatId, { exchanges: [], types: [], tokenFilter: null });
    updateStateTimestamp(chatId);

    return ctx.editMessageText(
      "📊 <b>添加订阅 - 选择交易所</b>\n\n请选择要订阅的交易所（可多选）：",
      {
        parse_mode: "HTML",
        reply_markup: (await menus.getExchangeSelectionMenu([])).reply_markup,
      }
    );
  });

  // 切换交易所选择
  bot.bot.action(/toggle_exchange_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const exchange = ctx.match[1];
    const selection = userSelections.get(chatId) || {
      exchanges: [],
      types: [],
      tokenFilter: null,
    };

    if (selection.exchanges.includes(exchange)) {
      selection.exchanges = selection.exchanges.filter((e) => e !== exchange);
    } else {
      selection.exchanges.push(exchange);
    }

    // 交易所选择变化时，清空公告类型选择
    if (selection.types && selection.types.length > 0) {
      selection.types = [];
    }

    userSelections.set(chatId, selection);
    updateStateTimestamp(chatId);

    return ctx.editMessageReplyMarkup(
      (await menus.getExchangeSelectionMenu(selection.exchanges)).reply_markup
    );
  });

  // 全选/取消全选交易所
  bot.bot.action("toggle_all_exchanges", async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const selection = userSelections.get(chatId) || {
      exchanges: [],
      types: [],
      tokenFilter: null,
    };

    const ExchangeDataService = require("../../exchangeDataService");
    const availableExchanges =
      await ExchangeDataService.getAvailableExchanges();

    if (selection.exchanges.length === availableExchanges.length) {
      // 当前全选，则取消全选
      selection.exchanges = [];
    } else {
      // 当前非全选，则全选
      selection.exchanges = [...availableExchanges];
    }

    // 交易所选择变化时，清空公告类型选择
    selection.types = [];

    userSelections.set(chatId, selection);
    updateStateTimestamp(chatId);

    return ctx.editMessageReplyMarkup(
      (await menus.getExchangeSelectionMenu(selection.exchanges)).reply_markup
    );
  });

  // 选择公告类型
  bot.bot.action("select_announcement_types", async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const selection = userSelections.get(chatId);

    if (!selection || selection.exchanges.length === 0) {
      return ctx.answerCbQuery("请先选择至少一个交易所", { show_alert: true });
    }

    return ctx.editMessageText(
      "📋 <b>添加订阅 - 选择公告类型</b>\n\n请选择要订阅的公告类型（可多选）：",
      {
        parse_mode: "HTML",
        reply_markup: (
          await menus.getAnnouncementTypeSelectionMenu(
            selection.types,
            selection.exchanges
          )
        ).reply_markup,
      }
    );
  });

  // 切换公告类型选择
  bot.bot.action(/toggle_type_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const type = ctx.match[1];
    const selection = userSelections.get(chatId);

    if (!selection) {
      return ctx.answerCbQuery("会话已过期，请重新开始", { show_alert: true });
    }

    if (selection.types.includes(type)) {
      selection.types = selection.types.filter((t) => t !== type);
    } else {
      selection.types.push(type);
    }

    userSelections.set(chatId, selection);
    updateStateTimestamp(chatId);

    return ctx.editMessageReplyMarkup(
      (
        await menus.getAnnouncementTypeSelectionMenu(
          selection.types,
          selection.exchanges
        )
      ).reply_markup
    );
  });

  // 全选/取消全选公告类型
  bot.bot.action("toggle_all_types", async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const selection = userSelections.get(chatId);

    if (!selection) {
      return ctx.answerCbQuery("会话已过期，请重新开始", { show_alert: true });
    }

    const ExchangeDataService = require("../../exchangeDataService");
    const availableTypes =
      await ExchangeDataService.getAnnouncementTypesByExchanges(
        selection.exchanges
      );

    if (selection.types.length === availableTypes.length) {
      // 当前全选，则取消全选
      selection.types = [];
    } else {
      // 当前非全选，则全选
      selection.types = [...availableTypes];
    }

    userSelections.set(chatId, selection);
    updateStateTimestamp(chatId);

    return ctx.editMessageReplyMarkup(
      (
        await menus.getAnnouncementTypeSelectionMenu(
          selection.types,
          selection.exchanges
        )
      ).reply_markup
    );
  });

  // 选择代币筛选
  bot.bot.action("select_token_filter", async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const selection = userSelections.get(chatId);

    if (!selection || selection.types.length === 0) {
      return ctx.answerCbQuery("请先选择至少一个公告类型", {
        show_alert: true,
      });
    }

    return ctx.editMessageText(
      "🔍 <b>添加订阅 - 代币筛选</b>\n\n请选择代币筛选方式：",
      {
        parse_mode: "HTML",
        reply_markup: menus.getTokenFilterSelectionMenu().reply_markup,
      }
    );
  });

  // 不筛选代币
  bot.bot.action("no_token_filter", async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const selection = userSelections.get(chatId);

    if (!selection) {
      return ctx.answerCbQuery("会话已过期，请重新开始", { show_alert: true });
    }

    selection.tokenFilter = null;
    userSelections.set(chatId, selection);

    return await finalizeSubscription(ctx, chatId, selection);
  });

  // 选择代币筛选
  bot.bot.action("select_token_filter", async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const selection = userSelections.get(chatId);

    if (!selection || selection.types.length === 0) {
      return ctx.answerCbQuery("请先选择至少一个公告类型", {
        show_alert: true,
      });
    }

    return ctx.editMessageText(
      "🔍 <b>添加订阅 - 代币筛选</b>\n\n请选择代币筛选方式：",
      {
        parse_mode: "HTML",
        reply_markup: menus.getTokenFilterSelectionMenu().reply_markup,
      }
    );
  });

  // 不筛选代币
  bot.bot.action("no_token_filter", async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const selection = userSelections.get(chatId);

    if (!selection) {
      return ctx.answerCbQuery("会话已过期，请重新开始", { show_alert: true });
    }

    selection.tokenFilter = null;
    userSelections.set(chatId, selection);

    return await finalizeSubscription(ctx, chatId, selection);
  });

  // 输入代币筛选
  bot.bot.action("input_token_filter", async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    userStates.set(chatId, "waiting_token_input");
    updateStateTimestamp(chatId);

    return ctx.editMessageText(
      "🔍 <b>输入代币名称或符号</b>\n\n请输入要筛选的代币名称或符号：\n\n" +
        "💡 提示：输入后会显示搜索建议供您选择",
      { parse_mode: "HTML" }
    );
  });

  // 选择代币
  bot.bot.action(/select_token_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const tokenValue = ctx.match[1];
    const selection = userSelections.get(chatId);

    if (!selection) {
      return ctx.answerCbQuery("会话已过期，请重新开始", { show_alert: true });
    }

    selection.tokenFilter = tokenValue;
    userSelections.set(chatId, selection);

    // 清除状态并完成订阅
    clearUserState(chatId);
    return await finalizeSubscription(ctx, chatId, selection);
  });

  // 直接使用输入值
  bot.bot.action(/use_input_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const inputValue = ctx.match[1];
    const selection = userSelections.get(chatId);

    if (!selection) {
      return ctx.answerCbQuery("会话已过期，请重新开始", { show_alert: true });
    }

    selection.tokenFilter = inputValue;
    userSelections.set(chatId, selection);

    // 清除状态并完成订阅
    clearUserState(chatId);
    return await finalizeSubscription(ctx, chatId, selection);
  });

  // 选择最近添加的代币
  bot.bot.action("select_recent_tokens", async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const selection = userSelections.get(chatId);

    if (!selection) {
      return ctx.answerCbQuery("会话已过期，请重新开始", { show_alert: true });
    }

    const recentTokens = await TokenSearchService.getRecentTokens(10);

    if (recentTokens.length === 0) {
      return ctx.editMessageText(
        "❌ 暂无最近添加的代币\n\n请选择其他筛选方式：",
        {
          parse_mode: "HTML",
          reply_markup: menus.getTokenFilterSelectionMenu().reply_markup,
        }
      );
    }

    return ctx.editMessageText(`🆕 <b>最近添加的代币</b>\n\n请选择一个代币：`, {
      parse_mode: "HTML",
      reply_markup: menus.getTokenSearchResultsMenu(
        recentTokens.map((token) => ({
          value: token.symbol,
          display: token.display,
        })),
        "recent"
      ).reply_markup,
    });
  });

  // 查看订阅
  bot.bot.action("view_subscriptions", async (ctx) => {
    await ctx.answerCbQuery();

    const telegramChatId = ctx.chat.id.toString();
    const userId = `tg_${telegramChatId}`;

    const [users] = await require("../../../config/database").query(
      "SELECT id FROM users WHERE user_id = ?",
      [userId]
    );

    if (users.length === 0) {
      return ctx.reply("请先使用 /start 命令初始化账户");
    }

    const userDbId = users[0].id;
    const subscriptions = await SubscriptionService.getUserSubscriptions(
      userDbId
    );

    if (subscriptions.length === 0) {
      return ctx.reply(
        "📋 <b>我的订阅</b>\n\n❌ 您还没有任何订阅\n\n点击下方按钮添加订阅：",
        {
          parse_mode: "HTML",
          reply_markup: menus.getSubscriptionMainMenu().reply_markup,
        }
      );
    }

    let message = "📋 <b>我的订阅</b>\n\n";
    subscriptions.forEach((sub, index) => {
      message += `${index + 1}. ${sub.exchange} - ${sub.announcement_type}`;
      if (sub.token_filter) {
        message += ` (${sub.token_filter})`;
      }
      message += "\n";
    });

    // 添加时间戳确保内容不同，避免重复点击报错
    message += `\n🕐 更新时间: ${new Date().toLocaleTimeString()}`;

    return ctx.reply(message, {
      parse_mode: "HTML",
      reply_markup: menus.getSubscriptionMainMenu().reply_markup,
    });
  });

  // 删除订阅
  bot.bot.action("delete_subscription", async (ctx) => {
    await ctx.answerCbQuery();

    const telegramChatId = ctx.chat.id.toString();
    const userId = `tg_${telegramChatId}`;

    const [users] = await require("../../../config/database").query(
      "SELECT id FROM users WHERE user_id = ?",
      [userId]
    );

    if (users.length === 0) {
      return ctx.reply("请先使用 /start 命令初始化账户");
    }

    const userDbId = users[0].id;
    const subscriptions = await SubscriptionService.getUserSubscriptions(
      userDbId
    );

    return ctx.reply("🗑️ <b>删除订阅</b>\n\n请选择要删除的订阅：", {
      parse_mode: "HTML",
      reply_markup: menus.getDeleteSubscriptionMenu(subscriptions).reply_markup,
    });
  });

  // 删除单个订阅
  bot.bot.action(/delete_sub_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();

    const subscriptionId = parseInt(ctx.match[1]);
    const telegramChatId = ctx.chat.id.toString();
    const userId = `tg_${telegramChatId}`;

    const [users] = await require("../../../config/database").query(
      "SELECT id FROM users WHERE user_id = ?",
      [userId]
    );

    if (users.length === 0) {
      return ctx.reply("请先使用 /start 命令初始化账户");
    }

    const userDbId = users[0].id;
    const success = await SubscriptionService.removeSubscription(
      userDbId,
      subscriptionId
    );

    if (success) {
      return ctx.editMessageText("✅ <b>删除成功</b>\n\n订阅已成功删除！", {
        parse_mode: "HTML",
        reply_markup: menus.getSubscriptionMainMenu().reply_markup,
      });
    } else {
      return ctx.editMessageText(
        "❌ <b>删除失败</b>\n\n删除订阅时出现错误，请稍后重试。",
        {
          parse_mode: "HTML",
          reply_markup: menus.getSubscriptionMainMenu().reply_markup,
        }
      );
    }
  });

  // 删除所有订阅
  bot.bot.action("delete_all_subscriptions", async (ctx) => {
    await ctx.answerCbQuery();

    const telegramChatId = ctx.chat.id.toString();
    const userId = `tg_${telegramChatId}`;

    const [users] = await require("../../../config/database").query(
      "SELECT id FROM users WHERE user_id = ?",
      [userId]
    );

    if (users.length === 0) {
      return ctx.reply("请先使用 /start 命令初始化账户");
    }

    const userDbId = users[0].id;
    const success = await SubscriptionService.clearUserSubscriptions(userDbId);

    if (success) {
      return ctx.editMessageText("✅ <b>删除成功</b>\n\n所有订阅已成功删除！", {
        parse_mode: "HTML",
        reply_markup: menus.getSubscriptionMainMenu().reply_markup,
      });
    } else {
      return ctx.editMessageText(
        "❌ <b>删除失败</b>\n\n删除订阅时出现错误，请稍后重试。",
        {
          parse_mode: "HTML",
          reply_markup: menus.getSubscriptionMainMenu().reply_markup,
        }
      );
    }
  });
}

module.exports = {
  setupSubscriptionActions,
  userStates,
  userSelections,
  clearUserState,
};
