/**
 * User State Store
 * Manages user authentication state and data from the relay station API.
 * Persisted to localStorage under 'clawx-user'.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invokeIpc } from '@/lib/api-client';

const RELAY_STATION_URL = 'https://www.wangpai.one';

interface UserInfo {
  id: number;
  username: string;
  access_token: string;
  group?: string;
}

interface TokenInfo {
  id: number;
  user_id: number;
  key: string;
  name: string;
  status: number;
  remain_quota: number;
  unlimited_quota: boolean;
  created_time: number;
  expired_time: number;
  model_limits_enabled: boolean;
  model_limits: string;
  used_quota: number;
  group: string;
}

export interface QuotaDay {
  date: string;
  quota: number;
  used_quota: number;
}

// 用户信息接口（来自 /api/user/self）
export interface UserSelfData {
  id: number;
  username: string;
  display_name: string;
  role: number;
  status: number;
  email: string;
  group: string;
  quota: number;
  used_quota: number;
  request_count: number;
}

// 仪表盘订阅信息（来自 /dashboard/billing/subscription）
export interface DashboardSubscription {
  object: string;
  has_payment_method: boolean;
  soft_limit_usd: number;
  hard_limit_usd: number;
  system_hard_limit_usd: number;
  access_until: number;
}

// 仪表盘使用量（来自 /dashboard/billing/usage）
export interface DashboardUsage {
  object: string;
  total_usage: number;
}

// 配额数据项（来自 /api/data/self）
export interface QuotaDataItem {
  created_at: number;
  model_name: string;
  count: number;
  quota: number;
  token_used: number;
}

export interface TopupRecord {
  id: number;
  user_id: number;
  amount: number;
  money: number;
  trade_no: string;
  payment_method: string;
  status: number;
  create_time: number;
}

interface UserState {
  username: string;
  userId: number;
  accessToken: string;
  tokenKey: string;
  models: string[];
  selectedModel: string;
  quotaData: QuotaDay[];
  topupRecords: TopupRecord[];
  notice: string;
  userSelfData: UserSelfData | null;
  dashboardSubscription: DashboardSubscription | null;
  dashboardUsage: DashboardUsage | null;
  consumeTokens: number;
  times: number;

  // Actions
  register: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  getUserInfo: () => Promise<{ success: boolean; message?: string }>;
  getTokenList: () => Promise<TokenInfo[]>;
  createToken: (accessToken: string, userId: number, name?: string) => Promise<{ success: boolean; message?: string }>;
  getTokenKey: (tokenId: number) => Promise<{ success: boolean; key?: string; message?: string }>;
  fetchModels: () => Promise<{ success: boolean; message?: string }>;
  fetchQuotaData: () => Promise<{ success: boolean; message?: string }>;
  fetchTopupRecords: () => Promise<{ success: boolean; message?: string }>;
  fetchDashboardData: () => Promise<{ success: boolean; message?: string }>;
  topup: (code: string) => Promise<{ success: boolean; data?: number; message?: string }>;
  fetchNotice: () => Promise<{ success: boolean; message?: string }>;
  clearAuth: () => void;
  setSelectedModel: (model: string) => void;
}

const emptyQuotaData: QuotaDay[] = [];
const emptyTopupRecords: TopupRecord[] = [];

// Session file persistence helpers
async function saveSessionToFile(state: UserState): Promise<void> {
  try {
    await invokeIpc('user:saveSession', {
      username: state.username,
      userId: state.userId,
      accessToken: state.accessToken,
      tokenKey: state.tokenKey,
      models: state.models,
      selectedModel: state.selectedModel,
    });
  } catch (err) {
    console.warn('[userStore] Failed to save session to file:', err);
  }
}

async function loadSessionFromFile(): Promise<Partial<UserState> | null> {
  try {
    const result = await invokeIpc<{ success: boolean; data?: Partial<UserState> }>('user:loadSession');
    if (result.success && result.data && result.data.username && result.data.accessToken) {
      console.log('[userStore] Loaded session from file:', result.data.username);
      return result.data;
    }
  } catch (err) {
    console.warn('[userStore] Failed to load session from file:', err);
  }
  return null;
}

async function clearSessionFile(): Promise<void> {
  try {
    await invokeIpc('user:clearSession');
  } catch (err) {
    console.warn('[userStore] Failed to clear session file:', err);
  }
}

// IPC-based fetch through main process (bypasses CORS)
async function relayFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await invokeIpc<{ ok: boolean; data?: { status: number; ok: boolean; json?: T; text?: string }; error?: { message: string } }>('relay:fetch', {
    url,
    method: init?.method || 'GET',
    headers: init?.headers as Record<string, string> || {},
    body: init?.body,
    credentials: true,
  });
  console.log('[relayFetch] raw response:', JSON.stringify(response));
  if (!response.ok || !response.data) {
    throw new Error(response.error?.message || 'Request failed');
  }
  const jsonData = response.data.json as { success?: boolean; message?: string } | undefined;
  if (jsonData && jsonData.success === false) {
    const msg = jsonData.message || 'Request failed';
    throw new Error(msg);
  }
  const jsonVal = response.data.json;
  if (jsonVal !== undefined && jsonVal !== null && jsonVal !== '') {
    return jsonVal as T;
  }
  const text = response.data.text ?? '';
  if (text === '') {
    console.log('[relayFetch] empty response, returning {}');
    return {} as T;
  }
  console.log('[relayFetch] unexpected text response:', text);
  return {} as T;
}

// Internal fetch with cookie-based auth and New-Api-User header
async function authFetch<T>(path: string, accessToken: string, userId: number, init?: RequestInit): Promise<T> {
  const url = `${RELAY_STATION_URL}${path}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'New-Api-User': String(userId),
    ...(init?.headers as Record<string, string> || {}),
  };
  return relayFetch<T>(url, { ...init, headers });
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      username: '',
      userId: 0,
      accessToken: '',
      tokenKey: '',
      models: [],
      selectedModel: '',
      quotaData: emptyQuotaData,
      topupRecords: emptyTopupRecords,
      notice: '',
      userSelfData: null,
      dashboardSubscription: null,
      dashboardUsage: null,
      consumeTokens: 0,
      times: 0,

      setSelectedModel: (model) => {
        set({ selectedModel: model });
        void saveSessionToFile(get());
      },

      clearAuth: () => {
        clearSessionFile();
        set({
          username: '',
          userId: 0,
          accessToken: '',
          tokenKey: '',
          models: [],
          selectedModel: '',
          quotaData: emptyQuotaData,
          topupRecords: emptyTopupRecords,
          notice: '',
          userSelfData: null,
          dashboardSubscription: null,
          dashboardUsage: null,
          consumeTokens: 0,
          times: 0,
        });
      },

      register: async (username, password) => {
        try {
          const registerUrl = `${RELAY_STATION_URL}/api/user/register`;
          const loginUrl = `${RELAY_STATION_URL}/api/user/login`;

          const regData = await relayFetch<{ success: boolean; message?: string }>(registerUrl, {
            method: 'POST',
            body: JSON.stringify({ username, password }),
          });
          console.log('[register] regData:', JSON.stringify(regData));
          if (!regData.success) {
            return { success: false, message: regData.message };
          }

          console.log('[register] calling login API with:', { username, password });
          const loginData = await relayFetch<{ success: boolean; data?: UserInfo; message?: string }>(loginUrl, {
            method: 'POST',
            body: JSON.stringify({ username, password }),
          });
          console.log('[register] loginData:', JSON.stringify(loginData));
          if (!loginData.success || !loginData.data) {
            return { success: false, message: loginData.message || 'Login after registration failed' };
          }
          set({ username, userId: loginData.data.id });

          const tokenResponse = await relayFetch<{ success: boolean; data?: string }>(
            `${RELAY_STATION_URL}/api/user/token`,
            { method: 'GET', headers: { 'New-Api-User': String(loginData.data.id), 'Content-Type': 'application/json' } }
          );
          console.log('[register] tokenResponse:', JSON.stringify(tokenResponse));
          if (!tokenResponse.success || !tokenResponse.data) {
            return { success: false, message: 'Failed to get access token after registration' };
          }
          set({ accessToken: tokenResponse.data });

          const createResult = await get().createToken(tokenResponse.data, loginData.data.id, username);
          console.log('[register] createResult:', JSON.stringify(createResult));

          await saveSessionToFile(get());

          return { success: true };
        } catch (error) {
          return { success: false, message: String(error) };
        }
      },

      login: async (username, password) => {
        try {
          const loginUrl = `${RELAY_STATION_URL}/api/user/login`;
          const loginData = await relayFetch<{ success: boolean; data?: UserInfo; message?: string }>(loginUrl, {
            method: 'POST',
            body: JSON.stringify({ username, password }),
          });
          if (!loginData.success || !loginData.data) {
            return { success: false, message: loginData.message || 'Login failed' };
          }
          set({ username, userId: loginData.data.id });

          const tokenResponse = await relayFetch<{ success: boolean; data?: string }>(
            `${RELAY_STATION_URL}/api/user/token`,
            { method: 'GET', headers: { 'New-Api-User': String(loginData.data.id), 'Content-Type': 'application/json' } }
          );
          if (!tokenResponse.success || !tokenResponse.data) {
            return { success: false, message: 'Failed to get access token' };
          }
          set({ accessToken: tokenResponse.data });

          const tokens = await get().getTokenList();
          if (tokens.length === 0) {
            await get().createToken(tokenResponse.data, loginData.data.id, username);
          }

          await saveSessionToFile(get());

          return { success: true };
        } catch (error) {
          return { success: false, message: String(error) };
        }
      },

      getUserInfo: async () => {
        try {
          const { accessToken, userId } = get();
          if (!accessToken || !userId) return { success: false, message: 'Not logged in' };
          const data = await authFetch<{ success: boolean; data?: UserInfo }>(
            '/api/user/self', accessToken, userId
          );
          if (data.success && data.data) {
            set({
              username: data.data.username,
              userId: data.data.id,
              accessToken: data.data.access_token || accessToken,
            });
          }
          return { success: data.success };
        } catch (error) {
          return { success: false, message: String(error) };
        }
      },

      getTokenList: async () => {
        const { accessToken, userId } = get();
        if (!accessToken || !userId) return [];
        try {
          const data = await authFetch<{ success: boolean; data?: { items: TokenInfo[] } }>(
            '/api/token/', accessToken, userId
          );
          return data.success && data.data?.items ? data.data.items : [];
        } catch {
          return [];
        }
      },

      createToken: async (accessToken, userId, name?: string) => {
        try {
          const tokenName = name || 'WPClaw';
          const data = await relayFetch<{ success: boolean; message?: string }>(
            `${RELAY_STATION_URL}/api/token/`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'New-Api-User': String(userId),
              },
              body: JSON.stringify({ name: tokenName, group: 'default', unlimited_quota: true }),
            }
          );
          return { success: data.success, message: data.message };
        } catch (error) {
          return { success: false, message: String(error) };
        }
      },

      getTokenKey: async (tokenId) => {
        const { accessToken, userId } = get();
        if (!accessToken || !userId) return { success: false, message: 'Not logged in' };
        try {
          const data = await authFetch<{ success: boolean; data?: { key: string } }>(
            `/api/token/${tokenId}/key`, accessToken, userId, { method: 'POST' }
          );
          if (data.success && data.data?.key) {
            set({ tokenKey: data.data.key });
            return { success: true, key: data.data.key };
          }
          return { success: false, message: 'Failed to get token key' };
        } catch (error) {
          return { success: false, message: String(error) };
        }
      },

      fetchModels: async () => {
        const { accessToken, userId } = get();
        if (!accessToken || !userId) return { success: false, message: 'Not logged in' };
        try {
          const data = await authFetch<{ success: boolean; data?: string[] }>(
            '/api/user/models', accessToken, userId
          );
          if (data.success && data.data) {
            set({ models: data.data });
            return { success: true };
          }
          return { success: false };
        } catch (error) {
          return { success: false, message: String(error) };
        }
      },

      fetchQuotaData: async () => {
        const { accessToken, userId } = get();
        if (!accessToken || !userId) return { success: false, message: 'Not logged in' };
        try {
          console.log('[fetchQuotaData] 开始请求 /api/user/self, accessToken:', accessToken, 'userId:', userId);
          const userData = await authFetch<{ success: boolean; data?: UserSelfData }>(
            '/api/user/self', accessToken, userId
          );
          console.log('[fetchQuotaData] userData 响应:', JSON.stringify(userData));

          const now = Math.floor(Date.now() / 1000);
          const startTimestamp = now - 30 * 24 * 60 * 60;
          const endTimestamp = now;
          console.log('[fetchQuotaData] 开始请求 /api/data/self?start_timestamp=', startTimestamp, '&end_timestamp=', endTimestamp);
          let quotaDataResult;
          try {
            quotaDataResult = await authFetch<{ success: boolean; data?: QuotaDataItem[] }>(
              `/api/data/self?start_timestamp=${startTimestamp}&end_timestamp=${endTimestamp}`, accessToken, userId
            );
            console.log('[fetchQuotaData] quotaDataResult 响应:', JSON.stringify(quotaDataResult));
          } catch (e) {
            console.error('[fetchQuotaData] /api/data/self 请求失败:', e);
            quotaDataResult = { success: false, data: [] };
          }

          if (userData.success && userData.data) {
            let totalTokens = 0;
            let totalTimes = 0;
            if (quotaDataResult && quotaDataResult.success && Array.isArray(quotaDataResult.data)) {
              console.log('[fetchQuotaData] quota data items:', quotaDataResult.data.length);
              quotaDataResult.data.forEach((item) => {
                totalTokens += item.token_used || 0;
                totalTimes += item.count || 0;
              });
            } else {
              console.log('[fetchQuotaData] quotaDataResult 无效或无数据:', JSON.stringify(quotaDataResult));
            }
            console.log('[fetchQuotaData] totalTokens:', totalTokens, 'totalTimes:', totalTimes);

            set({
              userSelfData: userData.data,
              username: userData.data.username,
              consumeTokens: totalTokens,
              times: totalTimes,
              quotaData: [{
                date: new Date().toISOString().split('T')[0],
                quota: userData.data.quota,
                used_quota: userData.data.used_quota,
              }]
            });
            return { success: true };
          }
          return { success: false };
        } catch (error) {
          console.error('[fetchQuotaData] error:', error);
          return { success: false, message: String(error) };
        }
      },

      fetchTopupRecords: async () => {
        const { accessToken, userId } = get();
        if (!accessToken || !userId) return { success: false, message: 'Not logged in' };
        try {
          const data = await authFetch<{ success: boolean; data?: { items: TopupRecord[] } }>(
            '/api/user/topup', accessToken, userId
          );
          if (data.success && data.data?.items) {
            set({ topupRecords: data.data.items });
            return { success: true };
          }
          return { success: false };
        } catch (error) {
          return { success: false, message: String(error) };
        }
      },

      topup: async (code) => {
        const { accessToken, userId } = get();
        if (!accessToken || !userId) return { success: false, message: 'Not logged in' };

        const requestHeaders = {
          'Authorization': `Bearer ${accessToken}`,
          'New-Api-User': String(userId),
          'Content-Type': 'application/json',
        };
        console.log('[topup] 请求头信息:', requestHeaders);

        try {
          const data = await authFetch<{ success: boolean; data?: number; message?: string }>(
            '/api/user/topup', accessToken, userId,
            { method: 'POST', body: JSON.stringify({ key: code }) }
          );
          console.log('[topup] 响应数据:', JSON.stringify(data));
          return { success: data.success, data: data.data, message: data.message };
        } catch (error) {
          console.error('[topup] 请求失败:', error);
          return { success: false, message: String(error) };
        }
      },

      fetchDashboardData: async () => {
        const { accessToken, userId } = get();
        if (!accessToken || !userId) return { success: false, message: 'Not logged in' };
        try {
          const subscriptionData = await authFetch<DashboardSubscription>(
            '/dashboard/billing/subscription', accessToken, userId
          );
          const usageData = await authFetch<DashboardUsage>(
            '/dashboard/billing/usage', accessToken, userId
          );
          set({
            dashboardSubscription: subscriptionData,
            dashboardUsage: usageData,
          });
          return { success: true };
        } catch (error) {
          return { success: false, message: String(error) };
        }
      },

      fetchNotice: async () => {
        try {
          const url = `${RELAY_STATION_URL}/api/notice`;
          const data = await relayFetch<{ success: boolean; data?: string }>(url, { method: 'GET' });
          if (data.success && data.data !== undefined) {
            set({ notice: data.data });
            return { success: true };
          }
          return { success: false };
        } catch (error) {
          return { success: false, message: String(error) };
        }
      },
    }),
    {
      name: 'clawx-user',
      onRehydrateStorage: () => (state) => {
        loadSessionFromFile().then((fileData) => {
          if (fileData && state) {
            if (!state.accessToken && fileData.accessToken) {
              console.log('[userStore] Restoring session from file');
              state.username = fileData.username || '';
              state.userId = fileData.userId || 0;
              state.accessToken = fileData.accessToken || '';
              state.tokenKey = fileData.tokenKey || '';
              state.models = fileData.models || [];
              state.selectedModel = fileData.selectedModel || '';
            }
          }
        });
      },
    }
  )
);

export { RELAY_STATION_URL };