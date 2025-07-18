const db = require("../config/database");

class Token {
  /**
   * 查找或创建代币（支持渐进式数据完善）
   * @param {string|null} name - 代币名称
   * @param {string|null} symbol - 代币符号
   * @returns {Promise<Object|null>} 代币对象
   */
  static async findOrCreate(name = null, symbol = null) {
    try {
      // 如果name和symbol都为空，返回null
      if (!name && !symbol) {
        return null;
      }

      let existingToken = null;

      // 优先通过symbol查找（因为symbol更唯一）
      if (symbol) {
        const [tokensBySymbol] = await db.query(
          `SELECT * FROM tokens WHERE symbol = ?`,
          [symbol]
        );
        if (tokensBySymbol.length > 0) {
          existingToken = tokensBySymbol[0];
        }
      }

      // 如果通过symbol没找到，再通过name查找（只有当name不为空时）
      if (!existingToken && name && name.trim() !== "") {
        const [tokensByName] = await db.query(
          `SELECT * FROM tokens WHERE name = ?`,
          [name]
        );
        if (tokensByName.length > 0) {
          existingToken = tokensByName[0];
        }
      }

      if (existingToken) {
        // 找到现有代币，检查是否需要更新信息
        let needUpdate = false;
        const updateFields = {};

        if (name && !existingToken.name) {
          updateFields.name = name;
          needUpdate = true;
        }
        if (symbol && !existingToken.symbol) {
          updateFields.symbol = symbol;
          needUpdate = true;
        }

        if (needUpdate) {
          // 更新代币信息
          const setClause = Object.keys(updateFields)
            .map((field) => `${field} = ?`)
            .join(", ");
          const values = Object.values(updateFields);
          values.push(existingToken.id);

          await db.query(
            `UPDATE tokens SET ${setClause}, updated_at = NOW() WHERE id = ?`,
            values
          );

          // 返回更新后的代币信息
          return { ...existingToken, ...updateFields };
        }

        return existingToken;
      }

      // 不存在则创建新记录（name可以为null）
      const [result] = await db.query(
        `INSERT INTO tokens (name, symbol, created_at, updated_at)
         VALUES (?, ?, NOW(), NOW())`,
        [name || null, symbol || null] // 确保空字符串转换为null
      );

      return {
        id: result.insertId,
        name: name || null,
        symbol: symbol || null,
      };
    } catch (error) {
      console.error("Token findOrCreate 失败:", error.message);
      return null;
    }
  }

  static async findAll() {
    try {
      const [tokens] = await db.query(`SELECT * FROM tokens`);
      return tokens;
    } catch (error) {
      console.error("获取所有代币失败:", error.message);
      return [];
    }
  }

  static async findById(id) {
    const [rows] = await db.query("SELECT * FROM tokens WHERE id = ?", [id]);
    return rows[0];
  }

  static async findByName(name) {
    const [rows] = await db.query("SELECT * FROM tokens WHERE name = ?", [
      name,
    ]);
    return rows[0];
  }

  /**
   * 通过符号查找代币
   * @param {string} symbol - 代币符号
   * @returns {Promise<Object|null>} 代币对象
   */
  static async findBySymbol(symbol) {
    try {
      const [rows] = await db.query("SELECT * FROM tokens WHERE symbol = ?", [
        symbol,
      ]);
      return rows[0] || null;
    } catch (error) {
      console.error("通过符号查找代币失败:", error.message);
      return null;
    }
  }

  /**
   * 搜索代币（支持name和symbol模糊搜索）
   * @param {string} query - 搜索关键词
   * @returns {Promise<Array>} 代币列表
   */
  static async search(query) {
    try {
      const [tokens] = await db.query(
        `SELECT * FROM tokens
         WHERE name LIKE ? OR symbol LIKE ?
         ORDER BY
           CASE
             WHEN symbol = ? THEN 1
             WHEN name = ? THEN 2
             WHEN symbol LIKE ? THEN 3
             WHEN name LIKE ? THEN 4
             ELSE 5
           END,
           name ASC
         LIMIT 20`,
        [
          `%${query}%`,
          `%${query}%`, // LIKE 搜索
          query,
          query, // 精确匹配优先
          `${query}%`,
          `${query}%`, // 前缀匹配次优先
        ]
      );
      return tokens;
    } catch (error) {
      console.error("搜索代币失败:", error.message);
      return [];
    }
  }

  /**
   * 从文本中提取代币信息（增强版，支持只有symbol的情况）
   * 非AI分析交易所使用（目前bitget使用），暂时不用在意，后续删除
   * @param {string} text - 要分析的文本
   * @returns {Promise<Array>} 提取到的代币信息数组
   */
  static async extractTokensFromText(text) {
    const tokens = [];

    // 模式1: 完整格式 "ProjectName (SYMBOL)"
    const fullPattern = /([A-Za-z0-9\s\.\-&']+?)\s*\(([A-Z0-9]{2,10})\)/g;
    let match;

    while ((match = fullPattern.exec(text)) !== null) {
      const name = match[1].trim();
      const symbol = match[2].trim();

      if (name && symbol) {
        tokens.push({ name, symbol });
      }
    }

    // 模式2: 只有符号的情况（如 "ETHUSDT", "BTCUSDT"）
    // 但要排除已经在完整格式中提取过的
    const extractedSymbols = new Set(tokens.map((t) => t.symbol));

    // 查找可能的代币符号（2-10个大写字母/数字）
    const symbolPattern = /\b([A-Z0-9]{2,10})\b/g;
    const potentialSymbols = [];

    while ((match = symbolPattern.exec(text)) !== null) {
      const symbol = match[1];

      // 排除常见的非代币词汇
      const excludeWords = [
        "USD",
        "USDT",
        "USDC",
        "BTC",
        "ETH",
        "API",
        "URL",
        "HTTP",
        "HTTPS",
        "GMT",
        "UTC",
      ];

      if (!extractedSymbols.has(symbol) && !excludeWords.includes(symbol)) {
        potentialSymbols.push(symbol);
      }
    }

    // 对于潜在的符号，检查是否在数据库中存在
    for (const symbol of potentialSymbols) {
      const existingToken = await this.findBySymbol(symbol);
      if (existingToken) {
        tokens.push({
          name: existingToken.name,
          symbol: existingToken.symbol,
        });
      } else {
        // 如果数据库中不存在，也添加（只有symbol）
        tokens.push({ name: null, symbol });
      }
    }

    return tokens;
  }

  static async create(token) {
    const now = new Date();
    const [result] = await db.query(
      "INSERT INTO tokens (name, symbol, created_at, updated_at) VALUES (?, ?, ?, ?)",
      [token.name, token.symbol, now, now]
    );
    return result.insertId;
  }

  static async update(id, token) {
    const now = new Date();
    await db.query(
      "UPDATE tokens SET name = ?, symbol = ?, updated_at = ? WHERE id = ?",
      [token.name, token.symbol, now, id]
    );
  }

  static async delete(id) {
    await db.query("DELETE FROM tokens WHERE id = ?", [id]);
  }
}

module.exports = Token;
