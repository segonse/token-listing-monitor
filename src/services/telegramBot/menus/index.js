// 菜单模块统一导出
const mainMenus = require('./mainMenus');
const subscriptionMenus = require('./subscriptionMenus');
const historyMenus = require('./historyMenus');

module.exports = {
  // 主菜单
  ...mainMenus,
  
  // 订阅相关菜单
  ...subscriptionMenus,
  
  // 历史查询相关菜单
  ...historyMenus,
};
