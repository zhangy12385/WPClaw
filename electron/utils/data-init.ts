import { app } from 'electron';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export interface DataInitResult {
  success: boolean;
  dataDir: string;
  error?: string;
}

/**
 * Get the data folder path next to the exe
 */
function getPortableDataDir(): string {
  const exeDir = dirname(process.execPath);
  return join(exeDir, 'data');
}

/**
 * Initialize portable data directory (forced portable mode)
 * 1. Set HOME/USERPROFILE so ~/.openclaw resolves to data/.openclaw
 * 2. Set app.setPath('userData') so Electron uses the portable directory
 * 3. Create necessary subdirectories
 */
export function initializePortableData(): DataInitResult {
  const dataDir = getPortableDataDir();

  try {
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    // Key: set HOME so ~/.openclaw resolves to data/.openclaw
    // HOME path must end with separator, otherwise ~/.openclaw becomes data.openclaw instead of data/.openclaw
    const separator = process.platform === 'win32' ? '\\' : '/';
    const dataDirWithSep = dataDir.endsWith(separator) ? dataDir : dataDir + separator;
    process.env.HOME = dataDirWithSep;
    process.env.USERPROFILE = dataDirWithSep;
    // Tell OpenClaw to use dataDir/.openclaw as its state directory, so that
    // skills, config, and workspace are all co-located with the portable app.
    process.env.OPENCLAW_STATE_DIR = dataDirWithSep;

    // Set Electron's userData path to portable directory
    app.setPath('userData', dataDir);

    // Create necessary subdirectories
    const subdirs = ['.openclaw', 'iclaw-config', 'logs'];
    for (const subdir of subdirs) {
      const dir = join(dataDir, subdir);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }

    console.log('[data-init] Portable mode initialized, data dir:', dataDir);
    return { success: true, dataDir };
  } catch (error) {
    console.error('[data-init] Failed to initialize portable data:', error);
    return {
      success: false,
      dataDir,
      error: String(error),
    };
  }
}