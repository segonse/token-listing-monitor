const { Markup } = require("telegraf");
const menus = require("../menus");
const formatters = require("../formatters");

function setupHistoryActions(bot) {
  // 选择交易所
  bot.bot.action(/exchange_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const exchange = ctx.match[1];

    return ctx.editMessageText(
      `🔍 <b>查询历史公告 - ${exchange === "all_exchanges" ? "全部交易所" : exchange}</b>\n\n请选择公告类型：`,
      {
        parse_mode: "HTML",
        reply_markup: (await menus.getAnnouncementTypesMenu(exchange)).reply_markup,
      }
    );
  });

  // 选择公告类型
  bot.bot.action(/type_(.+)_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const exchange = ctx.match[1];
    const type = ctx.match[2];

    return ctx.editMessageText(
      `🔍 <b>查询历史公告</b>\n\n交易所：${exchange === "all_exchanges" ? "全部" : exchange}\n公告类型：${type === "all" ? "全部" : type}\n\n是否需要代币筛选？`,
      {
        parse_mode: "HTML",
        reply_markup: menus.getTokenFilterMenu(exchange, type).reply_markup,
      }
    );
  });

  // 代币筛选选择
  bot.bot.action(/filter_(.+)_(.+)_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const exchange = ctx.match[1];
    const type = ctx.match[2];
    const filterType = ctx.match[3];

    if (filterType === "none") {
      // 不筛选，直接询问结果数量
      return ctx.editMessageText(
        `🔍 <b>查询历史公告</b>\n\n交易所：${exchange === "all_exchanges" ? "全部" : exchange}\n公告类型：${type === "all" ? "全部" : type}\n代币筛选：无\n\n您要查看多少条结果？`,
        {
          parse_mode: "HTML",
          reply_markup: menus.getLimitMenu(exchange, type).reply_markup,
        }
      );
    } else if (filterType === "input") {
      // 输入代币名称/符号
      const chatId = ctx.chat.id.toString();
      if (!bot.userStates) bot.userStates = {};
      bot.userStates[chatId] = `waiting_token_${exchange}_${type}`;

      return ctx.editMessageText(
        "🔍 <b>输入代币名称或符号</b>\n\n请输入要筛选的代币名称或符号：",
        { parse_mode: "HTML" }
      );
    }
  });

  // 执行查询
  bot.bot.action(/execute_query_(.+)_(.+)_(\d+)/, async (ctx) => {
    const chatId = ctx.chat.id.toString();

    try {
      // 优先从存储的用户选择中获取参数
      let exchange, type, tokenOrSymbol = null;

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
      const Announcement = require("../../../models/Announcement");
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

module.exports = { setupHistoryActions };
