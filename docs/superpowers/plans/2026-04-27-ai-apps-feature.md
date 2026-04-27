# AI 应用功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标:** 在左侧菜单新增"AI应用"入口，列表页展示股票/足球应用卡片，点击股票卡片进入详情页，选择 Agent 并填写参数后发送自然语言消息给 OpenClaw Gateway 处理。

**架构:** 前端 React 单页应用，使用 Zustand stores 已有能力，无需新建 store。消息通过 `useChatStore.sendMessage()` 发送后切换到聊天页面。AI 应用数据硬编码在页面组件中。

**技术栈:** React 19, React Router v6, Zustand, shadcn/ui, i18next

---

## 文件变更总览

| 操作 | 文件路径 |
|------|----------|
| 创建 | `src/pages/Apps/index.tsx` |
| 创建 | `src/pages/Apps/StockDetail.tsx` |
| 修改 | `src/App.tsx` |
| 修改 | `src/components/layout/Sidebar.tsx` |
| 修改 | `src/i18n/locales/zh/common.json` |
| 修改 | `src/i18n/locales/en/common.json` |

---

## Task 1: 创建 AI 应用列表页

**文件:** 创建 `src/pages/Apps/index.tsx`

- [ ] **Step 1: 编写组件代码**

```tsx
/**
 * AI应用列表页
 * 展示应用卡片网格，点击进入详情页
 */
import { useNavigate } from 'react-router-dom';
import { BarChart2, Footprints, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface AppCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
  onClick: () => void;
}

function AppCard({ title, description, icon, comingSoon, onClick }: AppCardProps) {
  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-all hover:shadow-md',
        comingSoon ? 'opacity-60 cursor-not-allowed' : 'hover:bg-accent/50'
      )}
      onClick={comingSoon ? undefined : onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={cn(
            'h-12 w-12 rounded-full flex items-center justify-center shrink-0',
            comingSoon ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
          )}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{title}</h3>
              {comingSoon && (
                <Badge variant="secondary" className="text-[11px]">敬请期待</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Apps() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const apps = [
    {
      id: 'stock',
      title: 'A股量化',
      description: '基于 AkShare 库获取A股行情、财务数据、板块信息等',
      icon: <BarChart2 className="h-6 w-6" />,
      comingSoon: false,
    },
    {
      id: 'football',
      title: '足球分析',
      description: '足球赛事数据查询与分析',
      icon: <Footprints className="h-6 w-6" />,
      comingSoon: true,
    },
  ];

 return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b bg-background/80 backdrop-blur-sm">
        <h1 className="text-2xl font-bold tracking-tight">AI应用</h1>
        <p className="text-sm text-muted-foreground mt-1">选择应用并填写参数，AI将为您查询和分析数据</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
          {apps.map((app) => (
            <AppCard
              key={app.id}
              title={app.title}
              description={app.description}
              icon={app.icon}
              comingSoon={app.comingSoon}
              onClick={() => navigate(`/apps/${app.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/pages/Apps/index.tsx
git commit -m "feat(apps): add AI应用列表页"
```

---

## Task 2: 创建股票详情页

**文件:** 创建 `src/pages/Apps/StockDetail.tsx`

- [ ] **Step 1: 编写股票查询类型和字段配置**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAgentsStore } from '@/stores/agents';
import { useChatStore } from '@/stores/chat';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const QUERY_TYPES = [
  { value: 'realtime', label: '实时行情' },
  { value: 'kline', label: '历史K线' },
  { value: 'financial', label: '财务数据' },
  { value: 'fundflow', label: '资金流向' },
  { value: 'lhb', label: '龙虎榜' },
  { value: 'rzrq', label: '融资融券' },
] as const;

type QueryType = typeof QUERY_TYPES[number]['value'];

const ADJUST_TYPES = [
  { value: 'qfq', label: '前复权 (qfq)' },
  { value: 'hfq', label: '后复权 (hfq)' },
  { value: 'None', label: '不复权 (None)' },
] as const;
```

- [ ] **Step 2: 构建自然语言消息函数**

```tsx
function buildStockMessage(params: {
  stockCode: string;
  queryType: QueryType;
  dateRange?: string;
  adjustType?: string;
  boardName?: string;
}): string {
  const { stockCode, queryType, dateRange, adjustType, boardName } = params;

  switch (queryType) {
    case 'realtime':
      return `查询股票 ${stockCode} 的实时行情`;
    case 'kline': {
      const [start, end] = (dateRange || '').split('-');
      const adj = adjustType && adjustType !== 'None' ? `，复权方式为${adjustType === 'qfq' ? '前复权' : '后复权'}` : '';
      return `查询股票 ${stockCode} 从 ${start || '20240101'} 到 ${end || '20241231'} 的日K线数据${adj}`;
    }
    case 'financial':
      return `查询股票 ${stockCode} 的财务数据`;
    case 'fundflow':
      return `查询股票 ${stockCode} 的资金流向`;
    case 'lhb':
      return `查询股票 ${stockCode} 的龙虎榜数据`;
    case 'rzrq':
      return `查询股票 ${stockCode} 的融资融券数据`;
    default:
      return `查询股票 ${stockCode}`;
  }
}
```

- [ ] **Step 3: 编写组件主体**

```tsx
export function StockDetail() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const agents = useAgentsStore((s) => s.agents);
  const sendMessage = useChatStore((s) => s.sendMessage);

  const [stockCode, setStockCode] = useState('');
  const [queryType, setQueryType] = useState<QueryType>('realtime');
  const [dateRange, setDateRange] = useState('');
  const [adjustType, setAdjustType] = useState('qfq');
  const [boardName, setBoardName] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id || '');
  const [sending, setSending] = useState(false);

  const isKline = queryType === 'kline';

  const handleSend = async () => {
    if (!stockCode.trim()) {
      toast.error('请填写股票代码');
      return;
    }
    if (!selectedAgentId) {
      toast.error('请选择 Agent');
      return;
    }

    setSending(true);
    try {
      const message = buildStockMessage({
        stockCode: stockCode.trim(),
        queryType,
        dateRange: dateRange.trim() || undefined,
        adjustType: adjustType !== 'None' ? adjustType : undefined,
        boardName: boardName.trim() || undefined,
      });

      await sendMessage(message, undefined, selectedAgentId);
      navigate('/');
    } catch (err) {
      toast.error(`发送失败: ${err}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-background/80 backdrop-blur-sm flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/apps')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">A股量化</h1>
          <p className="text-sm text-muted-foreground">填写参数，AI将查询并分析数据</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg space-y-6">
          {/* Stock Code */}
          <div className="space-y-2">
            <Label htmlFor="stock-code">
              股票代码 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="stock-code"
              value={stockCode}
              onChange={(e) => setStockCode(e.target.value)}
              placeholder="如 000001、600519"
            />
          </div>

          {/* Query Type */}
          <div className="space-y-2">
            <Label htmlFor="query-type">
              查询类型 <span className="text-destructive">*</span>
            </Label>
            <Select value={queryType} onValueChange={(v) => setQueryType(v as QueryType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUERY_TYPES.map((qt) => (
                  <SelectItem key={qt.value} value={qt.value}>{qt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range (K线 only) */}
          {isKline && (
            <div className="space-y-2">
              <Label htmlFor="date-range">日期范围</Label>
              <Input
                id="date-range"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                placeholder="如 20240101-20241231"
              />
            </div>
          )}

          {/* Adjust Type (K线 only) */}
          {isKline && (
            <div className="space-y-2">
              <Label htmlFor="adjust-type">复权方式</Label>
              <Select value={adjustType} onValueChange={setAdjustType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADJUST_TYPES.map((at) => (
                    <SelectItem key={at.value} value={at.value}>{at.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">发送设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Agent Selector */}
              <div className="space-y-2">
                <Label htmlFor="agent-select">选择 Agent <span className="text-destructive">*</span></Label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择 Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Submit */}
              <Button
                className="w-full gap-2"
                onClick={() => void handleSend()}
                disabled={sending || !stockCode.trim() || !selectedAgentId}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                发送到 AI
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add src/pages/Apps/StockDetail.tsx
git commit -m "feat(apps): add stock detail page with form"
```

---

## Task 3: 添加路由

**文件:** 修改 `src/App.tsx`

- [ ] **Step 1: 添加 Apps 和 StockDetail 导入**

在 import 区域添加（按字母顺序）：
```tsx
import { Apps } from './pages/Apps';
import { StockDetail } from './pages/Apps/StockDetail';
```

- [ ] **Step 2: 添加路由**

在 `<Route element={<MainLayout />}>` 的子路由中添加：
```tsx
<Route path="/apps" element={<Apps />} />
<Route path="/apps/stock" element={<StockDetail />} />
```

注意：放在 `/settings/*` 之前避免被通配匹配。

- [ ] **Step 3: 提交**

```bash
git add src/App.tsx
git commit -m "feat(apps): add /apps and /apps/stock routes"
```

---

## Task 4: 添加侧边栏导航

**文件:** 修改 `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: 导入 Grid 图标**

在 lucide-react import 中添加 `Grid`（如果不存在，可用 `LayoutGrid` 或 `AppWindow` 替代）

- [ ] **Step 2: 在 coreNavItems 中添加 AI应用 项**

在 `coreNavItems` 数组中，`/agents` 后面添加：
```tsx
{ to: '/apps', icon: <Grid className="h-[18px] w-[18px]" strokeWidth={2} />, label: t('sidebar.apps'), testId: 'sidebar-nav-apps' },
```

- [ ] **Step 3: 提交**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(apps): add AI应用 sidebar nav item"
```

---

## Task 5: 添加 i18n 翻译

**文件:** 修改 `src/i18n/locales/zh/common.json` 和 `src/i18n/locales/en/common.json`

- [ ] **Step 1: 在 sidebar 对象中添加 apps 键**

在 `zh/common.json` 的 `sidebar` 对象中添加：
```json
"apps": "AI应用",
```

在 `en/common.json` 的 `sidebar` 对象中添加：
```json
"apps": "AI Apps",
```

（日语和俄语暂时不改，如有需要再补充）

- [ ] **Step 2: 提交**

```bash
git add src/i18n/locales/zh/common.json src/i18n/locales/en/common.json
git commit -m "feat(i18n): add sidebar.apps translation key"
```

---

## Task 6: 验证完整流程

- [ ] **Step 1: 运行 typecheck 验证类型正确性**

```bash
pnpm run typecheck
```
预期：无错误

- [ ] **Step 2: 启动开发服务器验证页面**

```bash
pnpm dev
```
然后：
1. 打开 http://localhost:5173
2. 确认侧边栏出现"AI应用"菜单项
3. 点击进入 `/apps`，确认卡片列表
4. 点击股票卡片进入 `/apps/stock`
5. 填写股票代码 000001，选择"实时行情"，选择 Agent，点击发送
6. 确认跳转聊天页面，消息已发送

- [ ] **Step 3: 提交所有变更**

```bash
git add -A
git commit -m "feat(apps): add AI应用 feature with stock detail page"
```

---

## 验证清单

- [ ] 侧边栏显示"AI应用"菜单项
- [ ] `/apps` 页面显示两张卡片（股票可点击，足球敬请期待）
- [ ] 点击股票卡片进入 `/apps/stock` 详情页
- [ ] 表单字段根据查询类型动态显示/隐藏（日期范围、复权方式仅 K线 显示）
- [ ] Agent 下拉正确加载并显示所有 Agent
- [ ] 点击发送后正确跳转聊天页并自动发送消息
- [ ] `pnpm run typecheck` 通过
