---
name: qiuban-fetch
description: 从 qiuban.vip 足球数据平台爬取比赛数据。支持按球队名/联赛名搜索赛程（扫描近7天赛程过滤），也支持按ID或URL查询比赛详情、赔率和预测。触发场景：用户说"查下巴萨的比赛"、"今晚有什么比赛"、"查这场比赛的赔率"等。
---

# qiuban-fetch

从 qiuban.vip 爬取足球比赛数据。

## API Base URL

```
https://api.qiuban.wang/api
```

## 核心接口

- `GET /fixture/schedule/{date}` — 按日期获取赛程（date 格式：YYYY-MM-DD）
- `GET /fixture/details/{id}` — 比赛详情+赔率
- `GET /fixture/prediction/{pid}` — 预测数据（需 prediction ID）

## 搜索模式（主要工作流）

用户不提供 ID，直接提供球队名或联赛名：

1. 调用 `/fixture/schedule/{date}` 扫描近 7 天赛程
2. 在结果中按主队名/客队名/联赛名过滤
3. 返回匹配比赛列表（含 ID、比分、状态、时间）
4. 用户选择其中一场后，再调用详情接口

**示例：**
```
用户: 巴塞罗那最近有什么比赛
→ 调用搜索，返回13场匹配（含西甲、女足、青年队等）
→ 用户选第4场（赫塔菲vs巴塞罗那）
→ 返回：基本信息 + 赔率 + 预测
```

## ID/URL 模式（备用工作流）

用户提供URL或ID时，直接查详情：

```
--id 1735655 --type all
--url "https://www.qiuban.vip/forecast.html?id=1735655&rl=ana"
--ids 1735655,1734067 --type info
```

## 查询类型

- `info` — 比赛基本信息
- `odds` — 赔率数据（欧赔/亚盘/大小球）
- `prediction` — 预测数据
- `all` — 全部

## 脚本

`scripts/fetch_match.py` 是核心脚本：

```bash
# 按球队名搜索（主要用法）
python3 fetch_match.py --search "巴萨"
python3 fetch_match.py --search "曼联" --days 10

# 按ID查详情
python3 fetch_match.py --id 1735655 --type all
python3 fetch_match.py --id 1734067 --type odds

# 从URL提取ID
python3 fetch_match.py --url "https://www.qiuban.vip/forecast.html?id=1735655&rl=ana"

# 批量查多场
python3 fetch_match.py --ids 1735655,1734067 --type info
```

## 注意点

- 搜索模式扫描 15 天赛程（约 200 场/天），需要约 10-15 秒
- 预测数据接口返回的内容受付费限制，部分比赛可能无预测
- 队伍名支持中文全称（如"巴塞罗那"）或部分名称（如"巴萨"）
- 搜索结果包含一线队、青年队、女足等各级队伍，可通过队伍名进一步区分
