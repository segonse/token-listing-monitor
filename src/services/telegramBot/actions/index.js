// Actions模块统一导出和设置
const { setupBaseActions } = require('./baseActions');
const { setupSubscriptionActions } = require('./subscriptionActions');
const { setupHistoryActions } = require('./historyActions');
const { handleTextInput } = require('./textInputActions');

function setupAllActions(bot) {
  // 设置基础Actions
  setupBaseActions(bot);
  
  // 设置订阅相关Actions
  setupSubscriptionActions(bot);
  
  // 设置历史查询相关Actions
  setupHistoryActions(bot);
}

module.exports = {
  setupAllActions,
  handleTextInput,
};
