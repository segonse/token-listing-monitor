const { Markup } = require("telegraf");
const db = require("../../config/database");
const menus = require("./menus");
const queries = require("./queries");
const {
  setupSubscriptionActions,
  userStates,
  userSelections,
} = require("./subscriptionActions");
const formatters = require("./formatters");
const TokenSearchService = require("../tokenSearchService");

function setupActions(bot) {
  // 设置订阅管理功能
  setupSubscriptionActions(bot);

  // 返回主菜单
  bot.bot.action("back_to_main", async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.reply("主菜单", menus.getMainMenu());
  });

  // 订阅公告推送
  bot.bot.action("subscribe_announcements", async (ctx) => {
    const telegramChatId = ctx.chat.id.toString();
    const userId = `tg_${telegramChatId}`;

    try {
      // 获取用户ID
      const [users] = await db.query("SELECT id FROM users WHERE user_id = ?", [
        userId,
      ]);

      if (users.length === 0) {
        return ctx.reply("用户不存在，请重新发送 /start 命令");
      }

      const userDbId = users[0].id;

      // 创建默认订阅
      await queries.createSubscription(userDbId);

      await ctx.answerCbQuery("订阅成功！");
      return ctx.reply(
        "您已成功订阅所有交易所的所有类型（除未分类）的公告推送！每当有新公告发布时，您将收到通知。"
      );
    } catch (error) {
      console.error("创建订阅失败:", error);
      await ctx.answerCbQuery("订阅失败");
      return ctx.reply("订阅失败，请稍后再试");
    }
  });

  // 查询历史公告
  bot.bot.action("check_history_announcements", async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const menu = await menus.getExchangesMenu();
      return ctx.reply("请选择要查询的交易所:", menu);
    } catch (error) {
      console.error("生成交易所菜单失败:", error);
      return ctx.reply("生成菜单失败，请稍后再试");
    }
  });

  // 添加交易所选择的处理
  bot.bot.action(/check_(.+)/, async (ctx) => {
    const exchange = ctx.match[1];
    let exchangeName = "所有交易所";

    if (exchange !== "all_exchanges") {
      exchangeName = exchange.charAt(0).toUpperCase() + exchange.slice(1);
    }

    await ctx.answerCbQuery();

    try {
      const menu = await menus.getAnnouncementTypesMenu(exchange);
      return ctx.reply(`请选择${exchangeName}的公告类型:`, menu);
    } catch (error) {
      console.error("生成公告类型菜单失败:", error);
      return ctx.reply("生成菜单失败，请稍后再试");
    }
  });

  // 添加公告类型选择的处理
  bot.bot.action(/type_(.+)_(.+)/, async (ctx) => {
    const exchange = ctx.match[1];
    const type = ctx.match[2];

    // 存储用户选择，用于后续查询
    const chatId = ctx.chat.id.toString();
    if (!bot.userSelections) bot.userSelections = {};
    bot.userSelections[chatId] = {
      exchange,
      type,
    };

    await ctx.answerCbQuery();

    // 询问是否需要按代币符号/名称筛选
    return ctx.reply(
      "您是否需要按代币符号/代币名称筛选?",
      menus.getTokenFilterMenu(exchange, type)
    );
  });

  // 处理代币符号/名称筛选选择
  bot.bot.action(/filter_token_(.+)_(.+)/, (ctx) => {
    const exchange = ctx.match[1];
    const type = ctx.match[2];
    const chatId = ctx.chat.id.toString();

    // 更新用户状态
    if (!bot.userStates) bot.userStates = {};
    bot.userStates[chatId] = `waiting_token_${exchange}_${type}`;

    ctx.answerCbQuery();
    return ctx.reply("请输入要筛选的代币符号或代币名称:");
  });

  // 处理直接选择结果数量（不筛选代币）
  bot.bot.action(/select_limit_(.+)_(.+)/, (ctx) => {
    const exchange = ctx.match[1];
    const type = ctx.match[2];

    ctx.answerCbQuery();
    return ctx.reply(`您要查看多少条结果?`, menus.getLimitMenu(exchange, type));
  });

  // 执行查询
  bot.bot.action(/execute_query_(.+)_(.+)_(\d+)/, async (ctx) => {
    const chatId = ctx.chat.id.toString();

    try {
      // 优先从存储的用户选择中获取参数
      let exchange,
        type,
        tokenOrSymbol = null;

      if (bot.userSelections && bot.userSelections[chatId]) {
        exchange = bot.userSelections[chatId].exchange;
        type = bot.userSelections[chatId].type;
        tokenOrSymbol = bot.userSelections[chatId].tokenOrSymbol;
      } else {
        // 如果没有存储，则从回调数据中解析
        exchange = ctx.match[1];
        type = ctx.match[2];
      }

      const limit = parseInt(ctx.match[3]);

      // 验证参数
      if (!exchange || !type || !limit) {
        throw new Error("查询参数不完整");
      }

      await ctx.answerCbQuery();
      await ctx.reply("正在查询，请稍候...");

      // 准备查询参数
      const exchangeParam = exchange === "all_exchanges" ? "all" : [exchange];
      const typeParam = type === "all" ? "all" : [type];

      let tokenName = null;
      let symbol = null;

      // 检查是否有代币符号/名称筛选
      if (tokenOrSymbol) {
        // 同时作为代币符号和名称尝试查询
        tokenName = tokenOrSymbol;
        symbol = tokenOrSymbol;
      }

      // 调用API获取公告
      const Announcement = require("../../models/Announcement");
      const announcements = await Announcement.getFilteredAnnouncements({
        exchanges: exchangeParam,
        types: typeParam,
        tokenName,
        symbol,
        limit,
      });

      // 清除用户选择
      if (bot.userSelections && bot.userSelections[chatId]) {
        delete bot.userSelections[chatId];
      }

      // 处理查询结果
      if (announcements.length > 0) {
        for (const announcement of announcements) {
          // 将每个公告作为单独的消息发送，避免消息过长
          const message = formatters.formatAnnouncementMessage(announcement);
          await ctx.reply(message, {
            parse_mode: "HTML",
            disable_web_page_preview: true,
          });

          // 避免发送过快触发Telegram限流
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        await ctx.reply(
          "以上是查询到的最新公告，如需查看更多，请点击下方按钮：",
          menus.getResultNavMenu()
        );
      } else {
        await ctx.reply("未查询到符合条件的公告", menus.getResultNavMenu());
      }
    } catch (error) {
      console.error("查询公告失败:", error);
      await ctx.reply(
        "查询公告失败，请稍后再试",
        Markup.inlineKeyboard([
          [Markup.button.callback("返回", "check_history_announcements")],
        ])
      );
    }
  });
}

