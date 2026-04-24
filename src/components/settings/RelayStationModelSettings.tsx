/**
 * RelayStation Model Settings Component
 * Manage RelayStation model selection
 */
import { useEffect, useState } from 'react';
import { Check, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { invokeIpc } from '@/lib/api-client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { RELAY_STATION_MODELS } from '@/pages/Setup/steps/RelayStationStep';

type RelayStationModel = (typeof RELAY_STATION_MODELS)[number];

export function RelayStationModelSettings() {
  const { t } = useTranslation('settings');
  const [currentModel, setCurrentModel] = useState<RelayStationModel>('gpt-5.4');
  const [loading, setLoading] = useState(true);
  const [settingDefault, setSettingDefault] = useState<RelayStationModel | null>(null);

  useEffect(() => {
    loadCurrentModel();
  }, []);

  const loadCurrentModel = async () => {
    console.log('[RelayStationModelSettings] loadCurrentModel called');
    try {
      setLoading(true);
      const result = await invokeIpc('provider:getRelayStationModel') as { model?: string; success: boolean };
      console.log('[RelayStationModelSettings] getRelayStationModel result:', result);
      if (result.success && result.model && RELAY_STATION_MODELS.includes(result.model as RelayStationModel)) {
        setCurrentModel(result.model as RelayStationModel);
      }
    } catch (error) {
      console.warn('[RelayStationModelSettings] Failed to load current model:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (model: RelayStationModel) => {
    if (model === currentModel) return;

    try {
      setSettingDefault(model);
      console.log('[RelayStationModelSettings] Calling IPC with model:', model);
      const result = await invokeIpc('provider:setRelayStationModel', model) as { success: boolean; error?: string };
      console.log('[RelayStationModelSettings] IPC result:', result);

      if (result.success) {
        setCurrentModel(model);
        toast.success(t('relayStation.modelChanged', { model }));
      } else {
        toast.error(result.error || t('relayStation.modelChangeFailed'));
      }
    } catch (error) {
      toast.error(t('relayStation.modelChangeFailed'));
      console.error('[RelayStationModelSettings] Failed to set default model:', error);
    } finally {
      setSettingDefault(null);
    }
  };

  return (
    <Card className="border-black/10 dark:border-white/10 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          <CardTitle className="text-lg font-semibold">
            {t('relayStation.modelSettings', 'Relay Station Model')}
          </CardTitle>
        </div>
        <CardDescription className="text-sm">
          {t('relayStation.modelSettingsDesc', 'Select the default model for Relay Station')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          RELAY_STATION_MODELS.map((model) => (
            <div
              key={model}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                currentModel === model
                  ? 'border-blue-500/50 bg-blue-500/5'
                  : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all ${
                    currentModel === model
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-black/20 dark:border-white/20'
                  }`}
                >
                  {currentModel === model && <Check className="h-3.5 w-3.5 text-white" />}
                </div>
                <div>
                  <p className="font-medium text-sm">{model}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant={currentModel === model ? 'secondary' : 'default'}
                disabled={currentModel === model || settingDefault !== null}
                onClick={() => handleSetDefault(model)}
                className={`rounded-lg text-xs ${
                  currentModel === model
                    ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/10 cursor-default'
                    : ''
                }`}
              >
                {settingDefault === model ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : currentModel === model ? (
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                ) : null}
                {currentModel === model
                  ? t('relayStation.currentDefault', 'Current')
                  : t('relayStation.setAsDefault', 'Set Default')}
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
