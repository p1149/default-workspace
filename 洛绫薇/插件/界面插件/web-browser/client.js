/**
 * Client half of the Browser bundle.
 *
 * One left-sidebar entry (`sidebar.panellist`) and the browser page it opens
 * (`main`). The page sandboxes external HTTP(S) pages and keeps URL history and
 * favorites in this browser's IndexedDB. Cross-origin page activity inside the
 * frame cannot be observed; history records the addresses this panel opens.
 */
window.__ModuleLoader__.load({
  id: '@local/web-browser',
  factory(require) {
    const React = require('react');
    const { createElement: h, useState, useEffect, useRef } = React;

    /** Dictionary namespace owned by this plugin. */
    const NS = 'localWebBrowser';
    /** The id shared by the sidebar entry and the main panel it opens. */
    const PANEL_ID = 'webbrowser';
    /** Browser-local database and stores. */
    const DB_NAME = 'dsh.local.web-browser.v1';
    const HISTORY_STORE = 'history';
    const BOOKMARKS_STORE = 'bookmarks';
    const HISTORY_LIMIT = 500;
    /** Browser-local homepage preference. */
    const HOME_KEY = 'dsh.local.web-browser.homepage.v1';
    /** Search engines embedded in the page; both allow framing. */
    const SEARCH_ENGINES = {
      bing: 'https://www.bing.com/search?q=',
      baidu: 'https://www.baidu.com/s?wd=',
    };
    /** Gallery contract this plugin writes to when a direct image URL is opened. */
    const GALLERY_DB = 'dsh.local.gallery.v1';
    const GALLERY_STORE = 'images';
    const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
    const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif|bmp|svg|heic|heif)$/i;

    const en = {
      panel: 'Browser',
      title: 'Browser',
      intro: 'Enter a URL or a search query; bookmark pages, keep history, and set a homepage. Data stays in this browser.',
      badge: 'Local history & favorites',
      loading: 'Reading local history…',
      tabBrowse: 'Browse',
      tabHistory: 'History',
      tabFavorites: 'Favorites',
      addressPlaceholder: 'Enter a URL or search keywords',
      go: 'Go',
      search: 'Search',
      back: 'Back',
      forward: 'Forward',
      reload: 'Reload',
      home: 'Home',
      homeSettings: 'Browser settings',
      homepageLabel: 'Homepage URL',
      homepagePlaceholder: 'https://example.com',
      homepageHint: 'The home button opens this page. It can also open automatically when the panel starts.',
      autoOpen: 'Open the homepage when the browser starts',
      searchEngine: 'Search engine',
      searchEngineHint: 'Address-bar input that is not a URL is searched with this engine.',
      engineBing: 'Bing',
      engineBaidu: 'Baidu',
      offlineNotice: 'You are offline. Pages and searches need a network connection.',
      useCurrent: 'Use current page',
      clearHome: 'Clear homepage',
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      external: 'Open in system browser',
      star: 'Bookmark this page',
      unstar: 'Remove bookmark',
      emptyTitle: 'Enter a URL to start browsing',
      emptyHint: 'Sites that refuse to be embedded can still be opened in your system browser.',
      iframeHint: 'Direct image URLs are auto-saved to Gallery when the site allows cross-origin reads. Sites that block embedding (X-Frame-Options / CSP) can be opened externally with ↗.',
      historySearch: 'Search history…',
      historyEmpty: 'No URL history yet',
      historyEmptyHint: 'Addresses opened from the address bar, history, or favorites appear here.',
      historyNote: 'History covers navigations this panel initiates; cross-origin clicks inside a page cannot be read.',
      clear: 'Clear history',
      clearConfirm: 'Confirm clear?',
      visits: '{n} visits',
      open: 'Open',
      delete: 'Delete',
      favoritesSearch: 'Search favorites…',
      favoritesEmpty: 'No favorites yet',
      favoritesEmptyHint: 'Use the ☆ button beside the address bar to bookmark the current page.',
      addCurrent: 'Bookmark current page',
      removeCurrent: 'Remove bookmark',
      noCurrent: 'Open a page before bookmarking it.',
      invalidUrl: 'Enter a valid URL.',
      onlyHttp: 'Only HTTP and HTTPS addresses are allowed.',
      credentials: 'URLs with embedded usernames or passwords are rejected.',
      selfUrl: 'The DSH application itself cannot be embedded here.',
      externalBlocked: 'The browser blocked the external tab. Allow popups and try again.',
      storageUnavailable: 'Browser storage is unavailable; history and favorites cannot be saved.',
      saveFailed: 'Could not save. Try again.',
      deleteFailed: 'Could not delete. Try again.',
      clearFailed: 'Could not clear history. Try again.',
      localNote: 'History and favorites are stored on this device only.',
      imageSaving: 'Saving this image to Gallery…',
      imageSaved: 'Auto-saved to Gallery: {name}',
      imageDuplicate: 'This image is already in the Gallery.',
      imageUnreadable: 'The image opened, but this site does not allow cross-origin reads, so it was not auto-saved. Save it manually and add it in the Gallery.',
      imageTooLarge: 'The image exceeds {n}; it was not saved.',
      imageSaveFailed: 'Could not write to the Gallery.',
    };

    const zh = {
      panel: '浏览器',
      title: '浏览器',
      intro: '输入网址或搜索关键词，收藏页面、记录历史并设置主页。数据只保存在本机。',
      badge: '本机历史与收藏',
      loading: '正在读取本机历史…',
      tabBrowse: '浏览',
      tabHistory: '历史',
      tabFavorites: '收藏',
      addressPlaceholder: '输入网址或搜索关键词',
      go: '前往',
      search: '搜索',
      back: '后退',
      forward: '前进',
      reload: '刷新',
      home: '主页',
      homeSettings: '浏览器设置',
      homepageLabel: '主页网址',
      homepagePlaceholder: 'https://example.com',
      homepageHint: '主页按钮会打开这个地址；也可以设置成面板打开时自动加载。',
      autoOpen: '打开浏览器时自动加载主页',
      searchEngine: '搜索引擎',
      searchEngineHint: '地址栏里不像网址的内容会用这个引擎搜索。',
      engineBing: 'Bing',
      engineBaidu: '百度',
      offlineNotice: '当前处于离线状态，网页和搜索需要联网。',
      useCurrent: '使用当前页',
      clearHome: '清除主页',
      save: '保存',
      cancel: '取消',
      close: '关闭',
      external: '在系统浏览器打开',
      star: '收藏当前页',
      unstar: '取消收藏',
      emptyTitle: '输入网址开始浏览',
      emptyHint: '拒绝嵌入的网站仍然可以用系统浏览器打开。',
      iframeHint: '直接打开图片网址时会尝试自动存入图片库（需站点允许跨域读取）。部分网站禁止嵌入（X-Frame-Options / CSP），可点 ↗ 外部打开。',
      historySearch: '搜索历史…',
      historyEmpty: '还没有网址记录',
      historyEmptyHint: '从地址栏、历史或收藏打开的网址都会记录在这里。',
      historyNote: '历史只覆盖本面板发起的导航；网页内部的跨域点击无法读取。',
      clear: '清空历史',
      clearConfirm: '确认清空？',
      visits: '{n} 次访问',
      open: '打开',
      delete: '删除',
      favoritesSearch: '搜索收藏…',
      favoritesEmpty: '还没有收藏',
      favoritesEmptyHint: '点地址栏旁的 ☆ 收藏当前页面。',
      addCurrent: '收藏当前页',
      removeCurrent: '取消收藏',
      noCurrent: '先打开一个网址再收藏。',
      invalidUrl: '请输入有效网址。',
      onlyHttp: '只允许 HTTP / HTTPS 地址。',
      credentials: '网址里带有用户名或密码，已拒绝。',
      selfUrl: '不能在这里嵌入 DSH 应用自身。',
      externalBlocked: '浏览器阻止了外部标签页，请允许弹窗后重试。',
      storageUnavailable: '浏览器存储不可用，历史和收藏无法保存。',
      saveFailed: '保存失败，请重试。',
      deleteFailed: '删除失败，请重试。',
      clearFailed: '清空失败，请重试。',
      localNote: '历史与收藏只保存在这台设备上。',
      imageSaving: '正在把这张图片存入图片库…',
      imageSaved: '已自动保存到图片库：{name}',
      imageDuplicate: '这张图片已在图片库中。',
      imageUnreadable: '图片已打开，但该站点不允许跨域读取，未能自动保存；可另存后到图片库手动添加。',
      imageTooLarge: '图片超过 {n}，未保存。',
      imageSaveFailed: '写入图片库失败。',
    };

    const CSS = `
.web-page { box-sizing: border-box; display: flex; flex-direction: column; gap: 12px; height: 100%; min-height: 0; overflow: hidden; padding: calc(var(--dsh-frame-top-clearance, 0px) + 24px) 28px 20px; color: var(--dsw-alias-label-primary); }
.web-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
.web-heading { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.web-title { margin: 0; font-size: 20px; line-height: 1.35; font-weight: 600; letter-spacing: -0.01em; }
.web-intro { margin: 0; font-size: 13px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
.web-badge { flex: none; padding: 3px 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 999px; font-size: 11px; color: var(--dsw-alias-brand-primary); }
.web-tabs { display: flex; gap: 4px; flex: none; padding: 4px; overflow-x: auto; border: 1px solid var(--dsw-alias-border-l1); border-radius: 11px; background: var(--dsw-alias-bg-layer-1); }
.web-tab { flex: none; height: 28px; padding: 0 12px; border: 0; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; line-height: 1; cursor: pointer; }
.web-tab:hover { color: var(--dsw-alias-label-primary); }
.web-tab-active { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font-weight: 600; }
.web-tab:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -2px; }
.web-error { margin: 0; padding: 8px 10px; border: 1px solid var(--dsw-alias-state-error-primary); border-radius: 9px; color: var(--dsw-alias-state-error-primary); font-size: 12px; line-height: 1.5; }
.web-panes { display: flex; flex: 1; min-height: 0; }
.web-pane { display: flex; flex: 1; flex-direction: column; gap: 8px; min-width: 0; min-height: 0; }
.web-toolbar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; flex: none; }
.web-btn { height: 32px; padding: 0 11px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 1; cursor: pointer; }
.web-btn:hover:not(:disabled) { border-color: var(--dsw-alias-label-secondary); }
.web-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.web-btn:disabled { opacity: 0.4; cursor: default; }
.web-icon { width: 32px; padding: 0; font-size: 14px; }
.web-btn-on { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.web-danger { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
.web-address { box-sizing: border-box; flex: 1; min-width: 180px; height: 32px; padding: 0 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; outline: none; }
.web-address:focus-visible { border-color: var(--dsw-alias-brand-primary); outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -2px; }
.web-hint { margin: 0; font-size: 11px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
.web-frame-wrap { display: flex; flex: 1; min-height: 0; overflow: hidden; border: 1px solid var(--dsw-alias-border-l1); border-radius: 14px; background: var(--dsw-alias-bg-layer-1); }
.web-frame { width: 100%; height: 100%; border: 0; background: var(--dsw-alias-bg-base); }
.web-empty { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 28px; text-align: center; }
.web-empty-title { font-size: 14px; font-weight: 600; }
.web-empty-hint { max-width: 440px; font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
.web-list-toolbar { display: flex; align-items: center; gap: 8px; flex: none; flex-wrap: wrap; }
.web-search { box-sizing: border-box; flex: 1; min-width: 180px; height: 32px; padding: 0 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; outline: none; }
.web-search:focus-visible { border-color: var(--dsw-alias-brand-primary); outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -2px; }
.web-list { display: flex; flex: 1; flex-direction: column; gap: 6px; margin: 0; padding: 0; overflow-y: auto; list-style: none; }
.web-row { display: flex; align-items: stretch; gap: 8px; flex: none; padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); }
.web-row-main { display: flex; flex: 1; flex-direction: column; gap: 2px; min-width: 0; padding: 2px; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.web-row-main:hover .web-row-title { color: var(--dsw-alias-brand-primary); }
.web-row-title { overflow: hidden; font-size: 13px; font-weight: 600; line-height: 1.4; white-space: nowrap; text-overflow: ellipsis; }
.web-row-url { overflow: hidden; font-size: 11px; color: var(--dsw-alias-label-secondary); white-space: nowrap; text-overflow: ellipsis; }
.web-meta { font-size: 11px; line-height: 1.4; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.web-row-actions { display: flex; align-items: center; gap: 6px; }
.web-empty-list { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 6px; border: 1px dashed var(--dsw-alias-border-l2); border-radius: 14px; background: var(--dsw-alias-bg-layer-1); text-align: center; }
.web-loading { margin: 0; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.web-notice { margin: 0; font-size: 11px; line-height: 1.5; color: var(--dsw-alias-brand-primary); }
.web-offline { margin: 0; padding: 8px 10px; border: 1px solid var(--dsw-alias-state-warn-primary); border-radius: 9px; color: var(--dsw-alias-state-warn-primary); font-size: 12px; line-height: 1.5; }
.web-primary { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.web-dialog { width: min(560px, calc(100vw - 48px)); max-width: none; max-height: calc(100vh - 64px); margin: auto; padding: 0; overflow: hidden; border: 1px solid var(--dsw-alias-border-l1); border-radius: 16px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }
.web-dialog[open] { display: flex; flex-direction: column; }
.web-dialog::backdrop { background: rgba(0, 0, 0, 0.55); }
.web-dialog-head { display: flex; align-items: center; gap: 12px; padding: 12px 12px 12px 18px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.web-dialog-title { flex: 1; margin: 0; font-size: 14px; font-weight: 600; }
.web-dialog-body { display: flex; flex: 1; flex-direction: column; gap: 10px; min-height: 0; padding: 16px 18px; overflow-y: auto; }
.web-dialog-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 12px 18px; border-top: 1px solid var(--dsw-alias-border-l1); }
.web-dialog-foot-right { display: flex; gap: 8px; margin-left: auto; }
.web-field-label { font-size: 12px; font-weight: 600; }
.web-check { display: flex; align-items: center; gap: 8px; font-size: 12px; line-height: 1.5; cursor: pointer; }
.web-dialog-error { margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-state-error-primary); }
.web-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 18px; line-height: 1; cursor: pointer; }
.web-icon-btn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.web-icon-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
@media (max-width: 720px) { .web-page { padding-left: 18px; padding-right: 18px; } .web-head { flex-direction: column; align-items: flex-start; } .web-row { flex-direction: column; } }
`;

    /** Render the sidebar glyph at the size the sidebar asks for. */
    function BrowserPanelIcon({ size }) {
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          focusable: 'false',
        },
        h('circle', { cx: 12, cy: 12, r: 8.5 }),
        h('ellipse', { cx: 12, cy: 12, rx: 3.8, ry: 8.5 }),
        h('path', { d: 'M3.5 12h17' }),
      );
    }

    /** Host shown as the human title for a URL. */
    function hostOf(value) {
      try {
        return new URL(value).host;
      } catch {
        return value;
      }
    }

    /** Validate and normalize one address bar value or bookmark URL. */
    function normalizeAddress(value) {
      const text = String(value ?? '').trim();
      if (!text) return { error: 'invalidUrl' };
      const hasAuthority = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(text);
      const hostPort = /^[^/?#\s:]+:\d+(?:[/?#]|$)/.test(text);
      const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(text);
      const candidate = hasAuthority || (hasScheme && !hostPort) ? text : `https://${text}`;
      let parsed;
      try {
        parsed = new URL(candidate);
      } catch {
        return { error: 'invalidUrl' };
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return { error: 'onlyHttp' };
      if (parsed.username || parsed.password) return { error: 'credentials' };
      if (parsed.origin === window.location.origin) return { error: 'selfUrl' };
      return { url: parsed.href };
    }

    /** Whether address-bar input should be treated as a URL instead of a query. */
    function looksLikeUrlInput(value) {
      const text = String(value ?? '').trim();
      if (!text || /\s/.test(text)) return false;
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(text)) return true;
      if (/^localhost(?::\d+)?(?:[/?#].*)?$/i.test(text)) return true;
      if (/^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:[/?#].*)?$/.test(text)) return true;
      if (/^[^/?#\s:]+:\d+(?:[/?#]|$)/.test(text)) return true;
      return /^[^/?#@:\s]+\.[a-zA-Z]{2,}(?:[/?#].*)?$/.test(text);
    }

    /** Resolve address-bar input to a URL or a search-results URL. */
    function resolveInput(value, engine) {
      const text = String(value ?? '').trim();
      if (!text) return { error: 'invalidUrl' };
      if (looksLikeUrlInput(text)) return normalizeAddress(text);
      const base = SEARCH_ENGINES[engine] ?? SEARCH_ENGINES.bing;
      return { url: base + encodeURIComponent(text) };
    }

    /** Read the stored homepage preference, normalizing a stale URL. */
    function readHomeSettings() {
      try {
        const raw = window.localStorage.getItem(HOME_KEY);
        if (!raw) return { homepage: '', autoOpen: true, searchEngine: 'bing' };
        const parsed = JSON.parse(raw);
        const stored = typeof parsed.homepage === 'string' ? parsed.homepage : '';
        const normalized = stored ? normalizeAddress(stored) : null;
        return {
          homepage: normalized?.url ?? '',
          autoOpen: parsed.autoOpen !== false,
          searchEngine: parsed.searchEngine === 'baidu' ? 'baidu' : 'bing',
        };
      } catch {
        return { homepage: '', autoOpen: true, searchEngine: 'bing' };
      }
    }

    /** Persist the homepage preference; returns false when storage rejects it. */
    function writeHomeSettings(value) {
      try {
        window.localStorage.setItem(HOME_KEY, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }

    /** Compact byte count for the auto-save notice. */
    function formatBytes(bytes) {
      if (!bytes) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB'];
      const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
      const value = bytes / 1024 ** exponent;
      return `${exponent === 0 || value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
    }

    /** Stable id for an image record written into the Gallery store. */
    function newImageId() {
      try {
        return window.crypto.randomUUID();
      } catch {
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      }
    }

    /** Whether a URL path explicitly names an image. */
    function looksLikeImageUrl(value) {
      try {
        return IMAGE_EXT_RE.test(new URL(value).pathname);
      } catch {
        return false;
      }
    }

    /** A display name for an auto-saved image, derived from its URL. */
    function imageNameFromUrl(value, type) {
      const extension = (type || '').split('/')[1]?.split('+')[0] || 'img';
      try {
        const base = decodeURIComponent(new URL(value).pathname.split('/').pop() || '').trim();
        if (base) {
          const safe = base.slice(0, 120);
          return /\.[a-z0-9]{1,6}$/i.test(safe) ? safe : `${safe}.${extension}`;
        }
      } catch {
        /* fall through */
      }
      return `image-${Date.now()}.${extension}`;
    }

    /** Open the Gallery's IndexedDB contract. */
    function openGalleryDb() {
      return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
          reject(new Error('indexeddb-unavailable'));
          return;
        }
        const request = window.indexedDB.open(GALLERY_DB);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(GALLERY_STORE)) {
            db.createObjectStore(GALLERY_STORE, { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('gallery-open-failed'));
      });
    }

    /**
     * Write one image into the Gallery store, skipping obvious duplicates.
     * @returns 'saved' | 'duplicate'
     */
    function saveImageToGallery(url, blob, type) {
      const name = imageNameFromUrl(url, type);
      return openGalleryDb().then(
        (db) =>
          new Promise((resolve, reject) => {
            const transaction = db.transaction(GALLERY_STORE, 'readwrite');
            const store = transaction.objectStore(GALLERY_STORE);
            let outcome = 'duplicate';
            const listRequest = store.getAll();
            listRequest.onsuccess = () => {
              const records = listRequest.result ?? [];
              const duplicate = records.some(
                (record) => record.sourceUrl === url || (record.name === name && record.size === blob.size),
              );
              if (duplicate) return;
              store.put({
                id: newImageId(),
                name,
                type,
                size: blob.size,
                addedAt: Date.now(),
                fingerprint: `auto|${url}|${blob.size}`,
                sourceUrl: url,
                blob,
              });
              outcome = 'saved';
            };
            transaction.oncomplete = () => {
              db.close();
              resolve(outcome);
            };
            transaction.onerror = () => {
              db.close();
              reject(transaction.error ?? new Error('gallery-write-failed'));
            };
            transaction.onabort = () => {
              db.close();
              reject(transaction.error ?? new Error('gallery-write-aborted'));
            };
          }),
      );
    }

    /** Open IndexedDB, creating both stores on first use. */
    function openDb() {
      return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
          reject(new Error('indexeddb-unavailable'));
          return;
        }
        const request = window.indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          for (const store of [HISTORY_STORE, BOOKMARKS_STORE]) {
            if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'url' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('indexeddb-open-failed'));
      });
    }

    /** Run one object-store request and settle with the transaction outcome. */
    function withStore(storeName, mode, action) {
      return openDb().then(
        (db) =>
          new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, mode);
            let result;
            let request;
            try {
              request = action(transaction.objectStore(storeName));
            } catch (error) {
              db.close();
              reject(error);
              return;
            }
            request.onsuccess = () => {
              result = request.result;
            };
            transaction.oncomplete = () => {
              db.close();
              resolve(result);
            };
            transaction.onerror = () => {
              db.close();
              reject(transaction.error ?? new Error('indexeddb-transaction-failed'));
            };
            transaction.onabort = () => {
              db.close();
              reject(transaction.error ?? new Error('indexeddb-transaction-aborted'));
            };
          }),
      );
    }

    const listAll = (store) => withStore(store, 'readonly', (objectStore) => objectStore.getAll());
    const putItem = (store, record) => withStore(store, 'readwrite', (objectStore) => objectStore.put(record));
    const removeItem = (store, url) => withStore(store, 'readwrite', (objectStore) => objectStore.delete(url));

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'web-browser: dictionaries');
        const t = ctx.locale.bind(NS);

        /** Format a timestamp in the active locale. */
        function formatDate(ms) {
          try {
            return new Intl.DateTimeFormat(ctx.locale.getLocale().active, {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }).format(new Date(ms));
          } catch {
            return new Date(ms).toLocaleString();
          }
        }

        /** The browser page opened by the sidebar entry. */
        function BrowserPage() {
          const [view, setView] = useState('browse');
          const [currentUrl, setCurrentUrl] = useState('');
          const [address, setAddress] = useState('');
          const [frameToken, setFrameToken] = useState(0);
          const [stack, setStack] = useState([]);
          const [stackIndex, setStackIndex] = useState(-1);
          const [history, setHistory] = useState([]);
          const [bookmarks, setBookmarks] = useState([]);
          const [historyQuery, setHistoryQuery] = useState('');
          const [favoriteQuery, setFavoriteQuery] = useState('');
          const [clearArmed, setClearArmed] = useState(false);
          const [loading, setLoading] = useState(true);
          const [error, setError] = useState('');
          const [imageNotice, setImageNotice] = useState('');
          const [homeSettings, setHomeSettings] = useState(readHomeSettings);
          const [settingsOpen, setSettingsOpen] = useState(false);
          const [draftHome, setDraftHome] = useState(homeSettings.homepage);
          const [draftAuto, setDraftAuto] = useState(homeSettings.autoOpen);
          const [draftEngine, setDraftEngine] = useState(homeSettings.searchEngine);
          const [settingsError, setSettingsError] = useState('');
          const [online, setOnline] = useState(() => navigator.onLine !== false);
          const stackRef = useRef([]);
          const indexRef = useRef(-1);
          const settingsDialogRef = useRef(null);
          const startupChecked = useRef(false);

          useEffect(() => {
            let cancelled = false;
            Promise.all([listAll(HISTORY_STORE), listAll(BOOKMARKS_STORE)])
              .then(([storedHistory, storedBookmarks]) => {
                if (cancelled) return;
                setHistory(storedHistory.slice().sort((a, b) => b.lastVisit - a.lastVisit));
                setBookmarks(storedBookmarks.slice().sort((a, b) => b.createdAt - a.createdAt));
                setLoading(false);
              })
              .catch(() => {
                if (cancelled) return;
                setError(t('storageUnavailable'));
                setLoading(false);
              });
            return () => {
              cancelled = true;
            };
          }, []);

          useEffect(() => {
            if (!clearArmed) return undefined;
            const timer = window.setTimeout(() => setClearArmed(false), 4000);
            return () => window.clearTimeout(timer);
          }, [clearArmed]);

          useEffect(() => {
            const goOnline = () => setOnline(true);
            const goOffline = () => setOnline(false);
            window.addEventListener('online', goOnline);
            window.addEventListener('offline', goOffline);
            return () => {
              window.removeEventListener('online', goOnline);
              window.removeEventListener('offline', goOffline);
            };
          }, []);

          useEffect(() => {
            const dialog = settingsDialogRef.current;
            if (!dialog) return;
            if (settingsOpen) {
              if (!dialog.open) dialog.showModal();
            } else if (dialog.open) {
              dialog.close();
            }
          }, [settingsOpen]);

          // Open the homepage once, after local data has settled. Later settings
          // changes apply to the home button only.
          useEffect(() => {
            if (loading || startupChecked.current) return;
            startupChecked.current = true;
            if (!homeSettings.homepage || !homeSettings.autoOpen) return;
            go(homeSettings.homepage, true);
          }, [loading, homeSettings]);

          const historyEntries = history.filter((item) => {
            const query = historyQuery.trim().toLowerCase();
            if (!query) return true;
            return item.url.toLowerCase().includes(query) || item.host.toLowerCase().includes(query);
          });
          const favoriteEntries = bookmarks.filter((item) => {
            const query = favoriteQuery.trim().toLowerCase();
            if (!query) return true;
            return item.url.toLowerCase().includes(query) || item.title.toLowerCase().includes(query);
          });
          const bookmarked = Boolean(currentUrl && bookmarks.some((item) => item.url === currentUrl));
          const willSearch = Boolean(address.trim()) && !looksLikeUrlInput(address);

          const recordVisit = async (url) => {
            const previous = history.find((item) => item.url === url);
            const entry = {
              url,
              host: hostOf(url),
              lastVisit: Date.now(),
              visits: (previous?.visits ?? 0) + 1,
            };
            try {
              await putItem(HISTORY_STORE, entry);
              const next = [entry, ...history.filter((item) => item.url !== url)].sort(
                (a, b) => b.lastVisit - a.lastVisit,
              );
              const overflow = next.slice(HISTORY_LIMIT);
              setHistory(next.slice(0, HISTORY_LIMIT));
              for (const old of overflow) await removeItem(HISTORY_STORE, old.url);
              setError('');
            } catch {
              setError(t('saveFailed'));
            }
          };

          const commit = (url) => {
            setCurrentUrl(url);
            setAddress(url);
            setFrameToken((token) => token + 1);
            setView('browse');
            void autoSaveImage(url);
          };

          const autoSaveImage = async (url) => {
            if (!looksLikeImageUrl(url)) {
              setImageNotice('');
              return;
            }
            setImageNotice(t('imageSaving'));
            try {
              const response = await fetch(url, {
                mode: 'cors',
                credentials: 'omit',
                referrerPolicy: 'no-referrer',
              });
              if (!response.ok) {
                setImageNotice(t('imageUnreadable'));
                return;
              }
              const type = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
              if (!type.startsWith('image/')) {
                setImageNotice(t('imageUnreadable'));
                return;
              }
              const blob = await response.blob();
              if (blob.size > MAX_IMAGE_BYTES) {
                setImageNotice(t('imageTooLarge').replace('{n}', formatBytes(MAX_IMAGE_BYTES)));
                return;
              }
              const outcome = await saveImageToGallery(url, blob, type);
              if (outcome === 'saved') {
                setImageNotice(t('imageSaved').replace('{name}', imageNameFromUrl(url, type)));
              } else if (outcome === 'duplicate') {
                setImageNotice(t('imageDuplicate'));
              } else {
                setImageNotice(t('imageSaveFailed'));
              }
            } catch {
              setImageNotice(t('imageUnreadable'));
            }
          };

          const go = (url, push) => {
            if (push) {
              const next = [...stackRef.current.slice(0, indexRef.current + 1), url];
              stackRef.current = next;
              indexRef.current = next.length - 1;
              setStack(next);
              setStackIndex(indexRef.current);
            }
            commit(url);
            void recordVisit(url);
          };

          const back = () => {
            if (indexRef.current <= 0) return;
            indexRef.current -= 1;
            const url = stackRef.current[indexRef.current];
            setStackIndex(indexRef.current);
            commit(url);
            void recordVisit(url);
          };

          const forward = () => {
            if (indexRef.current >= stackRef.current.length - 1) return;
            indexRef.current += 1;
            const url = stackRef.current[indexRef.current];
            setStackIndex(indexRef.current);
            commit(url);
            void recordVisit(url);
          };

          const submitAddress = (event) => {
            event.preventDefault();
            const result = resolveInput(address, homeSettings.searchEngine);
            if (result.error) {
              setError(t(result.error));
              return;
            }
            setError('');
            go(result.url, true);
          };

          const openExternal = () => {
            if (!currentUrl) return;
            const opened = window.open(currentUrl, '_blank');
            if (opened) opened.opener = null;
            else setError(t('externalBlocked'));
          };

          const openSettings = () => {
            setDraftHome(homeSettings.homepage);
            setDraftAuto(homeSettings.autoOpen);
            setDraftEngine(homeSettings.searchEngine);
            setSettingsError('');
            setSettingsOpen(true);
          };

          const saveHomepage = () => {
            const trimmed = draftHome.trim();
            let normalized = '';
            if (trimmed) {
              const result = normalizeAddress(trimmed);
              if (result.error) {
                setSettingsError(t(result.error));
                return;
              }
              normalized = result.url;
            }
            const next = { homepage: normalized, autoOpen: draftAuto, searchEngine: draftEngine };
            if (!writeHomeSettings(next)) {
              setSettingsError(t('saveFailed'));
              return;
            }
            setHomeSettings(next);
            setSettingsError('');
            setSettingsOpen(false);
          };

          const clearHomepage = () => {
            const next = { homepage: '', autoOpen: draftAuto, searchEngine: draftEngine };
            if (!writeHomeSettings(next)) {
              setSettingsError(t('saveFailed'));
              return;
            }
            setHomeSettings(next);
            setDraftHome('');
            setSettingsError('');
            setSettingsOpen(false);
          };

          const openHomepage = () => {
            if (homeSettings.homepage) go(homeSettings.homepage, true);
            else openSettings();
          };

          const toggleBookmark = async () => {
            if (!currentUrl) {
              setError(t('noCurrent'));
              return;
            }
            const existing = bookmarks.find((item) => item.url === currentUrl);
            try {
              if (existing) {
                await removeItem(BOOKMARKS_STORE, currentUrl);
                setBookmarks((current) => current.filter((item) => item.url !== currentUrl));
              } else {
                const entry = { url: currentUrl, title: hostOf(currentUrl), createdAt: Date.now() };
                await putItem(BOOKMARKS_STORE, entry);
                setBookmarks((current) => [entry, ...current].sort((a, b) => b.createdAt - a.createdAt));
              }
              setError('');
            } catch {
              setError(t('saveFailed'));
            }
          };

          const deleteBookmark = async (url) => {
            try {
              await removeItem(BOOKMARKS_STORE, url);
              setBookmarks((current) => current.filter((item) => item.url !== url));
            } catch {
              setError(t('deleteFailed'));
            }
          };

          const deleteHistory = async (url) => {
            try {
              await removeItem(HISTORY_STORE, url);
              setHistory((current) => current.filter((item) => item.url !== url));
            } catch {
              setError(t('deleteFailed'));
            }
          };

          const clearHistory = async () => {
            try {
              for (const item of history) await removeItem(HISTORY_STORE, item.url);
              setHistory([]);
              setClearArmed(false);
              setError('');
            } catch {
              setError(t('clearFailed'));
            }
          };

          const empty = (title, hint) =>
            h(
              'div',
              { className: 'web-empty-list' },
              h('span', { className: 'web-empty-title' }, title),
              h('span', { className: 'web-empty-hint' }, hint),
            );

          return h(
            'div',
            { className: 'web-page' },
            h('style', { key: 'styles' }, CSS),
            h(
              'header',
              { className: 'web-head', 'data-window-drag': true },
              h(
                'div',
                { className: 'web-heading' },
                h('h1', { className: 'web-title' }, t('title')),
                h('p', { className: 'web-intro' }, t('intro')),
              ),
              h('span', { className: 'web-badge' }, t('badge')),
            ),
            error ? h('p', { className: 'web-error', role: 'alert' }, error) : null,
            !online ? h('p', { className: 'web-offline', role: 'status' }, t('offlineNotice')) : null,
            h(
              'nav',
              { className: 'web-tabs', role: 'tablist', 'aria-label': t('title') },
              [
                ['browse', t('tabBrowse')],
                ['history', `${t('tabHistory')} · ${history.length}`],
                ['favorites', `${t('tabFavorites')} · ${bookmarks.length}`],
              ].map(([id, label]) =>
                h(
                  'button',
                  {
                    key: id,
                    type: 'button',
                    role: 'tab',
                    'aria-selected': view === id,
                    className: `web-tab${view === id ? ' web-tab-active' : ''}`,
                    onClick: () => setView(id),
                  },
                  label,
                ),
              ),
            ),
            loading ? h('p', { className: 'web-loading', role: 'status' }, t('loading')) : null,
            h(
              'div',
              { className: 'web-panes' },
              h(
                'div',
                { className: 'web-pane', style: { display: view === 'browse' ? 'flex' : 'none' } },
                h(
                  'form',
                  { className: 'web-toolbar', onSubmit: submitAddress },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'web-btn web-icon',
                      title: t('back'),
                      'aria-label': t('back'),
                      disabled: stackIndex <= 0,
                      onClick: back,
                    },
                    '←',
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'web-btn web-icon',
                      title: t('forward'),
                      'aria-label': t('forward'),
                      disabled: stackIndex >= stack.length - 1,
                      onClick: forward,
                    },
                    '→',
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'web-btn web-icon',
                      title: t('reload'),
                      'aria-label': t('reload'),
                      disabled: !currentUrl,
                      onClick: () => setFrameToken((token) => token + 1),
                    },
                    '⟳',
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: `web-btn web-icon${homeSettings.homepage ? ' web-btn-on' : ''}`,
                      title: t('home'),
                      'aria-label': t('home'),
                      onClick: openHomepage,
                    },
                    '⌂',
                  ),
                  h('input', {
                    className: 'web-address',
                    value: address,
                    placeholder: t('addressPlaceholder'),
                    'aria-label': t('addressPlaceholder'),
                    onChange: (event) => setAddress(event.target.value),
                  }),
                  h('button', { type: 'submit', className: 'web-btn' }, willSearch ? t('search') : t('go')),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: `web-btn web-icon${bookmarked ? ' web-btn-on' : ''}`,
                      title: bookmarked ? t('unstar') : t('star'),
                      'aria-label': bookmarked ? t('unstar') : t('star'),
                      'aria-pressed': bookmarked,
                      disabled: !currentUrl,
                      onClick: () => void toggleBookmark(),
                    },
                    bookmarked ? '★' : '☆',
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'web-btn web-icon',
                      title: t('homeSettings'),
                      'aria-label': t('homeSettings'),
                      onClick: openSettings,
                    },
                    '⚙',
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'web-btn web-icon',
                      title: t('external'),
                      'aria-label': t('external'),
                      disabled: !currentUrl,
                      onClick: openExternal,
                    },
                    '↗',
                  ),
                ),
                h('p', { className: 'web-hint' }, t('iframeHint')),
                imageNotice ? h('p', { className: 'web-notice', role: 'status' }, imageNotice) : null,
                h(
                  'div',
                  { className: 'web-frame-wrap' },
                  currentUrl
                    ? h('iframe', {
                        key: frameToken,
                        className: 'web-frame',
                        src: currentUrl,
                        title: hostOf(currentUrl),
                        sandbox:
                          'allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox',
                        referrerPolicy: 'no-referrer',
                      })
                    : h(
                        'div',
                        { className: 'web-empty' },
                        h('span', { className: 'web-empty-title' }, t('emptyTitle')),
                        h('span', { className: 'web-empty-hint' }, t('emptyHint')),
                      ),
                ),
              ),
              h(
                'div',
                { className: 'web-pane', style: { display: view === 'history' ? 'flex' : 'none' } },
                h(
                  'div',
                  { className: 'web-list-toolbar' },
                  h('input', {
                    className: 'web-search',
                    type: 'search',
                    value: historyQuery,
                    placeholder: t('historySearch'),
                    'aria-label': t('historySearch'),
                    onChange: (event) => setHistoryQuery(event.target.value),
                  }),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'web-btn web-danger',
                      disabled: history.length === 0,
                      onClick: () => (clearArmed ? void clearHistory() : setClearArmed(true)),
                    },
                    clearArmed ? t('clearConfirm') : t('clear'),
                  ),
                ),
                h('p', { className: 'web-hint' }, t('historyNote')),
                historyEntries.length === 0
                  ? empty(t('historyEmpty'), t('historyEmptyHint'))
                  : h(
                      'ul',
                      { className: 'web-list' },
                      historyEntries.map((item) =>
                        h(
                          'li',
                          { key: item.url, className: 'web-row' },
                          h(
                            'button',
                            { type: 'button', className: 'web-row-main', onClick: () => go(item.url, true) },
                            h('span', { className: 'web-row-title' }, item.host),
                            h('span', { className: 'web-row-url' }, item.url),
                            h(
                              'span',
                              { className: 'web-meta' },
                              `${formatDate(item.lastVisit)} · ${t('visits').replace('{n}', String(item.visits))}`,
                            ),
                          ),
                          h(
                            'div',
                            { className: 'web-row-actions' },
                            h(
                              'button',
                              { type: 'button', className: 'web-btn web-danger', onClick: () => void deleteHistory(item.url) },
                              t('delete'),
                            ),
                          ),
                        ),
                      ),
                    ),
              ),
              h(
                'div',
                { className: 'web-pane', style: { display: view === 'favorites' ? 'flex' : 'none' } },
                h(
                  'div',
                  { className: 'web-list-toolbar' },
                  h('input', {
                    className: 'web-search',
                    type: 'search',
                    value: favoriteQuery,
                    placeholder: t('favoritesSearch'),
                    'aria-label': t('favoritesSearch'),
                    onChange: (event) => setFavoriteQuery(event.target.value),
                  }),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: `web-btn${bookmarked ? ' web-btn-on' : ''}`,
                      disabled: !currentUrl,
                      onClick: () => void toggleBookmark(),
                    },
                    bookmarked ? t('removeCurrent') : t('addCurrent'),
                  ),
                ),
                favoriteEntries.length === 0
                  ? empty(t('favoritesEmpty'), t('favoritesEmptyHint'))
                  : h(
                      'ul',
                      { className: 'web-list' },
                      favoriteEntries.map((item) =>
                        h(
                          'li',
                          { key: item.url, className: 'web-row' },
                          h(
                            'button',
                            { type: 'button', className: 'web-row-main', onClick: () => go(item.url, true) },
                            h('span', { className: 'web-row-title' }, item.title || item.url),
                            h('span', { className: 'web-row-url' }, item.url),
                            h('span', { className: 'web-meta' }, formatDate(item.createdAt)),
                          ),
                          h(
                            'div',
                            { className: 'web-row-actions' },
                            h(
                              'button',
                              {
                                type: 'button',
                                className: 'web-btn web-danger',
                                onClick: () => void deleteBookmark(item.url),
                              },
                              t('delete'),
                            ),
                          ),
                        ),
                      ),
                    ),
              ),
            ),              
            h(
              'dialog',
              {
                ref: settingsDialogRef,
                className: 'web-dialog',
                'aria-label': t('homeSettings'),
                onClose: () => setSettingsOpen(false),
                onClick: (event) => {
                  if (event.target === settingsDialogRef.current) event.currentTarget.close();
                },
              },
              settingsOpen
                ? h(
                    React.Fragment,
                    null,
                    h(
                      'div',
                      { className: 'web-dialog-head' },
                      h('h2', { className: 'web-dialog-title' }, t('homeSettings')),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'web-icon-btn',
                          'aria-label': t('close'),
                          onClick: () => settingsDialogRef.current?.close(),
                        },
                        '\u00d7',
                      ),
                    ),
                    h(
                      'div',
                      { className: 'web-dialog-body' },
                      h('label', { className: 'web-field-label' }, t('homepageLabel')),
                      h('input', {
                        className: 'web-address',
                        style: { width: '100%' },
                        value: draftHome,
                        placeholder: t('homepagePlaceholder'),
                        autoFocus: true,
                        onChange: (event) => {
                          setDraftHome(event.target.value);
                          setSettingsError('');
                        },
                        onKeyDown: (event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            saveHomepage();
                          }
                        },
                      }),
                      h('p', { className: 'web-hint' }, t('homepageHint')),
                      h(
                        'label',
                        { className: 'web-check' },
                        h('input', {
                          type: 'checkbox',
                          checked: draftAuto,
                          onChange: (event) => setDraftAuto(event.target.checked),
                        }),
                        h('span', null, t('autoOpen')),
                      ),
                      h('label', { className: 'web-field-label' }, t('searchEngine')),
                      h(
                        'select',
                        {
                          className: 'web-address',
                          style: { width: '100%' },
                          value: draftEngine,
                          onChange: (event) => setDraftEngine(event.target.value),
                        },
                        h('option', { value: 'bing' }, t('engineBing')),
                        h('option', { value: 'baidu' }, t('engineBaidu')),
                      ),
                      h('p', { className: 'web-hint' }, t('searchEngineHint')),
                      settingsError ? h('p', { className: 'web-dialog-error', role: 'alert' }, settingsError) : null,
                    ),
                    h(
                      'div',
                      { className: 'web-dialog-foot' },
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'web-btn web-danger',
                          disabled: !homeSettings.homepage && !draftHome.trim(),
                          onClick: clearHomepage,
                        },
                        t('clearHome'),
                      ),
                      h(
                        'div',
                        { className: 'web-dialog-foot-right' },
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'web-btn',
                            disabled: !currentUrl,
                            onClick: () => {
                              if (!currentUrl) return;
                              setDraftHome(currentUrl);
                              setSettingsError('');
                            },
                          },
                          t('useCurrent'),
                        ),
                        h('button', { type: 'button', className: 'web-btn', onClick: () => setSettingsOpen(false) }, t('cancel')),
                        h('button', { type: 'button', className: 'web-btn web-primary', onClick: saveHomepage }, t('save')),
                      ),
                    ),
                  )
                : null,
            ),
            h('p', { className: 'web-hint' }, t('localNote')),
          );
        }

        ctx.slots.inject('main', () =>
          ctx.slots.register(
            {
              name: 'main',
              key: PANEL_ID,
              locale: NS,
            },
            BrowserPage,
          ),
        );

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 50,
              label: () => t('panel'),
              locale: NS,
            },
            BrowserPanelIcon,
          ),
        );
      },
    };
  },
});
