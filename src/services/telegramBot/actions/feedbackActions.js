const FeedbackService = require("../../feedbackService");
const menus = require("../menus");

// 用户状态管理
const feedbackStates = new Map();
const feedbackData = new Map();

// 状态清理配置
const STATE_TIMEOUT = 30 * 60 * 1000; // 30分钟超时
const stateTimestamps = new Map();

// 清理过期状态
function cleanupExpiredStates() {
  const now = Date.now();
  const expiredChatIds = [];

  for (const [chatId, timestamp] of stateTimestamps.entries()) {
    if (now - timestamp > STATE_TIMEOUT) {
      expiredChatIds.push(chatId);
    }
  }

  expiredChatIds.forEach((chatId) => {
    feedbackStates.delete(chatId);
    feedbackData.delete(chatId);
    stateTimestamps.delete(chatId);
  });
}

// 更新状态时间戳
function updateStateTimestamp(chatId) {
  stateTimestamps.set(chatId, Date.now());
}

// 清理特定用户状态
function clearFeedbackState(chatId) {
  feedbackStates.delete(chatId);
  feedbackData.delete(chatId);
  stateTimestamps.delete(chatId);
}

// 定期清理过期状态
const cleanupInterval = setInterval(cleanupExpiredStates, 10 * 60 * 1000);

function setupFeedbackActions(bot) {
  // 用户反馈主菜单
  bot.bot.action("user_feedback", async (ctx) => {
    await ctx.answerCbQuery();

    return ctx.reply(
      "💬 <b>反馈建议</b>\n\n欢迎提交您的宝贵意见和建议！\n\n请选择操作：",
      {
        parse_mode: "HTML",
        reply_markup: menus.getFeedbackMainMenu().reply_markup,
      }
    );
  });

  // 管理员查看反馈
  bot.bot.action("admin_view_feedback", async (ctx) => {
    await ctx.answerCbQuery();

    const telegramChatId = ctx.chat.id.toString();
    const userId = `tg_${telegramChatId}`;

    const isAdmin = await FeedbackService.isAdmin(userId);
    if (!isAdmin) {
      return ctx.reply("❌ 您没有管理员权限");
    }

    return ctx.reply("📊 <b>反馈管理</b>\n\n请通过以下方式访问Web管理界面：", {
      parse_mode: "HTML",
      reply_markup: menus.getAdminFeedbackMenu().reply_markup,
    });
  });

  // 打开Web管理界面
  bot.bot.action("open_web_admin", async (ctx) => {
    await ctx.answerCbQuery();

    const serverPort = process.env.PORT || 3153;
    const serverHost = process.env.SERVER_HOST || "158.220.97.178";
    const webUrl = `http://${serverHost}:${serverPort}/admin/feedback`;

    return ctx.reply(
      "🌐 <b>Web管理界面</b>\n\n" +
        `请在浏览器中访问：\n<code>${webUrl}</code>\n\n` +
        "🔑 <b>认证信息：</b>\n" +
        "• 访问令牌：<code>admin1234gsq</code>\n\n" +
        "💡 <b>使用说明：</b>\n" +
        "1. 访问上述链接\n" +
        "2. 在登录页面输入令牌\n" +
        "3. 令牌会自动保存到浏览器\n" +
        "4. 下次访问无需重新输入\n" +
        "5. 点击'退出登录'可清除令牌\n\n" +
        "📍 <b>安全特性：</b>\n" +
        "• 令牌存储在浏览器本地\n" +
        "• API请求自动携带认证头\n" +
        "• 令牌过期自动跳转登录\n" +
        "• 确保防火墙已开放端口 " +
        serverPort,
      {
        parse_mode: "HTML",
        reply_markup: menus.getAdminFeedbackMenu().reply_markup,
      }
    );
  });

  // 提交反馈
  bot.bot.action("submit_feedback", async (ctx) => {
    await ctx.answerCbQuery();

    return ctx.editMessageText("📝 <b>提交反馈</b>\n\n请选择反馈类型：", {
      parse_mode: "HTML",
      reply_markup: menus.getFeedbackTypeMenu().reply_markup,
    });
  });

  // 选择反馈类型
  bot.bot.action(/feedback_type_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id.toString();
    const type = ctx.match[1];

    // 保存反馈类型
    feedbackData.set(chatId, { type });
    feedbackStates.set(chatId, "waiting_title");
    updateStateTimestamp(chatId);

    const typeText = menus.getTypeText(type);

    return ctx.editMessageText(
      `📝 <b>提交反馈 - ${typeText}</b>\n\n请输入反馈标题（简短描述问题或建议）：`,
      { parse_mode: "HTML" }
    );
  });

  // 我的反馈
  bot.bot.action("my_feedback", async (ctx) => {
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
    const feedbacks = await FeedbackService.getUserFeedbacks(userDbId);

    let message = "📋 <b>我的反馈</b>\n\n";
    if (feedbacks.length === 0) {
      message += "暂无反馈记录\n\n点击下方按钮提交您的第一个反馈：";
    } else {
      message += `共有 ${feedbacks.length} 条反馈记录：`;
    }

    return ctx.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: menus.getMyFeedbackMenu(feedbacks).reply_markup,
    });
  });

  // 查看反馈详情
  bot.bot.action(/view_feedback_(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();

    const feedbackId = parseInt(ctx.match[1]);
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
    const feedback = await FeedbackService.getFeedbackDetail(
      feedbackId,
      userDbId
    );

    if (!feedback) {
      return ctx.answerCbQuery("反馈不存在或无权查看", { show_alert: true });
    }

    const statusEmoji = menus.getStatusEmoji(feedback.status);
    const typeEmoji = menus.getTypeEmoji(feedback.type);
    const statusText = menus.getStatusText(feedback.status);
    const typeText = menus.getTypeText(feedback.type);

    let message = `📋 <b>反馈详情</b>\n\n`;
    message += `${typeEmoji} <b>类型：</b>${typeText}\n`;
    message += `${statusEmoji} <b>状态：</b>${statusText}\n`;
    message += `📝 <b>标题：</b>${feedback.title}\n`;
    message += `📄 <b>内容：</b>\n${feedback.content}\n`;
    message += `🕐 <b>提交时间：</b>${new Date(
      feedback.created_at
    ).toLocaleString("zh-CN")}\n`;

    if (feedback.updated_at && feedback.updated_at !== feedback.created_at) {
      message += `🔄 <b>更新时间：</b>${new Date(
        feedback.updated_at
      ).toLocaleString("zh-CN")}\n`;
    }

    if (feedback.admin_reply) {
      message += `\n💬 <b>管理员回复：</b>\n${feedback.admin_reply}`;
    }

    return ctx.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: menus.getFeedbackDetailMenu(feedbackId).reply_markup,
    });
  });

  // 查看更多反馈
  bot.bot.action("view_more_feedback", async (ctx) => {
    await ctx.answerCbQuery();

    return ctx.answerCbQuery("请使用Web界面查看完整的反馈历史", {
      show_alert: true,
    });
  });
}

