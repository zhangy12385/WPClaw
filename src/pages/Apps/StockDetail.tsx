/**
 * Stock Detail Page
 * A股量化 - Query stock data via AI
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useAgentsStore } from '@/stores/agents';
import { useChatStore } from '@/stores/chat';
import { toast } from 'sonner';

type QueryType = 'realtime' | 'kline' | 'financial' | 'fundflow' | 'lhb' | 'rzrq';
type OutputPreference = 'concise' | 'detailed';

const QUERY_TYPE_LABELS: Record<QueryType, string> = {
  realtime: '实时行情',
  kline: '历史K线',
  financial: '财务数据',
  fundflow: '资金流向',
  lhb: '龙虎榜',
  rzrq: '融资融券',
};

const OUTPUT_PREFERENCES: { value: OutputPreference; label: string }[] = [
  { value: 'concise', label: '简洁摘要（重点风险与机会）' },
  { value: 'detailed', label: '详细报告（含逐只股票说明）' },
];

function buildStockMessage(params: {
  stockCode: string;
  queryType: QueryType;
  dateRange?: string;
  adjustType?: string;
  outputPreference: OutputPreference;
  watchReferencePrice?: string;
  highAlertPrice?: string;
  lowAlertPrice?: string;
  watchNote?: string;
}): string {
  const { stockCode, queryType, dateRange, adjustType, outputPreference, watchReferencePrice, highAlertPrice, lowAlertPrice, watchNote } = params;
  const queryLabel = QUERY_TYPE_LABELS[queryType];
  const outputLabel = OUTPUT_PREFERENCES.find(p => p.value === outputPreference)?.label ?? '简洁摘要（重点风险与机会）';

  const parts: string[] = [`股票代码: ${stockCode}`, `查询类型: ${queryLabel}`];

  if (queryType === 'kline') {
    const [start, end] = (dateRange || '').split('-');
    parts.push(`日期范围: ${start || '20240101'}-${end || '20241231'}`);
    if (adjustType && adjustType !== 'None') {
      parts.push(`复权方式: ${adjustType === 'qfq' ? '前复权' : '后复权'}`);
    }
  }

  const hasWatchConfig = watchReferencePrice || highAlertPrice || lowAlertPrice || watchNote;
  if (hasWatchConfig) {
    const watchParts: string[] = [];
    if (watchReferencePrice) watchParts.push(`盯盘参考价: ${watchReferencePrice}`);
    if (highAlertPrice) watchParts.push(`高于提醒参考价(元): ${highAlertPrice}`);
    if (lowAlertPrice) watchParts.push(`低于提醒参考价(元): ${lowAlertPrice}`);
    if (watchNote) watchParts.push(`备注: ${watchNote}`);
    parts.push(...watchParts);
  }

  const paramsStr = parts.join(' | ');

  return (
    `【A股量化工具】请调用「akshare-stock」技能获取A股数据。\n\n` +
    `标的配置：\n${paramsStr}\n\n` +
    `请结合 AkShare 数据汇总近期表现，并给出分析建议。\n` +
    `输出偏好：${outputLabel}`
  );
}

export function StockDetail() {
  const navigate = useNavigate();
  const agents = useAgentsStore((state) => state.agents);

  const [stockCode, setStockCode] = useState('');
  const [queryType, setQueryType] = useState<QueryType>('realtime');
  const [dateRange, setDateRange] = useState('');
  const [adjustType, setAdjustType] = useState('None');
  const [outputPreference, setOutputPreference] = useState<OutputPreference>('concise');
  const [watchReferencePrice, setWatchReferencePrice] = useState('');
  const [highAlertPrice, setHighAlertPrice] = useState('');
  const [lowAlertPrice, setLowAlertPrice] = useState('');
  const [watchNote, setWatchNote] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
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
        dateRange: isKline ? dateRange : undefined,
        adjustType: isKline ? adjustType : undefined,
        outputPreference,
        watchReferencePrice: watchReferencePrice.trim() || undefined,
        highAlertPrice: highAlertPrice.trim() || undefined,
        lowAlertPrice: lowAlertPrice.trim() || undefined,
        watchNote: watchNote.trim() || undefined,
      });
      await useChatStore.getState().sendMessage(message, undefined, selectedAgentId);
      navigate('/');
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
        <div className="max-w-2xl">
          <div className="bg-muted/30 rounded-xl p-5 space-y-4">

            {/* 第一行：查询类型 */}
            <div className="space-y-2">
              <Label htmlFor="queryType">查询类型</Label>
              <Select
                id="queryType"
                value={queryType}
                onChange={(e) => setQueryType(e.target.value as QueryType)}
              >
                <option value="realtime">实时行情</option>
                <option value="kline">历史K线</option>
                <option value="financial">财务数据</option>
                <option value="fundflow">资金流向</option>
                <option value="lhb">龙虎榜</option>
                <option value="rzrq">融资融券</option>
              </Select>
            </div>

            {/* 第二行：左侧=股票代码+盯盘参考价 | 右侧=高于+低于提醒 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stockCode">股票代码</Label>
                <Input
                  id="stockCode"
                  placeholder="如 000001、600519"
                  value={stockCode}
                  onChange={(e) => setStockCode(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="watchRef">盯盘参考价</Label>
                <Input
                  id="watchRef"
                  placeholder="如 1800.00"
                  value={watchReferencePrice}
                  onChange={(e) => setWatchReferencePrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="highAlert">高于提醒(元)</Label>
                <Input
                  id="highAlert"
                  placeholder="如 1900"
                  value={highAlertPrice}
                  onChange={(e) => setHighAlertPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lowAlert">低于提醒(元)</Label>
                <Input
                  id="lowAlert"
                  placeholder="如 1700"
                  value={lowAlertPrice}
                  onChange={(e) => setLowAlertPrice(e.target.value)}
                />
              </div>
            </div>

            {/* 第三行：备注 */}
            <div className="space-y-2">
              <Label htmlFor="watchNote">备注</Label>
              <Input
                id="watchNote"
                placeholder="如 关注财报季、重大公告等"
                value={watchNote}
                onChange={(e) => setWatchNote(e.target.value)}
              />
            </div>

            {/* K线参数 */}
            {isKline && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateRange">日期范围</Label>
                  <Input
                    id="dateRange"
                    placeholder="如 20240101-20241231"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adjustType">复权方式</Label>
                  <Select
                    id="adjustType"
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value)}
                  >
                    <option value="qfq">前复权</option>
                    <option value="hfq">后复权</option>
                    <option value="None">不复权</option>
                  </Select>
                </div>
              </div>
            )}

            {/* 第四行：发送设置 */}
            <div className="pt-2 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="agentSelect">选择 Agent</Label>
                <Select
                  id="agentSelect"
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                >
                  <option value="">选择 Agent</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="outputPreference">输出偏好</Label>
                <Select
                  id="outputPreference"
                  value={outputPreference}
                  onChange={(e) => setOutputPreference(e.target.value as OutputPreference)}
                >
                  {OUTPUT_PREFERENCES.map((pref) => (
                    <option key={pref.value} value={pref.value}>{pref.label}</option>
                  ))}
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() => void handleSend()}
                disabled={sending}
              >
                {sending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />发送中...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" />发送到 AI</>
                )}
              </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default StockDetail;
