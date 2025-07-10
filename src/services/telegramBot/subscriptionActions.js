const SubscriptionService = require("../subscriptionService");
const TokenSearchService = require("../tokenSearchService");
const menus = require("./menus");
const queries = require("./queries");

// 用户状态管理
const userStates = new Map();
const userSelections = new Map();

function setupSubscriptionActions(bot) {
  // 管理订阅主菜单
  bot.bot.action("manage_subscriptions", async (ctx) => {
    await ctx.answerCbQuery();
    
    const telegramChatId = ctx.chat.id.toString();
    const userId = `tg_${telegramChatId}`;
    
    // 获取用户信息
    const [users] = await require("../../config/database").query(
      "SELECT id FROM users WHERE user_id = ?",
      [userId]
    );
    
    if (users.length === 0) {
      return ctx.reply("请先使用 /start 命令初始化账户");
    }
    
    const userDbId = users[0].id;
    const stats = await SubscriptionService.getSubscriptionStats(userDbId);
    
    let message = "🔔 <b>订阅管理</b>\n\n";
    message += `📊 当前订阅统计：\n`;
    message += `• 总订阅数：${stats.total}\n`;
    message += `• 交易所数：${stats.exchanges_count}\n`;
    message += `• 公告类型数：${stats.types_count}\n`;
    message += `• 代币筛选数：${stats.with_token_filter}\n\n`;
    message += "请选择操作：";
    
    return ctx.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: menus.getSubscriptionMainMenu().reply_markup
    });
  });

  // 添加订阅 - 选择交易所
  bot.bot.action("add_subscription", async (ctx) => {
    await ctx.answerCbQuery();
    
    const chatId = ctx.chat.id.toString();
    userSelections.set(chatId, { exchanges: [], types: [], tokenFilter: null });
    
    return ctx.editMessageText(
      "📊 <b>添加订阅 - 选择交易所</b>\n\n请选择要订阅的交易所（可多选）：",
      {
        parse_mode: "HTML",
        reply_markup: menus.getExchangeSelectionMenu([]).reply_markup
      }
    );
  });

  // 切换交易所选择
  bot.bot.action(/toggle_exchange_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    
    const chatId = ctx.chat.id.toString();
    const exchange = ctx.match[1];
    const selection = userSelections.get(chatId) || { exchanges: [], types: [], tokenFilter: null };
    
    if (selection.exchanges.includes(exchange)) {
      selection.exchanges = selection.exchanges.filter(e => e !== exchange);
    } else {
      selection.exchanges.push(exchange);
    }
    
    userSelections.set(chatId, selection);
    
    return ctx.editMessageReplyMarkup(
      menus.getExchangeSelectionMenu(selection.exchanges).reply_markup
    );
  });

  // 切换全选交易所
  bot.bot.action("toggle_all_exchanges", async (ctx) => {
    await ctx.answerCbQuery();
    
    const chatId = ctx.chat.id.toString();
    const selection = userSelections.get(chatId) || { exchanges: [], types: [], tokenFilter: null };
    const allExchanges = ['Binance', 'OKX', 'Bitget', 'Bybit', 'Kucoin', 'HTX', 'Gate', 'XT'];
    
    if (selection.exchanges.length === allExchanges.length) {
      selection.exchanges = [];
    } else {
      selection.exchanges = [...allExchanges];
    }
    
    userSelections.set(chatId, selection);
    
    return ctx.editMessageReplyMarkup(
      menus.getExchangeSelectionMenu(selection.exchanges).reply_markup
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
        reply_markup: menus.getAnnouncementTypeSelectionMenu([]).reply_markup
      }
    );
  });

  // 切换公告类型选择
  bot.bot.action(/toggle_type_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    
    const chatId = ctx.chat.id.toString();
    const type = ctx.match[1];
    const selection = userSelections.get(chatId) || { exchanges: [], types: [], tokenFilter: null };
    
    if (selection.types.includes(type)) {
      selection.types = selection.types.filter(t => t !== type);
    } else {
      selection.types.push(type);
    }
    
    userSelections.set(chatId, selection);
    
    return ctx.editMessageReplyMarkup(
      menus.getAnnouncementTypeSelectionMenu(selection.types).reply_markup
    );
  });

  // 切换全选公告类型
  bot.bot.action("toggle_all_types", async (ctx) => {
    await ctx.answerCbQuery();
    
    const chatId = ctx.chat.id.toString();
    const selection = userSelections.get(chatId) || { exchanges: [], types: [], tokenFilter: null };
    const allTypes = ['上新', '盘前', '合约', '下架', 'launchpool', 'launchpad', '创新', 'HODLer', 'Megadrop', 'Alpha'];
    
    if (selection.types.length === allTypes.length) {
      selection.types = [];
    } else {
      selection.types = [...allTypes];
    }
    
    userSelections.set(chatId, selection);
    
    return ctx.editMessageReplyMarkup(
      menus.getAnnouncementTypeSelectionMenu(selection.types).reply_markup
    );
  });

  // 选择代币筛选
  bot.bot.action("select_token_filter", async (ctx) => {
    await ctx.answerCbQuery();
    
    const chatId = ctx.chat.id.toString();
    const selection = userSelections.get(chatId);
    
    if (!selection || selection.types.length === 0) {
      return ctx.answerCbQuery("请先选择至少一个公告类型", { show_alert: true });
    }
    
    return ctx.editMessageText(
      "🔍 <b>添加订阅 - 代币筛选</b>\n\n请选择代币筛选方式：",
      {
        parse_mode: "HTML",
        reply_markup: menus.getTokenFilterSelectionMenu().reply_markup
      }
    );
  });

  // 不筛选代币
  bot.bot.action("no_token_filter", async (ctx) => {
    await ctx.answerCbQuery();
    
    const chatId = ctx.chat.id.toString();
    const selection = userSelections.get(chatId);
    selection.tokenFilter = null;
    
    return await finalizeSubscription(ctx, chatId, selection);
  });

  // 输入代币筛选
  bot.bot.action("input_token_filter", async (ctx) => {
    await ctx.answerCbQuery();
    
    const chatId = ctx.chat.id.toString();
    userStates.set(chatId, "waiting_token_input");
    
    return ctx.editMessageText(
      "🔍 <b>输入代币名称或符号</b>\n\n请输入要筛选的代币名称或符号：\n\n" +
      "💡 提示：输入后会显示搜索建议供您选择",
      { parse_mode: "HTML" }
    );
  });

  // 查看订阅
  bot.bot.action("view_subscriptions", async (ctx) => {
    await ctx.answerCbQuery();
    
    const telegramChatId = ctx.chat.id.toString();
    const userId = `tg_${telegramChatId}`;
    
    const [users] = await require("../../config/database").query(
      "SELECT id FROM users WHERE user_id = ?",
      [userId]
    );
    
    if (users.length === 0) {
      return ctx.reply("请先使用 /start 命令初始化账户");
    }
    
    const userDbId = users[0].id;
    const subscriptions = await SubscriptionService.getUserSubscriptions(userDbId);
    
    if (subscriptions.length === 0) {
      return ctx.editMessageText(
        "📋 <b>我的订阅</b>\n\n❌ 您还没有任何订阅\n\n点击下方按钮添加订阅：",
        {
          parse_mode: "HTML",
          reply_markup: menus.getSubscriptionMainMenu().reply_markup
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
    
    return ctx.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: menus.getSubscriptionMainMenu().reply_markup
    });
  });

  // 处理文本输入（代币搜索）
  bot.bot.on("text", async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const state = userStates.get(chatId);
    
    if (state === "waiting_token_input") {
      const query = ctx.message.text.trim();
      
      if (query.length < 1) {
        return ctx.reply("请输入至少1个字符");
      }
      
      const searchResults = await TokenSearchService.searchTokens(query, 10);
      
      if (searchResults.length === 0) {
        return ctx.reply(
          `❌ 未找到匹配 "${query}" 的代币\n\n您可以直接使用此输入作为筛选条件，或重新输入其他关键词。`,
          {
            reply_markup: menus.getTokenSearchResultsMenu([], query).reply_markup
          }
        );
      }
      
      return ctx.reply(
        `🔍 找到 ${searchResults.length} 个匹配 "${query}" 的代币：\n\n请选择一个：`,
        {
          reply_markup: menus.getTokenSearchResultsMenu(searchResults, query).reply_markup
        }
      );
    }
  });
}

