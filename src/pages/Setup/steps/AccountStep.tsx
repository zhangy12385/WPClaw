import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUserStore, RELAY_STATION_URL } from '@/stores/user';
import { invokeIpc } from '@/lib/api-client';
import { toast } from 'sonner';

type Step = 'register' | 'login' | 'model-select';

interface AccountStepProps {
  onConfigured: (configured: boolean) => void;
  onModelChange: (model: string) => void;
}

export function AccountStep({ onConfigured, onModelChange }: AccountStepProps) {
  const { t } = useTranslation('setup');
  const [step, setStep] = useState<Step>('register');
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const register = useUserStore((s) => s.register);
  const login = useUserStore((s) => s.login);
  const getTokenList = useUserStore((s) => s.getTokenList);
  const getTokenKey = useUserStore((s) => s.getTokenKey);
  const fetchModels = useUserStore((s) => s.fetchModels);
  const models = useUserStore((s) => s.models);
  const selectedModel = useUserStore((s) => s.selectedModel);
  const setSelectedModel = useUserStore((s) => s.setSelectedModel);
  const tokenKey = useUserStore((s) => s.tokenKey);

  const handleSubmit = async () => {
    console.log('[handleSubmit] start, isLoginMode=', isLoginMode);
    if (!username.trim() || !password.trim()) {
      toast.error(t('steps.account.username') + ' / ' + t('steps.account.password') + ' ' + t('common:actions.required'));
      return;
    }

    if (password.length < 8) {
      toast.error(t('steps.account.passwordTooShort'));
      return;
    }

    setIsLoading(true);

    const result = isLoginMode
      ? await login(username.trim(), password)
      : await register(username.trim(), password);
    console.log('[handleSubmit] login/register result:', JSON.stringify(result));

    if (!result.success) {
      toast.error(result.message || (isLoginMode ? t('steps.account.loginFailed') : t('steps.account.registerFailed')));
      setIsLoading(false);
      return;
    }

    console.log('[handleSubmit] fetching token list');
    const tokens = await getTokenList();
    console.log('[handleSubmit] tokens:', JSON.stringify(tokens));
    const firstToken = tokens[0];
    if (!firstToken) {
      toast.error(t('steps.account.noTokenFound'));
      setIsLoading(false);
      return;
    }

    console.log('[handleSubmit] fetching token key, tokenId=', firstToken.id);
    const keyResult = await getTokenKey(firstToken.id);
    console.log('[handleSubmit] keyResult:', JSON.stringify(keyResult));
    if (!keyResult.success) {
      toast.error(keyResult.message || t('steps.account.getTokenKeyFailed'));
      setIsLoading(false);
      return;
    }

    console.log('[handleSubmit] fetching models');
    const modelsResult = await fetchModels();
    console.log('[handleSubmit] modelsResult:', JSON.stringify(modelsResult));
    if (!modelsResult.success) {
      toast.error(modelsResult.message || t('steps.account.fetchModelsFailed'));
      setIsLoading(false);
      return;
    }

    console.log('[handleSubmit] all done, setting step to model-select');
    setIsLoading(false);
    setStep('model-select');

    const availableModels = useUserStore.getState().models;
    if (availableModels.length > 0) {
      const firstModel = availableModels[0];
      setSelectedModel(firstModel);
      onModelChange(firstModel);
      try {
        const { tokenKey } = useUserStore.getState();
        const apiKey = tokenKey.startsWith('sk-') ? tokenKey : `sk-${tokenKey}`;
        await invokeIpc('provider:saveRelayStation', RELAY_STATION_URL, apiKey, firstModel);
      } catch (err) {
        console.warn('[handleSubmit] Failed to save relay station config:', err);
      }
      onConfigured(true);
    }
  };

  const switchToLogin = () => {
    setIsLoginMode(true);
    setIsLoading(false);
  };

  const switchToRegister = () => {
    setIsLoginMode(false);
    setIsLoading(false);
  };

  const handleModelSelect = async (model: string) => {
    setSelectedModel(model);
    onModelChange(model);

    if (!model) return;

    try {
      const { tokenKey } = useUserStore.getState();
      const apiKey = tokenKey.startsWith('sk-') ? tokenKey : `sk-${tokenKey}`;
      await invokeIpc('provider:saveRelayStation', RELAY_STATION_URL, apiKey, model);
    } catch (err) {
      console.warn('[handleModelSelect] Failed to save relay station config:', err);
    }

    onConfigured(true);
  };


  return (
    <div className="space-y-6">

      {(step === 'register' || step === 'login') && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">{t('steps.account.username')}</Label>
            <Input
              id="username"
              type="text"
              placeholder={t('steps.account.usernamePlaceholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('steps.account.password')}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t('steps.account.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLoginMode ? 'current-password' : 'new-password'}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!username.trim() || !password.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isLoginMode ? t('steps.account.logining') : t('steps.account.registering')}
              </>
            ) : (
              isLoginMode ? t('steps.account.login') : t('steps.account.register')
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            {isLoginMode ? (
              <>
                {t('steps.account.noAccount')}
                <button onClick={switchToRegister} className="ml-1 text-primary hover:underline bg-transparent border-none cursor-pointer">
                  {t('steps.account.goRegister')}
                </button>
              </>
            ) : (
              <>
                {t('steps.account.hasAccount')}
                <button onClick={switchToLogin} className="ml-1 text-primary hover:underline bg-transparent border-none cursor-pointer">
                  {t('steps.account.goLogin')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Model selection */}
      {step === 'model-select' && (
        <div className="space-y-4">
          {tokenKey && (
            <div className="space-y-2">
              <Label>{t('steps.account.apiKey')}</Label>
              <Input
                value={tokenKey}
                readOnly
                className="bg-muted cursor-default"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="model">{t('steps.account.models.title')}</Label>
            <select
              id="model"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={selectedModel}
              onChange={(e) => handleModelSelect(e.target.value)}
            >
              {models.length === 0 ? (
                <option value="">{t('steps.account.noModels')}</option>
              ) : (
                models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}