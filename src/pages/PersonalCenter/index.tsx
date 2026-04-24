/**
 * Personal Center Page
 * 3 tabs: Account Overview, Models, Recharge
 * Notice content is displayed in the header area
 */
import { useEffect, useState } from 'react';
import { useUserStore } from '@/stores/user';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProvidersSettings } from '@/components/settings/ProvidersSettings';
import { RelayStationModelSettings } from '@/components/settings/RelayStationModelSettings';

type Tab = 'overview' | 'models' | 'recharge';

export function PersonalCenter() {
  const { t } = useTranslation('personalCenter');
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const fetchQuotaData = useUserStore((s) => s.fetchQuotaData);
  const fetchNotice = useUserStore((s) => s.fetchNotice);
  const topup = useUserStore((s) => s.topup);
  const notice = useUserStore((s) => s.notice);
  const accessToken = useUserStore((s) => s.accessToken);
  const username = useUserStore((s) => s.username);
  const userSelfData = useUserStore((s) => s.userSelfData);
  const consumeTokens = useUserStore((s) => s.consumeTokens);
  const times = useUserStore((s) => s.times);

  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingNotice, setLoadingNotice] = useState(false);

  useEffect(() => {
    setLoadingNotice(true);
    fetchNotice().finally(() => setLoadingNotice(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') {
      setLoadingOverview(true);
      fetchQuotaData().finally(() => setLoadingOverview(false));
    }
  }, [activeTab]);

  const handleRedeem = async () => {
    if (!redeemCode.trim()) {
      toast.error(t('redeem.placeholder'));
      return;
    }
    setRedeeming(true);

    const result = await topup(redeemCode.trim());
    setRedeeming(false);
    if (result.success) {
      toast.success(`${t('redeem.success')}`);
      setRedeemCode('');
      await fetchQuotaData();
    } else {
      toast.error(result.message || t('redeem.failed'));
    }
  };

  const quotaPerUnit = parseFloat(localStorage.getItem('quota_per_unit') || '500000');
  const totalBalance = userSelfData ? (userSelfData.quota / quotaPerUnit).toFixed(2) : '0.00';
  const usedAmount = userSelfData ? (userSelfData.used_quota / quotaPerUnit).toFixed(2) : '0.00';
  const totalTokensDisplay = consumeTokens > 0 ? consumeTokens.toLocaleString() : (userSelfData?.used_quota?.toLocaleString() ?? '0');
  const totalTimesDisplay = times > 0 ? times : (userSelfData?.request_count ?? 0);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: t('tabs.overview') },
    { key: 'models', label: t('tabs.models') },
    { key: 'recharge', label: t('tabs.recharge') },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Page header - username and notice content */}
      <div className="px-3 py-4 border-b space-y-2">
        {username && (
          <div className="text-sm font-medium text-foreground">
            <span className="font-bold text-foreground">当前用户：</span>{username}
          </div>
        )}
        {loadingNotice ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading notice...</span>
          </div>
        ) : notice ? (
          <div className="text-sm whitespace-pre-wrap text-muted-foreground">
            <span className="font-bold text-foreground">系统公告：</span>{notice}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">暂无公告</span>
        )}
      </div>

      {/* Tab bar */}
      <div className="pt-4 flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-background border border-b-0 border-border text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-6 bg-background border border-border rounded-b-lg rounded-tr-lg">
        {/* Account Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {loadingOverview ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : userSelfData ? (
              <>
                {/* 统计卡片 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <div className="text-2xl">💰</div>
                    <div className="text-2xl font-bold text-foreground mt-2">${totalBalance}</div>
                    <div className="text-sm text-muted-foreground mt-1">当前余额</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <div className="text-2xl">📊</div>
                    <div className="text-2xl font-bold text-foreground mt-2">${usedAmount}</div>
                    <div className="text-sm text-muted-foreground mt-1">历史消耗</div>
                  </div>
                </div>

                {/* 使用统计 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <span>📈</span> 使用统计
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-lg font-bold text-foreground">{userSelfData?.request_count ?? 0}</div>
                      <div className="text-xs text-muted-foreground">请求次数</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-lg font-bold text-foreground">{totalTimesDisplay}</div>
                      <div className="text-xs text-muted-foreground">统计次数</div>
                    </div>
                  </div>
                </div>

                {/* 资源消耗 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <span>⚡</span> 资源消耗
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-lg font-bold text-foreground">${usedAmount}</div>
                      <div className="text-xs text-muted-foreground">统计额度</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-lg font-bold text-foreground">{totalTokensDisplay}</div>
                      <div className="text-xs text-muted-foreground">统计Tokens</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {accessToken ? t('quota.empty') : t('quota.notLoggedIn')}
              </div>
            )}
          </div>
        )}

        {/* Models */}
        {activeTab === 'models' && (
          <div className="space-y-12">
            <ProvidersSettings locked={true} />
            <RelayStationModelSettings />
          </div>
        )}

        {/* Recharge */}
        {activeTab === 'recharge' && (
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('redeem.code')}</label>
              <input
                type="text"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value)}
                placeholder={t('redeem.placeholder')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button
              onClick={handleRedeem}
              disabled={redeeming || !redeemCode.trim()}
              className="w-full"
            >
              {redeeming ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {t('redeem.button')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}