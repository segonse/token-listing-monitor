/**
 * 浏览器配置处理模块
 * 负责加载和处理浏览器配置信息，包括User-Agent、JA3指纹和HTTP头
 */

const fs = require("fs");
const path = require("path");

// 浏览器配置文件路径
const BROWSERS_CONFIG_PATH = path.join(__dirname, "../resources/browsers.json");

/**
 * 加载浏览器配置
 * @returns {Object} 浏览器配置对象
 */
function loadBrowsersConfig() {
  try {
    const configData = fs.readFileSync(BROWSERS_CONFIG_PATH, "utf8");
    return JSON.parse(configData);
  } catch (error) {
    console.error("加载浏览器配置失败:", error.message);
    throw new Error("无法加载浏览器配置文件");
  }
}

/**
 * 随机选择一个元素
 * @param {Array} array 数组
 * @returns {*} 随机选择的元素
 */
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 获取随机浏览器配置
 * @param {boolean} mobile 是否使用移动设备配置
 * @param {string} preferredBrowser 首选浏览器类型 (chrome, firefox, edge, safari)
 * @returns {Object} 浏览器配置对象
 */
function getRandomBrowserConfig(mobile = false, preferredBrowser = null) {
  const browsersConfig = loadBrowsersConfig();

  // 确定设备类型
  const deviceType = mobile ? "mobile" : "desktop";
  const userAgents = browsersConfig.user_agents[deviceType];

  // 随机选择操作系统
  const osList = Object.keys(userAgents);
  const os = randomChoice(osList);

  // 获取该操作系统下的浏览器列表
  const browsers = userAgents[os];
  const browserList = Object.keys(browsers);

  // 选择浏览器类型
  let browserType;
  if (preferredBrowser && browserList.includes(preferredBrowser)) {
    browserType = preferredBrowser;
  } else {
    browserType = randomChoice(browserList);
  }

  // 随机选择User-Agent
  const userAgent = randomChoice(browsers[browserType]);

  // 获取JA3指纹
  const ja3 = browsersConfig.ja3[browserType] || browsersConfig.ja3.chrome;

  // 获取HTTP头
  const headers =
    browsersConfig.headers[browserType] || browsersConfig.headers.chrome;

  return {
    userAgent,
    ja3,
    headers,
  };
}

module.exports = {
  getRandomBrowserConfig,
  loadBrowsersConfig,
};
