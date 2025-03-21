关键代币上市提醒系统业务需求说明

1. 项目背景

本系统旨在提供关键代币上市提醒，通过采集 Bybit、Binance 等交易所的公告数据，分析代币上线信息，并通过多种方式企业微信通知用户.

2. 业务需求概述

2.1 核心功能

公告数据采集：定期抓取 Bybit API 及其他交易所公告信息。

公告解析与存储：对公告信息进行结构化存储，去重、筛选关键信息。

代币上市提醒：基于公告内容，自动识别代币上线时间，发送提醒。

用户订阅管理：用户可订阅特定交易所、代币或公告类型。（此功能后续再考虑实现）

3. 数据模型设计

3.1 公告数据（Announcement）表

字段名

类型

说明

id

唯一标识

exchange

STRING

交易所名称

title

STRING

公告标题

description

TEXT

公告内容

type

STRING

pre-market 或 spot-listing

url

STRING

公告链接

publishTime

TIMESTAMP

公告发布时间

created_at

TIMESTAMP

数据创建时间

updated_at

TIMESTAMP

数据更新时间

3.2 代币数据（Token）表

字段名

类型

说明

id

唯一标识

name

STRING

代币名称

created_at

TIMESTAMP

数据创建时间

updated_at

TIMESTAMP

数据更新时间

5. 系统架构及技术选型
   后端语言使用 nodejs 实现脚本每隔一定时间从指定交易所 api 获取公告数据并处理分析，通过公告关键字，类型，时间戳等判断是否为需要的代币信息（检索公告内容，根据代币名称作为关键字）并检查是否已经录入过数据库，如果是新的上币信息会通过企业微信 api 发送消息通知用户。数据库 mysql。后端服务器使用express。前端后续待定。

6. 开发计划

6.1 MVP 阶段

6.2 迭代扩展

7. 预期成果

数据自动化采集

精准和及时提醒
