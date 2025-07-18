const menus = require("../menus");
const TokenSearchService = require("../../tokenSearchService");
const { handleFeedbackTextInput } = require("./feedbackActions");
const { handleFundingRateTextInput } = require("./fundingRateActions");

// 导入状态管理（从subscriptionActions中导入）
let userStates, userSelections;

function setStateManagers(states, selections) {
  userStates = states;
  userSelections = selections;
}

// 处理文本输入
async function handleTextInput(bot, ctx) {
  const chatId = ctx.chat.id.toString();
  const text = ctx.message.text;

  // 优先检查反馈系统的文本输入处理
  const feedbackHandled = await handleFeedbackTextInput(bot, ctx);
  if (feedbackHandled) {
    return true;
  }

  // 检查资金费率系统的文本输入处理
  const fundingRateHandled = await handleFundingRateTextInput(bot, ctx);
  if (fundingRateHandled) {
    return true;
  }

  // 检查订阅系统的文本输入处理
  const subscriptionState = userStates && userStates.get(chatId);
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
  handleTextInput,
  setStateManagers,
};
