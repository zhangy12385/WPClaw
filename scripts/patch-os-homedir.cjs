#!/usr/bin/env node
/**
 * Patches os.homedir() in the compiled electron main bundle to support portable mode.
 * This MUST run BEFORE the electron app starts, so we prepend the patch to the bundle itself.
 *
 * On Windows, os.homedir() uses the Windows API and ignores process.env.HOME.
 * The patch makes os.homedir() check process.env.CLAWX_HOME first.
 */
const { existsSync, readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

const MAIN_BUNDLE = resolve(__dirname, '..', 'dist-electron', 'main', 'index.js');

const PATCH = `
// PATCH: os.homedir for portable mode support
// This must run before any module that uses os.homedir()
(function() {
  var os = require('os');
  var _homedir = os.homedir;
  os.homedir = function() {
    if (process.env.CLAWX_HOME) return process.env.CLAWX_HOME;
    return _homedir.call(os);
  };
  os.homedir.__original = _homedir;
})();
`;

function patchBundle() {
  if (!existsSync(MAIN_BUNDLE)) {
    console.warn('[patch-os-homedir] Bundle not found, skipping patch:', MAIN_BUNDLE);
    return;
  }

  const content = readFileSync(MAIN_BUNDLE, 'utf-8');

  // Already patched? Check for the unique patch marker
  if (content.includes('// PATCH: os.homedir for portable mode')) {
    console.log('[patch-os-homedir] Bundle already patched');
    return;
  }

  // Prepend the patch
  writeFileSync(MAIN_BUNDLE, PATCH + '\n' + content);
  console.log('[patch-os-homedir] Patched os.homedir in bundle');
}

patchBundle();
