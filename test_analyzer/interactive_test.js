const readline = require("readline");
const AnnouncementAnalyzer = require("./announcement_analyzer");

// 创建命令行接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

class InteractiveTest {
  constructor() {
    this.analyzer = new AnnouncementAnalyzer();
    this.results = [];
  }

  // 显示欢迎信息
  showWelcome() {
    console.log("\n🚀 公告分析器 - 交互式测试工具");
    console.log("=====================================");
    console.log("请确保已配置好 .env 文件中的API密钥");
    console.log('输入 "help" 查看帮助信息');
    console.log('输入 "quit" 退出程序\n');
  }

  // 显示帮助信息
  showHelp() {
    console.log("\n📖 帮助信息");
    console.log("===========");
    console.log("命令列表:");
    console.log("  analyze <公告标题>  - 分析单个公告");
    console.log("  batch              - 批量分析预设公告");
    console.log("  results            - 显示所有分析结果");
    console.log("  report             - 生成分析报告");
    console.log("  save               - 保存结果到文件");
    console.log("  clear              - 清空结果");
    console.log("  help               - 显示帮助信息");
    console.log("  quit               - 退出程序");
    console.log("\n示例:");
    console.log(
      "  analyze Binance Will List Pepe (PEPE) in the Innovation Zone"
    );
    console.log("  analyze 币安将上线Pepe (PEPE)交易\n");
  }

  // 分析单个公告
  async analyzeSingle(title, exchange = "unknown") {
    console.log(`\n🔍 正在分析: ${title}`);
    console.log("⏳ 请稍等...\n");

    try {
      const result = await this.analyzer.processAnnouncement(title, exchange);
      this.results.push(result);

      console.log("✅ 分析完成!");
      console.log("📊 分析结果:");
      const categories = result.analysis.categories || [
        result.analysis.category,
      ];
      console.log(
        `   分类: ${categories.join(", ")} (置信度: ${
          result.analysis.confidence
        })`
      );
      console.log(`   说明: ${result.analysis.analysis}`);

      if (
        categories.includes("NEW_LISTING") &&
        result.enriched_tokens.length > 0
      ) {
        console.log("🪙 代币信息:");
        result.enriched_tokens.forEach((token, index) => {
          console.log(`   ${index + 1}. ${token.name} (${token.symbol})`);
          console.log(`      价格: $${token.price_usd || "N/A"}`);
          console.log(
            `      市值: $${
              token.market_cap
                ? (token.market_cap / 1000000).toFixed(2) + "M"
                : "N/A"
            }`
          );
          if (token.contract_address) {
            console.log(`      合约: ${token.contract_address}`);
          }
        });
      }
    } catch (error) {
      console.error("❌ 分析失败:", error.message);
    }
  }

  // 批量分析预设公告
  async batchAnalyze() {
    const presetAnnouncements = [
      {
        title: "Binance Will List Pepe (PEPE) in the Innovation Zone",
        exchange: "binance",
      },
      {
        title: "OKX Will List Arbitrum (ARB) for Spot Trading",
        exchange: "okx",
      },
      { title: "Bybit Adds BLUR/USDT Trading Pair", exchange: "bybit" },
      {
        title: "Gate.io Startup: Participate in SUI Token Sale",
        exchange: "gate",
      },
      {
        title: "Scheduled System Maintenance - 2024-01-15",
        exchange: "binance",
      },
      { title: "币安将上线Pepe (PEPE)交易", exchange: "binance" },
    ];

    console.log(
      `\n🔄 开始批量分析 ${presetAnnouncements.length} 个预设公告...`
    );

    try {
      const batchResults = await this.analyzer.processAnnouncements(
        presetAnnouncements
      );
      this.results.push(...batchResults);

      console.log("✅ 批量分析完成!");
      this.showQuickReport();
    } catch (error) {
      console.error("❌ 批量分析失败:", error.message);
    }
  }

