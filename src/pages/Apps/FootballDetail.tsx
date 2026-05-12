/**
 * Football Analysis App
 * 足球分析 - Query football/soccer data via AI
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useAgentsStore } from '@/stores/agents';
import { useChatStore } from '@/stores/chat';
import { useSkillsStore } from '@/stores/skills';
import { toast } from 'sonner';

type SearchRange = '3days' | '7days' | '14days';
type DataType = 'all' | 'basic' | 'odds' | 'prediction';
type PlayType = 'winDrawLose' | 'handicap' | 'goals';

const SEARCH_RANGE_LABELS: Record<SearchRange, string> = {
  '3days': '近3天',
  '7days': '近7天',
  '14days': '近14天',
};

const DATA_TYPE_LABELS: Record<DataType, string> = {
  all: '全部',
  basic: '基本信息',
  odds: '赔率',
  prediction: '预测',
};

const PLAY_TYPE_LABELS: Record<PlayType, string> = {
  winDrawLose: '胜平负',
  handicap: '让球',
  goals: '进球',
};

function buildFootballMessage(params: {
  teamLeagueName: string;
  searchRange: SearchRange;
  dataType: DataType;
  playType?: PlayType;
  skillBaseDir?: string;
}): string {
  const { teamLeagueName, searchRange, dataType, playType, skillBaseDir } = params;
  const rangeLabel = SEARCH_RANGE_LABELS[searchRange];
  const dataTypeLabel = DATA_TYPE_LABELS[dataType];

  const parts: string[] = [`球队/联赛名称: ${teamLeagueName}`, `搜索范围: ${rangeLabel}`, `数据类型: ${dataTypeLabel}`];

  if (playType) {
    parts.push(`预测玩法: ${PLAY_TYPE_LABELS[playType]}`);
  }

  const paramsStr = parts.join(' | ');

  const skillRef = skillBaseDir
    ? `请调用「qiuban-fetch」技能（路径：${skillBaseDir}）获取足球数据`
    : `请调用「qiuban-fetch」技能获取足球数据`;

  return (
    `【足球分析工具】${skillRef}。\n\n` +
    `标的配置：\n${paramsStr}\n\n` +
    `请结合数据汇总近期表现，并给出分析建议。`
  );
}

export function FootballDetail() {
  const navigate = useNavigate();
  const agents = useAgentsStore((state) => state.agents);
  const skills = useSkillsStore((state) => state.skills);
  const fetchSkills = useSkillsStore((state) => state.fetchSkills);

  const [teamLeagueName, setTeamLeagueName] = useState('');
  const [searchRange, setSearchRange] = useState<SearchRange>('7days');
  const [dataType, setDataType] = useState<DataType>('all');
  const [playType, setPlayType] = useState<PlayType | ''>('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [sending, setSending] = useState(false);

  // Fetch skills on mount to get baseDir for skill path
  useEffect(() => {
    void fetchSkills();
  }, [fetchSkills]);

  const qiubanSkill = skills.find((s) => s.slug === 'qiuban-fetch' || s.id === 'qiuban-fetch');
  const skillBaseDir = qiubanSkill?.baseDir;

  const handleSend = async () => {
    if (!teamLeagueName.trim()) {
      toast.error('请填写球队/联赛名称');
      return;
    }
    if (!selectedAgentId) {
      toast.error('请选择 Agent');
      return;
    }

    setSending(true);
    try {
      const message = buildFootballMessage({
        teamLeagueName: teamLeagueName.trim(),
        searchRange,
        dataType,
        playType: playType || undefined,
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
          <p className="text-sm text-muted-foreground">填写参数，AI将查询并分析数据</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-muted/30 rounded-xl p-5 space-y-4">

          {/* 第一行：球队/联赛名称 */}
          <div className="space-y-2">
            <Label htmlFor="teamLeagueName">球队/联赛名称</Label>
            <Input
              id="teamLeagueName"
              placeholder="如 曼城、英超、皇家马德里"
              value={teamLeagueName}
              onChange={(e) => setTeamLeagueName(e.target.value)}
            />
          </div>

          {/* 第二行：搜索范围 + 数据类型 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="searchRange">搜索范围</Label>
              <Select
                id="searchRange"
                value={searchRange}
                onChange={(e) => setSearchRange(e.target.value as SearchRange)}
              >
                <option value="3days">近3天</option>
                <option value="7days">近7天</option>
                <option value="14days">近14天</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataType">数据类型</Label>
              <Select
                id="dataType"
                value={dataType}
                onChange={(e) => setDataType(e.target.value as DataType)}
              >
                <option value="all">全部</option>
                <option value="basic">基本信息</option>
                <option value="odds">赔率</option>
                <option value="prediction">预测</option>
              </Select>
            </div>
          </div>

          {/* 第三行：预测玩法 */}
          <div className="space-y-2">
            <Label htmlFor="playType">预测玩法（可选）</Label>
            <Select
              id="playType"
              value={playType}
              onChange={(e) => setPlayType(e.target.value as PlayType || '')}
            >
              <option value="">不限</option>
              <option value="winDrawLose">胜平负</option>
              <option value="handicap">让球</option>
              <option value="goals">进球</option>
            </Select>
          </div>

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
  );
}

export default FootballDetail;