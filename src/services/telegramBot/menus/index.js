// 菜单模块统一导出
const mainMenus = require("./mainMenus");
const subscriptionMenus = require("./subscriptionMenus");
const historyMenus = require("./historyMenus");
const feedbackMenus = require("./feedbackMenus");
const fundingRateMenus = require("./fundingRateMenus");

module.exports = {
  // 主菜单
  ...mainMenus,

  // 订阅相关菜单
  ...subscriptionMenus,

  // 历史查询相关菜单
  ...historyMenus,

  // 反馈相关菜单
  ...feedbackMenus,

  // 资金费率相关菜单
  ...fundingRateMenus,
};