  // 显示快速报告
  showQuickReport() {
    if (this.results.length === 0) {
      console.log("\n📭 暂无分析结果");
      return;
    }

    const categories = {};
    const newListings = [];

    this.results.forEach((result) => {
      const analysisCategories = result.analysis.categories || [
        result.analysis.category,
      ];

      // 统计每个分类
      analysisCategories.forEach((category) => {
        categories[category] = (categories[category] || 0) + 1;
      });

      // 收集包含NEW_LISTING的公告
      if (analysisCategories.includes("NEW_LISTING")) {
        newListings.push(result);
      }
    });

    console.log("\n📊 快速报告");
    console.log("============");
    console.log(`总分析数: ${this.results.length}`);
    console.log("分类统计:");
    Object.entries(categories).forEach(([category, count]) => {
      const percentage = ((count / this.results.length) * 100).toFixed(1);
      console.log(`  ${category}: ${count} (${percentage}%)`);
    });

    if (newListings.length > 0) {
      console.log(`\n🆕 新代币上线 (${newListings.length}个):`);
      newListings.forEach((listing, index) => {
        console.log(`  ${index + 1}. ${listing.original_title}`);
        listing.enriched_tokens.forEach((token) => {
          console.log(
            `     → ${token.name} (${token.symbol}) - $${
              token.price_usd || "N/A"
            }`
          );
        });
      });
    }
  }

  // 显示所有结果
  showAllResults() {
    if (this.results.length === 0) {
      console.log("\n📭 暂无分析结果");
      return;
    }

    console.log("\n📋 所有分析结果");
    console.log("================");
    this.results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.original_title}`);
      console.log(`   交易所: ${result.exchange}`);
      const categories = result.analysis.categories || [
        result.analysis.category,
      ];
      console.log(`   分类: ${categories.join(", ")}`);
      console.log(`   置信度: ${result.analysis.confidence}`);
      console.log(`   时间: ${new Date(result.timestamp).toLocaleString()}`);
    });
  }

  // 保存结果
  saveResults() {
    if (this.results.length === 0) {
      console.log("\n📭 暂无结果可保存");
      return;
    }

    const filename = `interactive_results_${Date.now()}.json`;
    this.analyzer.results = this.results;
    this.analyzer.saveResults(filename);
    console.log(`\n💾 结果已保存到: ${filename}`);
  }

  // 清空结果
  clearResults() {
    this.results = [];
    this.analyzer.results = [];
    console.log("\n🗑️ 结果已清空");
  }

  // 处理用户输入
  async handleInput(input) {
    const trimmed = input.trim();

    if (!trimmed) {
      return;
    }

    const parts = trimmed.split(" ");
    const command = parts[0].toLowerCase();

    switch (command) {
      case "help":
        this.showHelp();
        break;

      case "analyze":
        if (parts.length < 2) {
          console.log(
            "❌ 请提供公告标题。示例: analyze Binance Will List PEPE"
          );
        } else {
          const title = parts.slice(1).join(" ");
          await this.analyzeSingle(title);
        }
        break;

      case "batch":
        await this.batchAnalyze();
        break;

      case "results":
        this.showAllResults();
        break;

      case "report":
        this.showQuickReport();
        break;

      case "save":
        this.saveResults();
        break;

      case "clear":
        this.clearResults();
        break;

      case "quit":
      case "exit":
        console.log("\n👋 再见!");
        rl.close();
        return;

      default:
        // 如果不是命令，当作公告标题处理
        await this.analyzeSingle(trimmed);
        break;
    }
  }

  // 开始交互
  start() {
    this.showWelcome();

    const prompt = () => {
      rl.question("🤖 请输入命令或公告标题 > ", async (input) => {
        await this.handleInput(input);
        prompt();
      });
    };

    prompt();
  }
}

// 启动交互式测试
if (require.main === module) {
  const test = new InteractiveTest();
  test.start();
}

module.exports = InteractiveTest;
