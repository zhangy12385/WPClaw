/**
 * 打包后处理脚本
 * - 将 win-unpacked 重命名为 WPClaw
 * - 压缩为 ZIP（名称格式：王牌大龙虾-VYYMMDD.zip）
 * - 还原目录名为 win-unpacked
 */
const { execSync } = require('child_process');
const path = require('path');

const releaseDir = path.join(__dirname, '..', 'release');

const today = new Date();
const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
const zipName = `王牌大龙虾-V${yyyymmdd}.zip`;

const winUnpacked = path.join(releaseDir, 'win-unpacked');
const wpClawDir = path.join(releaseDir, 'WPClaw');
const zipPath = path.join(releaseDir, zipName);

const fs = require('fs');

// 检查 win-unpacked 是否存在
if (!fs.existsSync(winUnpacked)) {
  console.error(`❌ win-unpacked 目录不存在: ${winUnpacked}`);
  process.exit(1);
}

// 如果已存在 WPClaw 先删除
if (fs.existsSync(wpClawDir)) {
  fs.rmSync(wpClawDir, { recursive: true, force: true });
}

// 重命名 win-unpacked -> WPClaw
try {
  fs.renameSync(winUnpacked, wpClawDir);
  console.log('✅ 重命名为 WPClaw');
} catch (error) {
  console.error('❌ 重命名失败:', error.message);
  process.exit(1);
}

// 压缩为 ZIP
try {
  const psCmd = `Compress-Archive -Path '${wpClawDir}' -DestinationPath '${zipPath}' -Force`;
  execSync(`powershell -Command "${psCmd}"`, { stdio: 'inherit' });
  console.log(`✅ 压缩完成: ${zipName}`);
} catch (error) {
  console.error('❌ 压缩失败:', error.message);
  // 尝试还原
  try { fs.renameSync(wpClawDir, winUnpacked); } catch {}
  process.exit(1);
}

// 还原目录名为 win-unpacked（方便后续增量打包）
try {
  fs.renameSync(wpClawDir, winUnpacked);
  console.log('✅ 目录已还原为 win-unpacked');
} catch (error) {
  console.warn('⚠️ 还原目录失败:', error.message);
}

console.log(`\n📦 输出文件: ${zipPath}`);