// 处理文本输入
async function handleFeedbackTextInput(bot, ctx) {
  const chatId = ctx.chat.id.toString();
  const text = ctx.message.text;
  const state = feedbackStates.get(chatId);

  if (!state) {
    return false; // 不是反馈相关的文本输入
  }

  const data = feedbackData.get(chatId) || {};

  if (state === "waiting_title") {
    if (text.length < 5 || text.length > 200) {
      return ctx.reply("标题长度应在5-200字符之间，请重新输入：");
    }

    data.title = text;
    feedbackData.set(chatId, data);
    feedbackStates.set(chatId, "waiting_content");
    updateStateTimestamp(chatId);

    const typeText = menus.getTypeText(data.type);

    return ctx.reply(
      `📝 <b>提交反馈 - ${typeText}</b>\n\n标题：${text}\n\n请输入详细内容（描述具体问题或建议）：`,
      { parse_mode: "HTML" }
    );
  }

  if (state === "waiting_content") {
    if (text.length < 10 || text.length > 2000) {
      return ctx.reply("内容长度应在10-2000字符之间，请重新输入：");
    }

    data.content = text;

    // 获取用户信息
    const telegramChatId = ctx.chat.id.toString();
    const userId = `tg_${telegramChatId}`;

    const [users] = await require("../../../config/database").query(
      "SELECT id FROM users WHERE user_id = ?",
      [userId]
    );

    if (users.length === 0) {
      clearFeedbackState(chatId);
      return ctx.reply("请先使用 /start 命令初始化账户");
    }

    const userDbId = users[0].id;

    // 创建反馈
    const feedbackId = await FeedbackService.createFeedback({
      userDbId,
      telegramUserId: userId,
      type: data.type,
      title: data.title,
      content: data.content,
    });

    clearFeedbackState(chatId);

    if (feedbackId) {
      const typeText = menus.getTypeText(data.type);

      return ctx.reply(
        `✅ <b>反馈提交成功！</b>\n\n` +
          `📋 <b>反馈ID：</b>#${feedbackId}\n` +
          `${menus.getTypeEmoji(data.type)} <b>类型：</b>${typeText}\n` +
          `📝 <b>标题：</b>${data.title}\n\n` +
          `感谢您的反馈！我们会尽快处理并回复。\n\n` +
          `您可以通过"我的反馈"查看处理进度。`,
        {
          parse_mode: "HTML",
          reply_markup: menus.getFeedbackMainMenu().reply_markup,
        }
      );
    } else {
      return ctx.reply("❌ 反馈提交失败，请稍后重试。", {
        reply_markup: menus.getFeedbackMainMenu().reply_markup,
      });
    }
  }

  return true; // 已处理
}

module.exports = {
  setupFeedbackActions,
  handleFeedbackTextInput,
  clearFeedbackState,
};
