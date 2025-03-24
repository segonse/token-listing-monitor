/**
 * Node TLS Client
 * 一个用于绕过Cloudflare保护的Node.js库，通过自定义TLS指纹
 */

const { getRandomBrowserConfig } = require("./lib/browser-config");

// 日志级别: none, error, warn, info, debug
const LOG_LEVEL = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
};

/**
 * TLS客户端类
 */
class TlsClient {
  /**
   * 构造函数
   * @param {Object} options 配置选项
   * @param {boolean} options.mobile 是否使用移动设备配置
   * @param {string} options.preferredBrowser 首选浏览器类型 (chrome, firefox, safari, edge)
   * @param {string} options.proxy 代理URL
   * @param {string} options.ja3 自定义JA3指纹
   * @param {string} options.userAgent 自定义User-Agent
   * @param {number} options.logLevel 日志级别 (0: none, 1: error, 2: warn, 3: info, 4: debug)
   */
  constructor(options = {}) {
    this.options = options;
    this.logLevel =
      options.logLevel !== undefined ? options.logLevel : LOG_LEVEL.ERROR;

    // 获取浏览器配置
    const browserConfig = getRandomBrowserConfig(
      options.mobile || false,
      options.preferredBrowser || "firefox"
    );

    // 配置优先级：
    // 1. 用户提供的配置（options中的配置）
    // 2. browserConfig中的默认配置
    this.userAgent = options.userAgent || browserConfig.userAgent;
    this.ja3 = options.ja3 || browserConfig.ja3;
    this.defaultHeaders = {
      ...browserConfig.headers,
    };

    // 如果用户提供了头信息，合并到默认头中
    if (options.headers) {
      this.defaultHeaders = {
        ...this.defaultHeaders,
        ...options.headers,
      };
    }

    // 初始化TLS客户端
    this.initTlsClient();
  }

  /**
   * 记录日志
   * @private
   */
  _log(level, ...args) {
    if (this.logLevel >= level) {
      const prefix = {
        [LOG_LEVEL.ERROR]: "[ERROR]",
        [LOG_LEVEL.WARN]: "[WARN]",
        [LOG_LEVEL.INFO]: "[INFO]",
        [LOG_LEVEL.DEBUG]: "[DEBUG]",
      }[level];

      console.log(prefix, ...args);
    }
  }

