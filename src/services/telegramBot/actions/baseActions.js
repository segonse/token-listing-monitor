const menus = require("../menus");

function setupBaseActions(bot) {
  // 返回主菜单
  bot.bot.action("back_to_main", async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.reply(
      "🏠 <b>主菜单</b>\n\n请选择您需要的功能：",
      {
        parse_mode: "HTML",
        reply_markup: menus.getMainMenu().reply_markup,
      }
    );
  });

  // 管理订阅
  bot.bot.action("manage_subscriptions", async (ctx) => {
    await ctx.answerCbQuery();
    
    const telegramChatId = ctx.chat.id.toString();
    const userId = `tg_${telegramChatId}`;
    
    const SubscriptionService = require("../../subscriptionService");
    const [users] = await require("../../../config/database").query(
      "SELECT id FROM users WHERE user_id = ?",
      [userId]
    );
    
    if (users.length === 0) {
      return ctx.reply("请先使用 /start 命令初始化账户");
    }
    
    const userDbId = users[0].id;
    const stats = await SubscriptionService.getSubscriptionStats(userDbId);
    
    let message = "🔔 <b>订阅管理</b>\n\n";
    message += `📊 <b>订阅统计</b>\n`;
    message += `• 总订阅数：${stats.total}\n`;
    message += `• 交易所数：${stats.exchanges_count}\n`;
    message += `• 公告类型数：${stats.types_count}\n`;
    message += `• 代币筛选数：${stats.unique_token_filters}\n\n`;
    message += "请选择操作：";
    
    return ctx.reply(message, {
      parse_mode: "HTML",
      reply_markup: menus.getSubscriptionMainMenu().reply_markup,
    });
  });

  // 查询历史公告
  bot.bot.action("check_history_announcements", async (ctx) => {
    await ctx.answerCbQuery();
    return ctx.reply(
      "🔍 <b>查询历史公告</b>\n\n请选择交易所：",
      {
        parse_mode: "HTML",
        reply_markup: (await menus.getExchangesMenu()).reply_markup,
      }
    );
  });

  // 无操作处理器
  bot.bot.action("no_action", async (ctx) => {
    await ctx.answerCbQuery();
  });
}

module.exports = { setupBaseActions };
