# Node TLS Client

一个用于绕过 Cloudflare 保护的 Node.js 库，通过自定义 TLS 指纹和浏览器特征。

## 特点

- 模拟真实浏览器的 TLS 指纹（JA3）
- 随机选择真实的 User-Agent
- 提供合适的 HTTP 头
- 支持代理
- 轻量级设计，资源占用低

## 安装

```bash
npm install node-tls-client
```

## 使用方法

### 基本用法

```javascript
const { createClient } = require("node-tls-client");

async function main() {
  // 创建客户端
  const client = createClient();

  // 发送GET请求
  const response = await client.get("https://example.com");
  console.log(response.body);

  // 发送POST请求
  const postResponse = await client.post("https://example.com/api", {
    body: JSON.stringify({ key: "value" }),
    headers: { "Content-Type": "application/json" },
  });

  // 解析JSON响应
  const data = await postResponse.json();
  console.log(data);
}

main().catch(console.error);
```

### 使用代理

```javascript
const { createClient } = require("node-tls-client");

const client = createClient({
  proxy: "http://username:password@proxy-server:port",
});

client
  .get("https://example.com")
  .then((response) => console.log(response.body))
  .catch(console.error);
```

### 自定义浏览器类型

```javascript
const { createClient } = require("node-tls-client");

// 使用Firefox浏览器指纹
const client = createClient({
  preferredBrowser: "firefox",
});

// 使用移动设备配置
const mobileClient = createClient({
  mobile: true,
  preferredBrowser: "chrome",
});
```

## API

### createClient(options)

创建一个新的 TLS 客户端实例。

**参数:**

- `options` (Object): 配置选项
  - `mobile` (boolean): 是否使用移动设备配置，默认为 false
  - `preferredBrowser` (string): 首选浏览器类型 (chrome, firefox, edge, safari)
  - `proxy` (string): 代理 URL

**返回:**

- TlsClient 实例

### client.get(url, options)

发送 GET 请求。

**参数:**

- `url` (string): 请求 URL
- `options` (Object): 请求选项
  - `headers` (Object): 自定义请求头
  - `timeout` (number): 请求超时时间（毫秒）

**返回:**

- Promise<Response>

### client.post(url, options)

发送 POST 请求。

**参数:**

- `url` (string): 请求 URL
- `options` (Object): 请求选项
  - `body` (string): 请求体
  - `headers` (Object): 自定义请求头
  - `timeout` (number): 请求超时时间（毫秒）

**返回:**

- Promise<Response>

### Response 对象

- `status` (number): HTTP 状态码
- `statusText` (string): HTTP 状态文本
- `headers` (Object): 响应头
- `body` (string): 响应体
- `ok` (boolean): 状态码是否在 200-299 范围内
- `json()` (Function): 解析响应体为 JSON 对象
- `text()` (Function): 返回响应体文本

## 与 Go 库的比较

这个库是基于[cloudscraper_go](https://github.com/RomainMichau/cloudscraper_go)的 Node.js 实现，提供了类似的功能，但针对 Node.js 环境进行了优化。

## 许可证

MIT
