/**
 * Football Analysis App
 * 足球分析 - AI powered soccer lottery analysis via soccer-lottery skill
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useAgentsStore } from '@/stores/agents';
import { useChatStore } from '@/stores/chat';
import { useSkillsStore } from '@/stores/skills';
import { toast } from 'sonner';

type LeagueRange = 'all' | 'top5' | 'custom';

const LEAGUE_RANGE_LABELS: Record<LeagueRange, string> = {
  all: '全量（包含亚洲联赛）',
  top5: '五大联赛 + 欧冠',
  custom: '自选联赛',
};

const CONFIDENCE_DEFAULT = 70;

function buildFootballMessage(params: {
  leagueRange: LeagueRange;
  confidenceThreshold: number;
  skillBaseDir?: string;
}): string {
  const { leagueRange, confidenceThreshold, skillBaseDir } = params;
  const leagueRangeLabel = LEAGUE_RANGE_LABELS[leagueRange];

  const skillRef = skillBaseDir
    ? `请调用「soccer-lottery」技能（路径：${skillBaseDir}）执行今日全自动分析`
    : `请调用「soccer-lottery」技能执行今日全自动分析`;

  return (
    `【足彩分析】${skillRef}。\n\n` +
    `配置参数：\n` +
    `- 联赛范围：${leagueRangeLabel}\n` +
    `- 信心阈值：${confidenceThreshold}%\n` +
    `- 过关组合：仅 2串1（稳健型）\n\n` +
    `请执行完整分析流程并输出报告。`
  );
}

export function FootballDetail() {
  const navigate = useNavigate();
  const agents = useAgentsStore((state) => state.agents);
  const skills = useSkillsStore((state) => state.skills);
  const fetchSkills = useSkillsStore((state) => state.fetchSkills);

  const [leagueRange, setLeagueRange] = useState<LeagueRange>('all');
  const [confidenceThreshold, setConfidenceThreshold] = useState(CONFIDENCE_DEFAULT);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [sending, setSending] = useState(false);

  // Fetch skills on mount to get baseDir for skill path
  useEffect(() => {
    void fetchSkills();
  }, [fetchSkills]);

  const soccerLotterySkill = skills.find((s) => s.slug === 'soccer-lottery' || s.id === 'soccer-lottery');
  const skillBaseDir = soccerLotterySkill?.baseDir;

  const handleSend = async () => {
    if (!selectedAgentId) {
      toast.error('请选择 Agent');
      return;
    }

    setSending(true);
    try {
      const message = buildFootballMessage({
        leagueRange,
        confidenceThreshold,
        skillBaseDir,
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
          <h1 className="text-xl font-bold tracking-tight">足球分析</h1>
          <p className="text-sm text-muted-foreground">AI 全自动分析今日赛事，输出足彩推荐报告</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-muted/30 rounded-xl p-5 space-y-6">

          {/* 联赛范围 */}
          <div className="space-y-2">
            <Label htmlFor="leagueRange">联赛范围</Label>
            <Select
              id="leagueRange"
              value={leagueRange}
              onChange={(e) => setLeagueRange(e.target.value as LeagueRange)}
            >
              <option value="all">全量（包含亚洲联赛）</option>
              <option value="top5">五大联赛 + 欧冠</option>
              <option value="custom">自选联赛</option>
            </Select>
          </div>

          {/* 信心阈值 */}
          <div className="space-y-2">
            <Label htmlFor="confidence">
              信心阈值 <span className="text-muted-foreground text-sm">（低于此值不显示推荐）</span>
            </Label>
            <Select
              id="confidence"
              value={String(confidenceThreshold)}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
            >
              <option value="60">60%</option>
              <option value="65">65%</option>
              <option value="70">70%</option>
              <option value="75">75%</option>
              <option value="80">80%</option>
              <option value="85">85%</option>
            </Select>
          </div>

          {/* Agent 选择 */}
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

          {/* 发送按钮 */}
          <Button
            className="w-full"
            onClick={() => void handleSend()}
            disabled={sending}
          >
            {sending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />分析中...</>
            ) : (
              <><Send className="mr-2 h-4 w-4" />开始分析</>
            )}
          </Button>

          {/* 提示信息 */}
          <p className="text-xs text-muted-foreground text-center">
            AI 将自动抓取今日赛事数据，进行多维分析后输出推荐报告
          </p>
        </div>
      </div>
    </div>
  );
}

export default FootballDetail;