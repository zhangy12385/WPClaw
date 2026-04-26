#!/usr/bin/env zx

import 'zx/globals';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PYTHON_VERSION = '3.13.3';
const BASE_URL = `https://www.python.org/ftp/python/${PYTHON_VERSION}`;
const OUTPUT_BASE = path.join(ROOT_DIR, 'resources', 'python');

// Python embeddable packages for Windows (amd64/arm64).
// For macOS we use .pkg, for Linux we use .tgz source.
const TARGETS = {
  'win32-x64': {
    filename: `python-${PYTHON_VERSION}-embed-amd64.zip`,
  },
  'win32-arm64': {
    filename: `python-${PYTHON_VERSION}-embed-arm64.zip`,
  },
  'darwin-x64': {
    filename: `python-${PYTHON_VERSION}-macos11.pkg`,
  },
  'darwin-arm64': {
    filename: `python-${PYTHON_VERSION}-macos11.pkg`,
  },
  'linux-x64': {
    filename: `Python-${PYTHON_VERSION}.tgz`,
  },
  'linux-arm64': {
    filename: `Python-${PYTHON_VERSION}.tgz`,
  },
};

const PLATFORM_GROUPS = {
  'mac': ['darwin-x64', 'darwin-arm64'],
  'win': ['win32-x64', 'win32-arm64'],
  'linux': ['linux-x64', 'linux-arm64'],
};

/**
 * Extract Python from a macOS .pkg file.
 * The .pkg is actually an XAR archive containing a Payload cpio.gz stream.
 */
async function extractMacOSPkg(pkgPath, destDir) {
  const tempDir = path.join(ROOT_DIR, 'temp_python_pkg');

  try {
    await fs.remove(tempDir);
    await fs.ensureDir(tempDir);

    // Extract the XAR archive
    echo`📂 Extracting XAR archive...`;
    await $`xar -xf ${pkgPath} -C ${tempDir}`;

    // Find the Payload file (cpio.gz)
    const payloadFile = path.join(tempDir, 'Payload');
    if (await fs.pathExists(payloadFile)) {
      echo`📂 Extracting Payload (cpio.gz)...`;
      await $`cat ${payloadFile} | gunzip | cpio -idm -D ${destDir}`;
    } else {
      // Try finding it in subdirectories
      const files = await glob('**/Payload', { cwd: tempDir, absolute: true });
      if (files.length > 0) {
        await $`cat ${files[0]} | gunzip | cpio -idm -D ${destDir}`;
      } else {
        throw new Error('Could not find Payload file in pkg');
      }
    }
  } finally {
    await fs.remove(tempDir);
  }
}

async function setupTarget(id) {
  const target = TARGETS[id];
  if (!target) {
    echo(chalk.yellow`⚠️ Target ${id} is not supported by this script.`);
    return;
  }

  const targetDir = path.join(OUTPUT_BASE, id);
  const tempDir = path.join(ROOT_DIR, 'temp_python_extract');
  const archivePath = path.join(ROOT_DIR, target.filename);
  const downloadUrl = `${BASE_URL}/${target.filename}`;

  echo(chalk.blue`\n📦 Setting up Python ${PYTHON_VERSION} for ${id}...`);

  // Cleanup & Prep
  await fs.remove(targetDir);
  await fs.remove(tempDir);
  await fs.ensureDir(targetDir);
  await fs.ensureDir(tempDir);

  try {
    // Download
    echo`⬇️ Downloading: ${downloadUrl}`;
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText} (${response.status})`);
    }
    const buffer = await response.arrayBuffer();
    await fs.writeFile(archivePath, Buffer.from(buffer));

    // Extract based on file type and platform
    echo`📂 Extracting...`;

    if (id.startsWith('win32')) {
      // Windows: ZIP file
      const { execFileSync } = await import('child_process');
      const psCommand = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${archivePath.replace(/'/g, "''")}', '${tempDir.replace(/'/g, "''")}')`;
      execFileSync('powershell.exe', ['-NoProfile', '-Command', psCommand], { stdio: 'inherit' });

      // Move contents to targetDir (embeddable extracts directly)
      const contents = await fs.readdir(tempDir);
      for (const item of contents) {
        await fs.move(path.join(tempDir, item), path.join(targetDir, item), { overwrite: true });
      }
    } else if (id.startsWith('darwin')) {
      // macOS: .pkg file (XAR archive with cpio.gz payload)
      await extractMacOSPkg(archivePath, targetDir);
    } else {
      // Linux: .tar.gz source
      await $`tar -xzf ${archivePath} -C ${tempDir}`;

      // Move contents from Python-VERSION folder to targetDir
      const folderName = `Python-${PYTHON_VERSION}`;
      const srcFolder = path.join(tempDir, folderName);
      const items = await fs.readdir(srcFolder);
      for (const item of items) {
        await fs.move(path.join(srcFolder, item), path.join(targetDir, item), { overwrite: true });
      }
    }

    // Verify python executable exists
    const pythonExe = id.startsWith('win32')
      ? path.join(targetDir, 'python.exe')
      : path.join(targetDir, 'bin', 'python3');

    if (await fs.pathExists(pythonExe)) {
      echo(chalk.green`✅ Success: Python installed at ${targetDir}`);
    } else {
      echo(chalk.yellow`⚠️ Warning: python executable not found at expected location`);
      // List what we extracted for debugging
      const extracted = await fs.readdir(targetDir);
      echo(`   Extracted files: ${extracted.join(', ')}`);
    }

  } finally {
    // Cleanup
    await fs.remove(archivePath);
    await fs.remove(tempDir);
  }
}

// Main logic
const downloadAll = argv.all;
const platform = argv.platform;

if (downloadAll) {
  echo(chalk.cyan`🌐 Downloading Python binaries for ALL supported platforms...`);
  for (const id of Object.keys(TARGETS)) {
    await setupTarget(id);
  }
} else if (platform) {
  const targets = PLATFORM_GROUPS[platform];
  if (!targets) {
    echo(chalk.red`❌ Unknown platform: ${platform}`);
    echo(`Available platforms: ${Object.keys(PLATFORM_GROUPS).join(', ')}`);
    process.exit(1);
  }

  echo(chalk.cyan`🎯 Downloading Python for platform: ${platform}`);
  echo(`   Architectures: ${targets.join(', ')}`);
  for (const id of targets) {
    await setupTarget(id);
  }
} else {
  const currentId = `${os.platform()}-${os.arch()}`;
  echo(chalk.cyan`💻 Detected system: ${currentId}`);

  if (TARGETS[currentId]) {
    await setupTarget(currentId);
  } else {
    echo(chalk.red`❌ Current system ${currentId} is not in the supported download list.`);
    echo(`Supported targets: ${Object.keys(TARGETS).join(', ')}`);
    echo(`\nTip: Use --platform=<platform> to download for a specific platform`);
    echo(`     Use --all to download for all platforms`);
    process.exit(1);
  }
}

echo(chalk.green`\n🎉 Done!`);
