/**
 * 生成指定长度的随机字符串
 * @param {number} length 字符串长度
 * @returns {string} 随机字符串
 */
const generateRandomString = (length = 16) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * 获取动态代理配置
 * @returns {Object} 代理配置对象
 */
const getDynamicProxyConfig = () => {
  const randomId = generateRandomString(16);

  return {
    host: process.env.PROXY_HOST || "localhost",
    port: parseInt(process.env.PROXY_PORT || "1080"),
    auth: {
      username: `user-depinBless-region-BR-sessid-BR${randomId}-sesstime-90`,
      password: process.env.PROXY_PASSWORD || "",
    },
  };
};

module.exports = { generateRandomString, getDynamicProxyConfig };