// 完成订阅创建
async function finalizeSubscription(ctx, chatId, selection) {
  const telegramChatId = chatId;
  const userId = `tg_${telegramChatId}`;
  
  const [users] = await require("../../config/database").query(
    "SELECT id FROM users WHERE user_id = ?",
    [userId]
  );
  
  if (users.length === 0) {
    return ctx.reply("请先使用 /start 命令初始化账户");
  }
  
  const userDbId = users[0].id;
  
  // 创建订阅
  const subscriptions = [];
  for (const exchange of selection.exchanges) {
    for (const type of selection.types) {
      subscriptions.push({
        exchange,
        announcementType: type,
        tokenFilter: selection.tokenFilter
      });
    }
  }
  
  const success = await SubscriptionService.addBatchSubscriptions(userDbId, subscriptions);
  
  if (success) {
    let message = "✅ <b>订阅创建成功！</b>\n\n";
    message += `📊 已创建 ${subscriptions.length} 个订阅：\n`;
    message += `• 交易所：${selection.exchanges.join(", ")}\n`;
    message += `• 公告类型：${selection.types.join(", ")}\n`;
    if (selection.tokenFilter) {
      message += `• 代币筛选：${selection.tokenFilter}\n`;
    }
    
    // 清理用户状态
    userSelections.delete(chatId);
    userStates.delete(chatId);
    
    return ctx.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: menus.getSubscriptionMainMenu().reply_markup
    });
  } else {
    return ctx.editMessageText(
      "❌ 订阅创建失败，请稍后重试",
      {
        reply_markup: menus.getSubscriptionMainMenu().reply_markup
      }
    );
  }
}

module.exports = {
  setupSubscriptionActions,
  userStates,
  userSelections
};
