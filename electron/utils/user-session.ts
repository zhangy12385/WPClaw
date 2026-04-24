/**
 * User Session Storage
 * Persists user authentication data to a JSON file in the data directory.
 */
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { getDataDir } from './paths';

const USER_SESSION_FILE = 'user-session.json';

export interface UserSessionData {
  username: string;
  userId: number;
  accessToken: string;
  tokenKey: string;
  models: string[];
  selectedModel: string;
}

function getUserSessionPath(): string {
  return join(getDataDir(), USER_SESSION_FILE);
}

function ensureUserSessionDir(): void {
  const dir = getDataDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function saveUserSession(data: UserSessionData): void {
  try {
    ensureUserSessionDir();
    const path = getUserSessionPath();
    writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
    console.log('[user-session] Saved user session to:', path);
  } catch (error) {
    console.error('[user-session] Failed to save user session:', error);
  }
}

export function loadUserSession(): UserSessionData | null {
  try {
    const path = getUserSessionPath();
    if (!existsSync(path)) {
      console.log('[user-session] No user session file found');
      return null;
    }
    const content = readFileSync(path, 'utf-8');
    const data = JSON.parse(content) as UserSessionData;
    console.log('[user-session] Loaded user session from:', path);
    return data;
  } catch (error) {
    console.error('[user-session] Failed to load user session:', error);
    return null;
  }
}

export function clearUserSession(): void {
  try {
    const path = getUserSessionPath();
    if (existsSync(path)) {
      writeFileSync(path, JSON.stringify({}, null, 2), 'utf-8');
      console.log('[user-session] Cleared user session');
    }
  } catch (error) {
    console.error('[user-session] Failed to clear user session:', error);
  }
}