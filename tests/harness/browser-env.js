/**
 * Minimalne środowisko przeglądarkowe dla testów node:test.
 * Odtwarza tylko to, czego moduły js/ używają na poziomie logiki
 * (localStorage, navigator, document-stub, fetch do data/*.json, crypto).
 */
const fs = require('fs');
const path = require('path');
const { webcrypto } = require('node:crypto');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

function createLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
    setItem: (k, v) => store.set(String(k), String(v)),
    removeItem: (k) => store.delete(String(k)),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
    _dump: () => Object.fromEntries(store),
  };
}

function createElementStub() {
  const el = {
    style: {},
    dataset: {},
    _innerHTML: undefined,
    textContent: '',
    // Emulacja przeglądarki: div z samym textContent zwraca innerHTML
    // z encjami &amp; &lt; &gt; (cudzysłowy NIE są escapowane — jak w DOM).
    get innerHTML() {
      if (this._innerHTML !== undefined) return this._innerHTML;
      return String(this.textContent)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    },
    set innerHTML(v) { this._innerHTML = v; },
    classList: {
      _set: new Set(),
      add(...c) { c.forEach((x) => this._set.add(x)); },
      remove(...c) { c.forEach((x) => this._set.delete(x)); },
      toggle(c) { this._set.has(c) ? this._set.delete(c) : this._set.add(c); },
      contains(c) { return this._set.has(c); },
    },
    children: [],
    value: '',
    checked: false,
    disabled: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    appendChild(child) { this.children.push(child); return child; },
    removeChild() {},
    setAttribute() {},
    getAttribute: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    focus: () => {},
    blur: () => {},
    click: () => {},
    closest: () => null,
    remove: () => {},
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
  };
  return el;
}

function createDocument() {
  return {
    addEventListener: () => {},
    removeEventListener: () => {},
    getElementById: () => createElementStub(),
    querySelector: () => createElementStub(),
    querySelectorAll: () => [],
    createElement: () => createElementStub(),
    body: createElementStub(),
    documentElement: createElementStub(),
    hidden: false,
    visibilityState: 'visible',
  };
}

function createFetch() {
  return function fetchStub(url) {
    const clean = String(url).replace(/^\.?\//, '').split('?')[0];
    const filePath = path.join(PROJECT_ROOT, clean);
    if (filePath.startsWith(PROJECT_ROOT) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const text = fs.readFileSync(filePath, 'utf8');
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(JSON.parse(text)),
        text: () => Promise.resolve(text),
      });
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.reject(new Error('404 ' + url)),
      text: () => Promise.resolve(''),
    });
  };
}

/**
 * Buduje obiekt-sandbox służący jako globalThis kontekstu vm.
 */
function createBrowserEnv({ now } = {}) {
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;

  sandbox.localStorage = createLocalStorage();
  sandbox.sessionStorage = createLocalStorage();
  sandbox.document = createDocument();
  sandbox.navigator = {
    onLine: true,
    language: 'pl-PL',
    userAgent: 'node-test',
    serviceWorker: { register: () => Promise.resolve({}), addEventListener: () => {} },
    vibrate: () => {},
  };
  sandbox.location = { href: 'http://localhost:7321/', search: '', pathname: '/', origin: 'http://localhost:7321', reload: () => {} };
  sandbox.history = { pushState: () => {}, replaceState: () => {} };
  sandbox.fetch = createFetch();
  sandbox.crypto = webcrypto;
  sandbox.TextEncoder = TextEncoder;
  sandbox.TextDecoder = TextDecoder;
  sandbox.btoa = (s) => Buffer.from(String(s), 'binary').toString('base64');
  sandbox.atob = (s) => Buffer.from(String(s), 'base64').toString('binary');
  sandbox.console = console;
  sandbox.alert = () => {};
  sandbox.confirm = () => true;
  sandbox.prompt = () => null;
  sandbox.setTimeout = setTimeout;
  sandbox.clearTimeout = clearTimeout;
  sandbox.setInterval = setInterval;
  sandbox.clearInterval = clearInterval;
  sandbox.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  sandbox.cancelAnimationFrame = clearTimeout;
  sandbox.matchMedia = () => ({ matches: false, addListener: () => {}, addEventListener: () => {} });
  sandbox.addEventListener = () => {};
  sandbox.removeEventListener = () => {};
  sandbox.dispatchEvent = () => true;
  sandbox.CustomEvent = class CustomEvent { constructor(type, opts = {}) { this.type = type; this.detail = opts.detail; } };
  sandbox.Event = class Event { constructor(type) { this.type = type; } };
  sandbox.Notification = class Notification { static permission = 'denied'; static requestPermission() { return Promise.resolve('denied'); } };
  sandbox.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  sandbox.MutationObserver = class { observe() {} disconnect() {} };
  sandbox.URLSearchParams = URLSearchParams;
  sandbox.URL = URL;
  sandbox.Blob = class Blob { constructor(parts) { this.parts = parts; } };
  sandbox.FileReader = class FileReader { readAsText() {} };
  sandbox.Intl = Intl;
  sandbox.JSON = JSON;
  sandbox.Math = Math;
  sandbox.Date = Date;
  sandbox.performance = { now: () => Date.now() };
  sandbox.structuredClone = structuredClone;

  if (now) {
    const RealDate = Date;
    const fixed = new RealDate(now).getTime();
    sandbox.Date = class extends RealDate {
      constructor(...args) { args.length === 0 ? super(fixed) : super(...args); }
      static now() { return fixed; }
    };
  }

  return sandbox;
}

module.exports = { createBrowserEnv, PROJECT_ROOT };
