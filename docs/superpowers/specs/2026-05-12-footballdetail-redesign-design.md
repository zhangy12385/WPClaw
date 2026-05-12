# FootballDetail 重设计 spec

**日期**: 2026-05-12

**目标**: 将 FootballDetail 页面从 qiuban-fetch 迁移到 soccer-lottery，重新设计交互方式。

---

## 需求概述

- **交互模式**: 完全重设计（不再是传统的查询表单）
- **联赛范围**: 全量（包含亚洲联赛：日职、中超、韩职等）
- **信心阈值**: 默认 70%，低于此值不显示
- **过关组合**: 仅 2串1（稳健型）
- **Skill**: soccer-lottery（路径：`resources/skills/soccer-lottery`）

---

## 核心设计

soccer-lottery 是全自动分析模式，不需要用户指定特定比赛或联赛。AI 自动执行全流程（抓取→分析→报告），用户只需选择配置后触发。

### 页面元素

| 元素 | 类型 | 说明 |
|------|------|------|
| 联赛范围 | 多选下拉 | `all`(全量) / `top5`(五大联赛+欧冠) / `custom`(自选) |
| 信心阈值 | 滑块 | 范围 60-85%，默认 70% |
| Agent 选择 | 下拉框 | 从 agents 列表选取 |
| 开始分析 | 按钮 | 触发 soccer-lottery 全流程 |

### 消息格式

```text
【足彩分析】请调用「soccer-lottery」技能（路径：{skillBaseDir}）执行今日全自动分析。

配置参数：
- 联赛范围：{leagueRangeLabel}
- 信心阈值：{confidenceThreshold}%
- 过关组合：仅 2串1

请执行完整分析流程并输出报告。
```

---

## 实现步骤

1. 更新 `src/pages/Apps/FootballDetail.tsx`：
   - 移除旧的表单字段（球队/联赛名称、搜索范围、数据类型、预测玩法）
   - 添加新的配置项（联赛范围、信心阈值滑块）
   - 保留 Agent 选择和发送按钮
   - 修改 `buildFootballMessage()` 为新格式

2. 移除 `qiuban-fetch` skill 相关引用，改为 `soccer-lottery`