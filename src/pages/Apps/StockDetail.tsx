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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAgentsStore } from '@/stores/agents';
import { useChatStore } from '@/stores/chat';
import { toast } from 'sonner';

type QueryType = 'realtime' | 'kline' | 'financial' | 'fundflow' | 'lhb' | 'rzrq';

function buildStockMessage(params: {
  stockCode: string;
  queryType: QueryType;
  dateRange?: string;
  adjustType?: string;
}): string {
  const { stockCode, queryType, dateRange, adjustType } = params;
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

export function StockDetail() {
  const navigate = useNavigate();
  const agents = useAgentsStore((state) => state.agents);

  const [stockCode, setStockCode] = useState('');
  const [queryType, setQueryType] = useState<QueryType>('realtime');
  const [dateRange, setDateRange] = useState('');
  const [adjustType, setAdjustType] = useState('None');
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
        <div className="max-w-lg space-y-6">
          {/* 股票代码 */}
          <div className="space-y-2">
            <Label htmlFor="stockCode">股票代码</Label>
            <Input
              id="stockCode"
              placeholder="如 000001、600519"
              value={stockCode}
              onChange={(e) => setStockCode(e.target.value)}
            />
          </div>

          {/* 查询类型 */}
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

          {/* 日期范围 - 仅 kline 时显示 */}
          {isKline && (
            <div className="space-y-2">
              <Label htmlFor="dateRange">日期范围</Label>
              <Input
                id="dateRange"
                placeholder="如 20240101-20241231"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              />
            </div>
          )}

          {/* 复权方式 - 仅 kline 时显示 */}
          {isKline && (
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
          )}

          {/* Agent选择卡片 */}
          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">发送设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Agent下拉 */}
              <div className="space-y-2">
                <Label htmlFor="agentSelect">Agent</Label>
                <Select
                  id="agentSelect"
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                >
                  <option value="">选择 Agent</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* 发送按钮 */}
              <Button
                className="w-full"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    发送中...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    发送到 AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default StockDetail;
