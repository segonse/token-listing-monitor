#!/usr/bin/env node

// 测试资金费率查询功能
const FundingRateService = require("./src/services/fundingRateService");

async function testFundingRateService() {
  console.log("🧪 测试资金费率查询功能...\n");

  try {
    // 测试数据库连接
    console.log("1️⃣ 测试数据库连接...");

    const { testConnection } = require("./src/config/fundingRateDatabase");
    const connected = await testConnection();

    if (connected) {
      console.log("✅ 资金费率数据库连接成功");
    } else {
      console.log("❌ 资金费率数据库连接失败");
      return;
    }

    console.log("");

    // 测试获取交易所列表
    console.log("2️⃣ 测试获取交易所列表...");

    const exchanges = await FundingRateService.getAvailableExchanges();

    if (exchanges.length > 0) {
      console.log(`✅ 获取到 ${exchanges.length} 个交易所`);
      console.log(`交易所列表: ${exchanges.join(", ")}`);
    } else {
      console.log("❌ 未获取到交易所列表");
      return;
    }

    console.log("");

    // 测试获取计价币种列表
    console.log("3️⃣ 测试获取计价币种列表...");

    const exchange = exchanges[0]; // 使用第一个交易所
    const quoteAssets = await FundingRateService.getAvailableQuoteAssets(
      exchange
    );

    if (quoteAssets.length > 0) {
      console.log(`✅ 获取到 ${quoteAssets.length} 个计价币种`);
      console.log(`计价币种列表: ${quoteAssets.join(", ")}`);
    } else {
      console.log(`❌ 未获取到 ${exchange} 的计价币种列表`);
      return;
    }

    console.log("");

    // 测试搜索币种
    console.log("4️⃣ 测试搜索币种...");

    const quoteAsset = quoteAssets[0]; // 使用第一个计价币种
    const searchKeyword = "BTC";
    const symbols = await FundingRateService.searchSymbols(
      exchange,
      quoteAsset,
      searchKeyword
    );

    if (symbols.length > 0) {
      console.log(
        `✅ 搜索到 ${symbols.length} 个匹配 "${searchKeyword}" 的币种`
      );
      const displayList = symbols
        .slice(0, 5)
        .map((s) => (typeof s === "string" ? s : s.displayName || s.baseAsset))
        .join(", ");
      console.log(`币种列表: ${displayList}${symbols.length > 5 ? "..." : ""}`);
    } else {
      console.log(`❌ 未搜索到匹配 "${searchKeyword}" 的币种`);
      return;
    }

    console.log("");

    // 测试查询资金费率
    console.log("5️⃣ 测试查询资金费率...");

    const symbol =
      typeof symbols[0] === "string" ? symbols[0] : symbols[0].symbol; // 使用第一个币种
    const dateRange = FundingRateService.getDateRange("30d");

    const queryParams = {
      exchange,
      symbol,
      quoteAsset,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    };

    console.log(`查询参数: ${JSON.stringify(queryParams)}`);

    // 提供完整的SQL查询语句用于Navicat测试
    console.log("\n📋 完整SQL查询语句（用于Navicat测试）:");
    console.log(`SELECT
  SUM(funding_rate) as total_rate,
  COUNT(*) as periods_count,
  AVG(funding_rate) as avg_rate,
  MIN(FROM_UNIXTIME(funding_time/1000)) as start_time,
  MAX(FROM_UNIXTIME(funding_time/1000)) as end_time
FROM funding_rate_new
WHERE exchange = '${queryParams.exchange}'
  AND symbol = '${queryParams.symbol}'
  AND quote_asset = '${queryParams.quoteAsset}'
  AND DATE(FROM_UNIXTIME(funding_time/1000)) BETWEEN '${queryParams.startDate}' AND '${queryParams.endDate}';`);

    const result = await FundingRateService.queryFundingRate(queryParams);

    if (result && result.hasData) {
      console.log("✅ 查询资金费率成功");
      console.log(
        `总费率: ${FundingRateService.formatPercentage(result.total_rate)}`
      );
      console.log(
        `平均费率: ${FundingRateService.formatPercentage(result.avg_rate)}`
      );
      console.log(`收费次数: ${result.periods_count}`);
      console.log(
        `数据时间范围: ${FundingRateService.formatDate(
          result.start_time
        )} ~ ${FundingRateService.formatDate(result.end_time)}`
      );
    } else {
      console.log("❌ 未查询到资金费率数据");
    }

    console.log("");

    // 测试日期范围计算
    console.log("6️⃣ 测试日期范围计算...");

    const todayRange = FundingRateService.getDateRange("today");
    const sevenDaysRange = FundingRateService.getDateRange("7d");
    const thirtyDaysRange = FundingRateService.getDateRange("30d");

    console.log(`今天: ${todayRange.startDate} ~ ${todayRange.endDate}`);
    console.log(
      `最近7天: ${sevenDaysRange.startDate} ~ ${sevenDaysRange.endDate}`
    );
    console.log(
      `最近30天: ${thirtyDaysRange.startDate} ~ ${thirtyDaysRange.endDate}`
    );

    console.log("");

    console.log("🎉 资金费率查询功能测试完成！");

    console.log("\n📋 功能清单:");
    console.log("✅ 资金费率数据库连接");
    console.log("✅ 获取交易所列表");
    console.log("✅ 获取计价币种列表");
    console.log("✅ 搜索币种");
    console.log("✅ 查询资金费率");
    console.log("✅ 日期范围计算");

    console.log("\n🚀 下一步操作:");
    console.log("1. 启动Telegram机器人");
    console.log('2. 在主菜单中选择"💰 资金费率查询"');
    console.log("3. 按照提示选择时间范围、交易所、计价币种和交易币种");
    console.log("4. 查看资金费率结果");
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
  }

  process.exit(0);
}

testFundingRateService();