// 处理文本输入
async function handleTextInput(bot, ctx) {
  const chatId = ctx.chat.id.toString();
  const text = ctx.message.text;

  // 检查订阅系统的文本输入处理
  const subscriptionState = userStates.get(chatId);
  if (subscriptionState === "waiting_token_input") {
    const query = text.trim();

    if (query.length < 1) {
      return ctx.reply("请输入至少1个字符");
    }

    const searchResults = await TokenSearchService.searchTokens(query, 10);

    // 搜索完成后清除状态，避免后续文本输入被误处理
    userStates.delete(chatId);

    if (searchResults.length === 0) {
      await ctx.reply(
        `❌ 未找到匹配 "${query}" 的代币\n\n您可以直接使用此输入作为筛选条件，或重新输入其他关键词。`,
        {
          reply_markup: menus.getTokenSearchResultsMenu([], query).reply_markup,
        }
      );
      return true;
    }

    await ctx.reply(
      `🔍 找到 ${searchResults.length} 个匹配 "${query}" 的代币：\n\n请选择一个：`,
      {
        reply_markup: menus.getTokenSearchResultsMenu(searchResults, query)
          .reply_markup,
      }
    );
    return true;
  }

  // 检查是否在等待输入代币符号/代币名称（历史查询功能）
  if (
    bot.userStates &&
    bot.userStates[chatId] &&
    bot.userStates[chatId].startsWith("waiting_token_")
  ) {
    const params = bot.userStates[chatId].split("_");
    const exchange = params[2];
    const type = params[3];

    // 保存用户输入的代币符号/代币名称
    if (!bot.userSelections) bot.userSelections = {};
    if (!bot.userSelections[chatId]) bot.userSelections[chatId] = {};

    bot.userSelections[chatId].tokenOrSymbol = text;

    // 清除状态
    delete bot.userStates[chatId];

    // 继续询问结果数量
    await ctx.reply(`您要查看多少条结果?`, menus.getLimitMenu(exchange, type));
    return true;
  }

  return false; // 不是我们处理的文本输入
}

module.exports = {
  setupActions,
  handleTextInput,
};
