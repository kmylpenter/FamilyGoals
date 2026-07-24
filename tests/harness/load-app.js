/**
 * Loader modułów js/ (window-globals, bez bundlera) do kontekstu vm.
 * Kolejność = kolejność <script> w index.html.
 * Deklaracje const/class z osobnych runInContext dzielą globalny leksykalny
 * scope kontekstu (zachowanie jak osobne <script> w przeglądarce).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createBrowserEnv, PROJECT_ROOT } = require('./browser-env');

// Pełna kolejność z index.html
const ALL_SCRIPTS = [
  'js/utils.js',
  'js/data-manager.js',
  'js/event-bus.js',
  'js/gamification-manager.js',
  'js/engagement-manager.js',
  'js/alert-manager.js',
  'js/pin-manager.js',
  'js/recurring-manager.js',
  'js/ai-advisor.js',
  'js/family-unity.js',
  'js/family-balance.js',
  'js/ui-features.js',
  'js/app.js',
];

// Moduły logiki (domyślny zestaw do testów jednostkowych — bez app.js,
// który buduje UI i wymaga realnego DOM)
const LOGIC_SCRIPTS = ALL_SCRIPTS.filter((f) => f !== 'js/app.js');

/**
 * Ładuje wskazane skrypty do świeżego środowiska.
 * @returns {{ctx: object, run: (code:string)=>any}} ctx = globalThis kontekstu
 */
function loadApp({ scripts = LOGIC_SCRIPTS, now, env } = {}) {
  const sandbox = env || createBrowserEnv({ now });
  const ctx = vm.createContext(sandbox);
  for (const rel of scripts) {
    const code = fs.readFileSync(path.join(PROJECT_ROOT, rel), 'utf8');
    try {
      vm.runInContext(code, ctx, { filename: rel });
    } catch (err) {
      err.message = `[load ${rel}] ${err.message}`;
      throw err;
    }
  }
  return { ctx, run: (code) => vm.runInContext(code, ctx) };
}

module.exports = { loadApp, ALL_SCRIPTS, LOGIC_SCRIPTS };