  /**
   * 初始化TLS客户端
   * @private
   */
  initTlsClient() {
    // 动态导入tls-client，避免全局变量
    let tlsClient;
    try {
      tlsClient = require("tls-client");
      this._log(LOG_LEVEL.INFO, "成功加载tls-client库");
    } catch (error) {
      this._log(LOG_LEVEL.ERROR, "tls-client库加载失败:", error.message);
      throw new Error(`tls-client库不可用: ${error.message}`);
    }

    try {
      this._log(LOG_LEVEL.DEBUG, `使用JA3指纹创建TLS会话: ${this.ja3}`);

      // 使用Session模式
      if (tlsClient.Session) {
        // 创建会话配置
        const sessionConfig = {
          clientIdentifier: this.options.clientIdentifier || "firefox_102",
        };

        // 如果提供了JA3指纹，添加到配置中
        if (this.ja3) {
          sessionConfig.ja3String = this.ja3;
        }

        this.tlsSession = new tlsClient.Session(sessionConfig);

        if (
          typeof this.tlsSession.get !== "function" ||
          typeof this.tlsSession.post !== "function"
        ) {
          this._log(LOG_LEVEL.WARN, "tls-client Session API不兼容");
          throw new Error("tls-client Session API不兼容");
        }
      }
      // 使用静态方法模式
      else if (
        typeof tlsClient.get === "function" &&
        typeof tlsClient.post === "function"
      ) {
        this.tlsStatic = tlsClient;
      } else {
        this._log(LOG_LEVEL.WARN, "tls-client API不兼容");
        throw new Error("tls-client API不兼容");
      }
    } catch (error) {
      this._log(LOG_LEVEL.ERROR, `初始化tls-client失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 发送HTTP请求
   * @param {string} url 请求URL
   * @param {Object} options 请求选项
   * @param {string} method 请求方法
   * @returns {Promise<Object>} 响应对象
   */
  async request(url, options = {}, method = "GET") {
    // 合并请求头的正确顺序:
    // 1. 默认头
    // 2. 用户在调用时提供的头 (允许覆盖默认头)
    // 3. 必须保留的头 (如UA)
    const headers = {
      ...this.defaultHeaders,
      ...(options.headers || {}),
      "User-Agent": options.headers?.["User-Agent"] || this.userAgent, // 确保UA存在，但允许用户覆盖
    };

    this._log(LOG_LEVEL.DEBUG, "最终请求头", headers);

    // 准备请求选项
    const requestOptions = {
      ...(options || {}),
      headers,
    };

    // console.log("requestOptions", requestOptions);

    // 添加代理
    if (this.options.proxy) {
      requestOptions.proxy = this.options.proxy;
    }

    return await this._tlsRequest(url, requestOptions, method);
  }

  /**
   * 使用tls-client发送请求
   * @private
   */
  async _tlsRequest(url, options, method) {
    // 尝试使用tls-client
    try {
      this._log(LOG_LEVEL.DEBUG, `发送${method}请求到: ${url}`);
      let response = null;

      // 如果有会话实例
      if (this.tlsSession) {
        this._log(LOG_LEVEL.DEBUG, "使用tls-client会话发送请求");

        if (method.toUpperCase() === "GET") {
          response = await this.tlsSession.get(url, options);
        } else if (method.toUpperCase() === "POST") {
          response = await this.tlsSession.post(url, options);
        } else {
          throw new Error(`不支持的HTTP方法: ${method}`);
        }
      }
      // 如果有静态方法
      else if (this.tlsStatic) {
        this._log(LOG_LEVEL.DEBUG, "使用tls-client静态方法发送请求");

        if (method.toUpperCase() === "GET") {
          response = await this.tlsStatic.get(url, options);
        } else if (method.toUpperCase() === "POST") {
          response = await this.tlsStatic.post(url, options);
        } else {
          throw new Error(`不支持的HTTP方法: ${method}`);
        }
      }

      // 确保响应是有效的
      if (!response) {
        throw new Error("tls-client返回无效响应");
      }

      this._log(LOG_LEVEL.DEBUG, `收到响应: ${response.status}`);

      // 检查body字段是否存在
      if (response.body === undefined || response.body === null) {
        this._log(LOG_LEVEL.DEBUG, "响应体为空，尝试检查其他字段");

        // 尝试从其他可能的字段获取内容
        if (response.data !== undefined) {
          response.body = response.data;
        } else if (response.response && response.response.body) {
          response.body = response.response.body;
        } else if (response.text) {
          try {
            response.body = await response.text();
          } catch (error) {
            this._log(LOG_LEVEL.WARN, "获取响应文本失败:", error.message);
          }
        }
      }

      // 如果响应体仍然为空并且状态码为200，可能表示空的成功响应
      if (
        (response.body === undefined || response.body === null) &&
        response.status === 200
      ) {
        response.body = "{}"; // 提供空的JSON对象
      }

      // 建立标准化响应对象
      return {
        status: response.status,
        statusText:
          response.statusText || (response.status === 200 ? "OK" : ""),
        headers: response.headers || {},
        body: response.body,
        ok: response.status >= 200 && response.status < 300,
        json: () => {
          try {
            if (typeof response.body === "string") {
              return JSON.parse(response.body);
            } else if (response.body && typeof response.body === "object") {
              return response.body;
            } else {
              return {}; // 返回空对象
            }
          } catch (error) {
            this._log(LOG_LEVEL.ERROR, "JSON解析失败:", error.message);
            throw new Error(`响应不是有效的JSON: ${error.message}`);
          }
        },
        text: () => {
          if (typeof response.text === "string") {
            return response.text;
          } else if (response.body && typeof response.body === "object") {
            return JSON.stringify(response.body);
          } else {
            return response.text || "";
          }
        },
      };
    } catch (error) {
      this._log(LOG_LEVEL.ERROR, "请求失败:", error.message);
      throw error;
    }
  }

  /**
   * 发送GET请求
   * @param {string} url 请求URL
   * @param {Object} options 请求选项
   * @returns {Promise<Object>} 响应对象
   */
  async get(url, options = {}) {
    return this.request(url, options, "GET");
  }

  /**
   * 发送POST请求
   * @param {string} url 请求URL
   * @param {Object} options 请求选项
   * @returns {Promise<Object>} 响应对象
   */
  async post(url, options = {}) {
    return this.request(url, options, "POST");
  }
}

/**
 * 创建TLS客户端实例
 * @param {Object} options 配置选项
 * @returns {TlsClient} TLS客户端实例
 */
function createClient(options = {}) {
  return new TlsClient(options);
}

// 导出日志级别常量
module.exports = {
  createClient,
  TlsClient,
  LOG_LEVEL,
};
