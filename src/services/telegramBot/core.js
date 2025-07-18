const { Telegraf } = require("telegraf");
const { SocksProxyAgent } = require("socks-proxy-agent");
const { HttpsProxyAgent } = require("https-proxy-agent");
require("dotenv").config();
const commands = require("./commands");
const { setupAllActions, handleTextInput } = require("./actions/index");

class TelegramBot {
  constructor() {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      console.error("错误: 未设置TELEGRAM_BOT_TOKEN环境变量");
      return;
    }

    // 代理配置
    const proxyConfig = this.getProxyConfig();

    this.bot = new Telegraf(botToken, {
      telegram: {
        agent: proxyConfig.agent,
      },
    });
    this.userSelections = {};
    this.userStates = {};

    // 初始化命令和动作
    commands.setupCommands(this);
    setupAllActions(this);

    // 添加全局错误处理
    this.setupGlobalErrorHandling();

    // 添加健康检查
    // this.setupHealthCheck();

    // 处理未知命令（文本输入处理已移至actions模块统一管理）
    this.bot.on("text", async (ctx) => {
      const text = ctx.message.text;

      // 所有文本输入都由actions模块统一处理
      const handled = await handleTextInput(this, ctx);

      if (!handled) {
        // 未被处理的文本消息
        if (text.startsWith("/")) {
          // 未知命令
          ctx.reply("未识别的命令。发送 /help 获取可用命令列表。");
        } else {
          // 普通文本消息
          const telegramChatId = ctx.chat.id.toString();
          const userId = `tg_${telegramChatId}`;
          const FeedbackService = require("../feedbackService");
          const isAdmin = await FeedbackService.isAdmin(userId);

          ctx.reply(
            "您好！请使用菜单按钮或发送 /help 查看可用命令。",
            commands.getMainMenu(isAdmin)
          );
        }
      }
    });
  }

  setupGlobalErrorHandling() {
    if (!this.bot) return;

    // 1. 捕获所有未处理的错误
    this.bot.catch((err, ctx) => {
      console.error("Telegram Bot 未处理的错误:", {
        error: err.message,
        stack: err.stack,
        update: ctx.update,
        timestamp: new Date().toISOString(),
      });

      // 尝试向用户发送友好的错误消息
      this.sendErrorResponse(ctx, err);

      // 检查是否为严重错误，需要重启
      if (this.isCriticalError(err)) {
        console.error("检测到严重错误，准备重启进程...");
        setTimeout(() => {
          process.exit(1); // 让PM2重启
        }, 1000);
      }
    });

    // 2. 捕获进程级别的未处理错误
    process.on("uncaughtException", (err) => {
      console.error("未捕获的异常:", err);
      // 给一些时间清理资源
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("未处理的Promise拒绝:", reason);
      console.error("Promise:", promise);
      // 对于Promise拒绝，可以选择不立即退出
    });
  }

  setupHealthCheck() {
    // 健康检查机制
    this.lastActivity = Date.now();
    this.healthCheckInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - this.lastActivity;

      // 如果超过10分钟没有活动，可能bot已经死掉了
      if (timeSinceLastActivity > 10 * 60 * 1000) {
        console.error("Bot长时间无响应，准备重启...");
        process.exit(1);
      }
    }, 5 * 60 * 1000); // 每5分钟检查一次

    // 在每次处理消息时更新活动时间
    this.bot.use((ctx, next) => {
      this.lastActivity = Date.now();
      return next();
    });
  }

  async sendErrorResponse(ctx, error) {
    try {
      // 根据错误类型发送不同的响应
      let message = "❌ 系统出现了一些问题，请稍后重试。";

      if (
        error.message.includes("database") ||
        error.message.includes("mysql")
      ) {
        message = "❌ 数据库连接异常，请稍后重试。";
      } else if (
        error.message.includes("network") ||
        error.message.includes("timeout")
      ) {
        message = "❌ 网络连接异常，请稍后重试。";
      }

      // 尝试回复用户
      if (ctx.reply) {
        await ctx.reply(message);
      } else if (ctx.answerCbQuery) {
        await ctx.answerCbQuery(message, { show_alert: true });
      }
    } catch (replyError) {
      console.error("发送错误响应失败:", replyError);
    }
  }

  isCriticalError(error) {
    // 判断是否为需要重启的严重错误
    const criticalPatterns = [
      "bot.bot.action(...) is not a function",
      "400: Bad Request:",
      "TimeoutError: Promise timed out",
    ];

    return criticalPatterns.some(
      (pattern) =>
        error.message.includes(pattern) || error.stack.includes(pattern)
    );
  }

  launch() {
    if (!this.bot) {
      console.error("无法启动Telegram Bot: 配置不完整");
      return false;
    }

    try {
      this.bot.launch();
      console.log("Telegram Bot 已启动");

      // 优雅地处理停止信号
      process.once("SIGINT", () => {
        console.log("正在关闭Telegram Bot...");
        this.cleanup();
        this.bot.stop("SIGINT");
      });
      process.once("SIGTERM", () => {
        console.log("正在关闭Telegram Bot...");
        this.cleanup();
        this.bot.stop("SIGTERM");
      });

      return true;
    } catch (error) {
      console.error("启动Telegram Bot失败:", error);
      return false;
    }
  }

  cleanup() {
    // 清理资源
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  getProxyConfig() {
    const proxyHost = process.env.TELEGRAM_PROXY_HOST;
    const proxyPort = process.env.TELEGRAM_PROXY_PORT;
    const proxyUsername = process.env.TELEGRAM_PROXY_USERNAME;
    const proxyPassword = process.env.TELEGRAM_PROXY_PASSWORD;
    const proxyType = process.env.TELEGRAM_PROXY_TYPE || "http"; // http 或 socks5

    if (!proxyHost || !proxyPort) {
      return { agent: null };
    }

    let proxyUrl;
    if (proxyUsername && proxyPassword) {
      proxyUrl = `${proxyType}://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`;
    } else {
      proxyUrl = `${proxyType}://${proxyHost}:${proxyPort}`;
    }

    let agent;
    if (proxyType === "socks5") {
      agent = new SocksProxyAgent(proxyUrl);
    } else {
      agent = new HttpsProxyAgent(proxyUrl);
    }

    console.log(
      `Telegram Bot 使用代理: ${proxyType}://${proxyHost}:${proxyPort}`
    );
    return { agent };
  }
}

module.exports = TelegramBot;
