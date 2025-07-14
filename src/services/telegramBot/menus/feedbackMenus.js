const { Markup } = require("telegraf");

// 反馈主菜单
function getFeedbackMainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📝 提交反馈", "submit_feedback")],
    [Markup.button.callback("📋 我的反馈", "my_feedback")],
    [Markup.button.callback("🏠 返回主菜单", "back_to_main")],
  ]);
}

// 反馈类型选择菜单
function getFeedbackTypeMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("🐛 Bug报告", "feedback_type_bug"),
      Markup.button.callback("💡 功能建议", "feedback_type_feature"),
    ],
    [
      Markup.button.callback("⚡ 改进建议", "feedback_type_improvement"),
      Markup.button.callback("❓ 其他", "feedback_type_other"),
    ],
    [Markup.button.callback("⬅️ 返回", "user_feedback")],
  ]);
}

// 我的反馈菜单
function getMyFeedbackMenu(feedbacks) {
  const buttons = [];

  if (feedbacks.length === 0) {
    buttons.push([Markup.button.callback("❌ 暂无反馈记录", "no_action")]);
  } else {
    // 显示最近的反馈（最多5个）
    feedbacks.slice(0, 5).forEach((feedback, index) => {
      const statusEmoji = getStatusEmoji(feedback.status);
      const typeEmoji = getTypeEmoji(feedback.type);
      const displayText = `${statusEmoji} ${typeEmoji} ${feedback.title}`;

      buttons.push([
        Markup.button.callback(
          displayText.length > 35
            ? displayText.substring(0, 35) + "..."
            : displayText,
          `view_feedback_${feedback.id}`
        ),
      ]);
    });

    if (feedbacks.length > 5) {
      buttons.push([
        Markup.button.callback(
          `📄 查看更多 (${feedbacks.length - 5}条)`,
          "view_more_feedback"
        ),
      ]);
    }
  }

  buttons.push([
    Markup.button.callback("📝 提交新反馈", "submit_feedback"),
    Markup.button.callback("⬅️ 返回", "user_feedback"),
  ]);

  return Markup.inlineKeyboard(buttons);
}

// 反馈详情菜单
function getFeedbackDetailMenu(feedbackId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("⬅️ 返回列表", "my_feedback")],
    [Markup.button.callback("🏠 返回主菜单", "back_to_main")],
  ]);
}

// 管理员反馈查看菜单
function getAdminFeedbackMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🌐 打开Web管理界面", "open_web_admin")],
    [Markup.button.callback("🏠 返回主菜单", "back_to_main")],
  ]);
}

// 获取状态表情符号
function getStatusEmoji(status) {
  const statusMap = {
    pending: "⏳",
    in_progress: "🔄",
    resolved: "✅",
    rejected: "❌",
  };
  return statusMap[status] || "❓";
}

// 获取类型表情符号
function getTypeEmoji(type) {
  const typeMap = {
    bug: "🐛",
    feature: "💡",
    improvement: "⚡",
    other: "❓",
  };
  return typeMap[type] || "❓";
}

// 获取状态中文名称
function getStatusText(status) {
  const statusMap = {
    pending: "待处理",
    in_progress: "处理中",
    resolved: "已解决",
    rejected: "已拒绝",
  };
  return statusMap[status] || "未知";
}

// 获取类型中文名称
function getTypeText(type) {
  const typeMap = {
    bug: "Bug报告",
    feature: "功能建议",
    improvement: "改进建议",
    other: "其他",
  };
  return typeMap[type] || "未知";
}

module.exports = {
  getFeedbackMainMenu,
  getFeedbackTypeMenu,
  getMyFeedbackMenu,
  getFeedbackDetailMenu,
  getAdminFeedbackMenu,
  getStatusEmoji,
  getTypeEmoji,
  getStatusText,
  getTypeText,
};
