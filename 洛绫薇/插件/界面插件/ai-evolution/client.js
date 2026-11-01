/**
 * Client half of the AI Infinite Evolution 1.0 bundle.
 *
 * One left-sidebar entry (`sidebar.panellist`) and the workbench page it opens
 * (`main`). Memories, books and analysis all stay in this browser: memories and
 * books live in IndexedDB, text understanding is local heuristics, and nothing
 * is uploaded.
 */
window.__ModuleLoader__.load({
  id: '@local/ai-evolution',
  factory(require) {
    const React = require('react');
    const { createElement: h, useState, useEffect, useRef } = React;

    /** Dictionary namespace owned by this plugin. */
    const NS = 'localEvolution';
    /** The id shared by the sidebar entry and the main panel it opens. */
    const PANEL_ID = 'evolution';
    /** Browser-local database and stores. */
    const DB_NAME = 'dsh.local.ai-evolution.v1';
    const STORE_MEMORY = 'memory';
    const STORE_BOOKS = 'books';
    /** Cache behaviour and input limits. */
    const MEMORY_LIMIT = 80;
    const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
    const MAX_ANALYSIS_CHARS = 120000;
    const TAB_IDS = ['memory', 'books', 'understand'];

    const en = {
      panel: 'Evolution',
      title: 'AI Infinite Evolution 1.0',
      intro: 'A local cache for memories, a shelf for text books, heuristic understanding, and text read/write.',
      badge: 'Local · v1.0',
      tabMemory: 'Memory',
      tabBooks: 'Books',
      tabUnderstand: 'Understand',
      loading: 'Reading local data…',
      memoryHint: 'Memory cache: up to {n} entries; the oldest is evicted when the cap is exceeded.',
      memoryTitle: 'Title (optional)',
      memoryPlaceholder: 'Write down something worth remembering…',
      memoryAdd: 'Save to memory',
      memorySearch: 'Search memories…',
      memoryEmpty: 'No memories yet',
      memoryEmptyHint: 'Write something above, or save a summary from Understand.',
      memoryCount: '{n} memories',
      memoryDialog: 'Edit memory',
      memorySaved: 'Saved to memory',
      memoryUpdated: 'Memory updated',
      memoryDeleted: 'Memory deleted',
      memoryAnalyze: 'Understand',
      booksHint: 'Bookshelf: .txt / .md, read as UTF-8, up to {n} per book.',
      bookImport: 'Import books',
      bookNew: 'New book',
      bookSearch: 'Search books…',
      bookEmpty: 'The bookshelf is empty',
      bookEmptyHint: 'Import a .txt / .md file, or start a new book.',
      bookCount: '{n} books',
      bookUntitled: 'Untitled book',
      bookTitle: 'Title',
      bookTextPlaceholder: 'Write the text here…',
      bookSave: 'Save',
      bookSaved: 'Saved',
      bookExport: 'Export',
      bookDelete: 'Delete',
      bookBack: 'Back to bookshelf',
      bookAnalyze: 'Understand this text',
      bookChars: '{n} characters',
      bookUpdated: 'Updated {time}',
      bookImported: 'Imported {n} book(s)',
      bookSkipped: '{n} file(s) skipped: only .txt / .md up to 8 MB are supported.',
      bookDeleted: 'Book deleted',
      bookRequired: 'Write some text before saving.',
      bookUnsaved: 'Unsaved changes',
      understandIntro: 'Local heuristics: segmentation, word frequency and sentence weights. No model call, and text never leaves this device.',
      understandSource: 'Source',
      understandCustom: 'Custom text',
      understandPlaceholder: 'Paste text, or pick a book or memory above…',
      understandRun: 'Understand',
      understandRunning: 'Analyzing…',
      understandEmpty: 'No analysis yet',
      understandEmptyHint: 'Enter text and press Understand; the result can be saved back into memory.',
      statChars: 'Characters',
      statNonSpace: 'Non-space',
      statWords: 'Words',
      statUnique: 'Unique words',
      statSentences: 'Sentences',
      statParagraphs: 'Paragraphs',
      statReading: 'Reading time',
      statLanguage: 'Language',
      statDensity: 'Lexical density',
      readingMinutes: '~{n} min',
      langZh: 'Mostly Chinese',
      langEn: 'Mostly English',
      langMixed: 'Mixed',
      langUnknown: 'Unknown',
      keywordsTitle: 'Keywords',
      keywordsEmpty: 'No keywords extracted (text too short or all stop words).',
      summaryTitle: 'Extractive summary',
      summaryEmpty: 'No summary generated.',
      summaryHint: 'Sentences ranked by keyword weight, kept in original order.',
      saveSummary: 'Save summary to memory',
      exportReport: 'Export report',
      reportTitle: 'Understanding report',
      reportSource: 'Source',
      reportGenerated: 'Generated',
      reportStats: 'Statistics',
      reportKeywords: 'Keywords',
      reportSummary: 'Summary',
      storedSummary: 'Summary saved to memory',
      exported: 'File exported',
      truncatedNote: 'Text exceeds {n} characters; only the first {n} are analyzed.',
      analyzeFailed: 'Analysis failed. Try again.',
      storageUnavailable: 'Browser storage is unavailable; data cannot be saved.',
      saveFailed: 'Could not save. Try again.',
      deleteFailed: 'Could not delete. Try again.',
      confirmTitle: 'Confirm delete',
      confirmMemory: 'Delete this memory? This cannot be undone.',
      confirmBook: 'Delete “{title}”? This cannot be undone.',
      discardTitle: 'Discard changes',
      discardMessage: 'Discard the unsaved changes to this book?',
      discard: 'Discard',
      cancel: 'Cancel',
      close: 'Close',
      delete: 'Delete',
    };

    const zh = {
      panel: '进化',
      title: '项目人工智能无限进化版 1.0',
      intro: '缓存记忆、收纳文字书籍、本地理解文字，并支持读写文本。',
      badge: '本地 · v1.0',
      tabMemory: '记忆',
      tabBooks: '书架',
      tabUnderstand: '理解',
      loading: '正在读取本机数据…',
      memoryHint: '缓存记忆区：上限 {n} 条，超出后自动淘汰最旧的一条。',
      memoryTitle: '标题（可选）',
      memoryPlaceholder: '写下一段值得记住的文字…',
      memoryAdd: '存入记忆',
      memorySearch: '搜索记忆…',
      memoryEmpty: '记忆区还是空的',
      memoryEmptyHint: '在上方写一段文字，或从「理解」把摘要存进来。',
      memoryCount: '{n} 条记忆',
      memoryDialog: '编辑记忆',
      memorySaved: '已存入记忆',
      memoryUpdated: '记忆已更新',
      memoryDeleted: '记忆已删除',
      memoryAnalyze: '理解',
      booksHint: '书籍收纳区：支持 .txt / .md，按 UTF-8 读取，单本上限 {n}。',
      bookImport: '导入书籍',
      bookNew: '新建书籍',
      bookSearch: '搜索书架…',
      bookEmpty: '书架还是空的',
      bookEmptyHint: '导入 .txt / .md，或新建一本书开始写。',
      bookCount: '{n} 本书',
      bookUntitled: '未命名书籍',
      bookTitle: '书名',
      bookTextPlaceholder: '在这里写正文…',
      bookSave: '保存',
      bookSaved: '已保存',
      bookExport: '导出',
      bookDelete: '删除',
      bookBack: '返回书架',
      bookAnalyze: '理解这段文字',
      bookChars: '{n} 字符',
      bookUpdated: '更新于 {time}',
      bookImported: '已导入 {n} 本书',
      bookSkipped: '已跳过 {n} 个文件：只支持不超过 8 MB 的 .txt / .md。',
      bookDeleted: '书籍已删除',
      bookRequired: '请先写一点内容再保存。',
      bookUnsaved: '有未保存的修改',
      understandIntro: '本地启发式分析：分词、词频与句子权重；不调用模型，文本不离开本机。',
      understandSource: '来源',
      understandCustom: '自定义文本',
      understandPlaceholder: '粘贴一段文字，或从上方选择书籍 / 记忆…',
      understandRun: '开始理解',
      understandRunning: '正在分析…',
      understandEmpty: '还没有分析结果',
      understandEmptyHint: '输入文字后点「开始理解」；结果可以存回记忆区。',
      statChars: '字符',
      statNonSpace: '非空白字符',
      statWords: '词数',
      statUnique: '不同词',
      statSentences: '句子',
      statParagraphs: '段落',
      statReading: '阅读时长',
      statLanguage: '语言',
      statDensity: '词汇密度',
      readingMinutes: '约 {n} 分钟',
      langZh: '以中文为主',
      langEn: '以英文为主',
      langMixed: '中英混合',
      langUnknown: '无法判断',
      keywordsTitle: '关键词',
      keywordsEmpty: '没有提取到关键词（文本太短或全是停用词）。',
      summaryTitle: '抽取式摘要',
      summaryEmpty: '没有生成摘要。',
      summaryHint: '按关键词权重挑句，保留原文顺序。',
      saveSummary: '摘要存入记忆',
      exportReport: '导出分析报告',
      reportTitle: '文字理解报告',
      reportSource: '来源',
      reportGenerated: '生成时间',
      reportStats: '统计',
      reportKeywords: '关键词',
      reportSummary: '摘要',
      storedSummary: '摘要已存入记忆',
      exported: '已导出文件',
      truncatedNote: '文本超过 {n} 字符，只分析前 {n} 字符。',
      analyzeFailed: '分析失败，请重试。',
      storageUnavailable: '浏览器存储不可用，数据无法保存。',
      saveFailed: '保存失败，请重试。',
      deleteFailed: '删除失败，请重试。',
      confirmTitle: '确认删除',
      confirmMemory: '删除这条记忆？此操作无法撤销。',
      confirmBook: '删除《{title}》？此操作无法撤销。',
      discardTitle: '放弃修改',
      discardMessage: '放弃这本书里未保存的修改？',
      discard: '放弃',
      cancel: '取消',
      close: '关闭',
      delete: '删除',
    };

    const CSS = `
.evo-page { box-sizing: border-box; height: 100%; min-height: 0; overflow-y: auto; padding: calc(var(--dsh-frame-top-clearance, 0px) + 28px) 32px 40px; color: var(--dsw-alias-label-primary); }
.evo-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; max-width: 1080px; margin: 0 auto 18px; }
.evo-heading { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.evo-title { margin: 0; font-size: 20px; line-height: 1.35; font-weight: 600; letter-spacing: -0.01em; }
.evo-intro { margin: 0; font-size: 13px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
.evo-badges { display: flex; align-items: center; gap: 10px; flex: none; }
.evo-badge { padding: 3px 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 999px; font-size: 11px; line-height: 1.4; color: var(--dsw-alias-brand-primary); }
.evo-meta { font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.evo-notice, .evo-error { max-width: 1080px; margin: 0 auto 12px; padding: 9px 12px; border-radius: 10px; font-size: 12px; line-height: 1.5; }
.evo-notice { border: 1px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-1); }
.evo-error { border: 1px solid var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
.evo-tabs { display: flex; gap: 4px; max-width: 1080px; margin: 0 auto 16px; padding: 4px; overflow-x: auto; border: 1px solid var(--dsw-alias-border-l1); border-radius: 11px; background: var(--dsw-alias-bg-layer-1); }
.evo-tab { flex: none; height: 30px; padding: 0 14px; border: 0; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; line-height: 1; cursor: pointer; }
.evo-tab:hover { color: var(--dsw-alias-label-primary); }
.evo-tab-active { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font-weight: 600; }
.evo-tab:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -2px; }
.evo-content { max-width: 1080px; margin: 0 auto; }
.evo-stack { display: flex; flex-direction: column; gap: 12px; }
.evo-card { display: flex; flex-direction: column; gap: 10px; padding: 14px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 14px; background: var(--dsw-alias-bg-layer-1); }
.evo-composer { gap: 8px; }
.evo-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.evo-between { justify-content: space-between; }
.evo-label { font-size: 12px; font-weight: 600; }
.evo-hint { margin: 0; font-size: 11px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
.evo-input, .evo-select, .evo-textarea, .evo-editor { box-sizing: border-box; width: 100%; border: 1px solid var(--dsw-alias-border-l2); border-radius: 9px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; outline: none; }
.evo-input, .evo-select { height: 32px; padding: 0 10px; font-size: 13px; }
.evo-select { flex: 1; min-width: 180px; }
.evo-textarea { min-height: 96px; padding: 10px; resize: vertical; font-size: 13px; line-height: 1.7; }
.evo-editor { min-height: 46vh; padding: 14px; resize: vertical; font-size: var(--dsh-content-font-size, 14px); line-height: 1.8; }
.evo-input:focus-visible, .evo-select:focus-visible, .evo-textarea:focus-visible, .evo-editor:focus-visible { border-color: var(--dsw-alias-brand-primary); outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -2px; }
.evo-search { width: 240px; max-width: 100%; }
.evo-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.evo-toolbar .evo-meta { margin-left: auto; }
.evo-btn { height: 30px; padding: 0 12px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 1; cursor: pointer; }
.evo-btn:hover:not(:disabled) { border-color: var(--dsw-alias-label-secondary); }
.evo-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.evo-btn:disabled { opacity: 0.45; cursor: default; }
.evo-primary { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.evo-danger { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
.evo-list { display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; list-style: none; }
.evo-memory { flex-direction: row; align-items: stretch; gap: 12px; padding: 0; overflow: hidden; }
.evo-memory-open { display: flex; flex: 1; flex-direction: column; gap: 4px; min-width: 0; padding: 12px 0 12px 14px; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.evo-memory-open:hover .evo-item-title { color: var(--dsw-alias-brand-primary); }
.evo-memory .evo-actions { flex: none; align-items: center; padding: 8px 10px 8px 0; }
.evo-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.evo-actions-end { justify-content: flex-end; }
.evo-item-title { overflow: hidden; font-size: 13px; font-weight: 600; line-height: 1.45; white-space: nowrap; text-overflow: ellipsis; }
.evo-preview { display: -webkit-box; overflow: hidden; font-size: 12px; line-height: 1.55; color: var(--dsw-alias-label-secondary); -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.evo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; margin: 0; padding: 0; list-style: none; }
.evo-book { padding: 0; overflow: hidden; }
.evo-book-open { display: flex; flex-direction: column; gap: 5px; min-height: 104px; padding: 13px; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.evo-book-open:hover .evo-item-title { color: var(--dsw-alias-brand-primary); }
.evo-book .evo-actions { padding: 0 10px 10px; }
.evo-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; min-height: 220px; padding: 28px; border: 1px dashed var(--dsw-alias-border-l2); border-radius: 16px; background: var(--dsw-alias-bg-layer-1); text-align: center; }
.evo-empty-title { font-size: 14px; font-weight: 600; }
.evo-status { margin: 0; padding: 10px 0; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.evo-stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
.evo-stat { display: flex; flex-direction: column; gap: 2px; padding: 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-base); }
.evo-stat-value { font-size: 17px; font-weight: 600; line-height: 1.3; font-variant-numeric: tabular-nums; }
.evo-stat-label { font-size: 11px; color: var(--dsw-alias-label-secondary); }
.evo-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.evo-section-title { margin: 0; font-size: 13px; font-weight: 600; }
.evo-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.evo-chip { display: inline-flex; align-items: baseline; gap: 4px; padding: 3px 9px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 999px; background: var(--dsw-alias-bg-layer-2); font-size: 12px; line-height: 1.5; }
.evo-chip-count { font-size: 10px; color: var(--dsw-alias-label-secondary); }
.evo-summary { margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.75; }
.evo-summary li + li { margin-top: 6px; }
.evo-dirty { color: var(--dsw-alias-state-warn-primary); }
.evo-editor-toolbar .evo-title-input { flex: 1; min-width: 180px; }
.evo-dialog { width: min(640px, calc(100vw - 48px)); max-width: none; max-height: calc(100vh - 64px); margin: auto; padding: 0; overflow: hidden; border: 1px solid var(--dsw-alias-border-l1); border-radius: 16px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }
.evo-dialog[open] { display: flex; flex-direction: column; }
.evo-dialog::backdrop { background: rgba(0, 0, 0, 0.55); }
.evo-dialog-sm { width: min(440px, calc(100vw - 48px)); }
.evo-dialog-head { display: flex; align-items: center; gap: 12px; padding: 12px 12px 12px 18px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.evo-dialog-title { flex: 1; min-width: 0; margin: 0; font-size: 14px; font-weight: 600; }
.evo-dialog-body { display: flex; flex: 1 1 auto; flex-direction: column; gap: 10px; min-height: 0; padding: 16px 18px; overflow-y: auto; }
.evo-dialog-body .evo-textarea { min-height: 220px; }
.evo-dialog-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 12px 18px; border-top: 1px solid var(--dsw-alias-border-l1); }
.evo-foot-right { display: flex; gap: 8px; margin-left: auto; }
.evo-dialog p { margin: 0; font-size: 13px; line-height: 1.6; }
.evo-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 18px; line-height: 1; cursor: pointer; }
.evo-icon-btn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.evo-analysis-text { min-height: 170px; }
@media (max-width: 760px) { .evo-head { align-items: flex-start; flex-direction: column; } .evo-search { width: 100%; } .evo-memory { flex-direction: column; } .evo-memory .evo-actions { padding: 0 10px 10px; } .evo-toolbar .evo-meta { margin-left: 0; } }
`;

    /** Render the sidebar glyph at the size the sidebar asks for. */
    function EvolutionPanelIcon({ size }) {
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
        h('path', { d: 'M12 3.5c3.4 0 6 2.6 6 6 0 2.2-1 3.6-2.2 4.9-.9 1-1.3 1.9-1.3 3.1v1.3' }),
        h('path', { d: 'M12 3.5c-3.4 0-6 2.6-6 6 0 2.2 1 3.6 2.2 4.9.9 1 1.3 1.9 1.3 3.1v1.3' }),
        h('path', { d: 'M9 20.5h6' }),
        h('circle', { cx: 12, cy: 9.5, r: 1.4 }),
      );
    }

    /** Render a byte count in compact units. */
    function formatBytes(bytes) {
      if (!bytes) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB'];
      const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
      const value = bytes / 1024 ** exponent;
      return `${exponent === 0 || value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
    }

    /** Stable id with a fallback for older browsers. */
    function newId() {
      try {
        return window.crypto.randomUUID();
      } catch {
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      }
    }

    /** One-line title from the first non-empty line of a text. */
    function autoTitle(text) {
      const line = (text ?? '').split('\n').map((item) => item.trim()).find(Boolean) ?? '';
      return line.replace(/^#+\s*/, '').slice(0, 48);
    }

    /** Short preview for a card. */
    function preview(text) {
      const clean = (text ?? '').replace(/\s+/g, ' ').trim();
      return clean.length > 180 ? `${clean.slice(0, 180)}…` : clean;
    }

    /** Safe download name. */
    function safeFileName(name, ext) {
      const base = (name ?? '').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'untitled';
      return `${base}.${ext}`;
    }

    /** Write text to a local file through a transient download anchor. */
    function downloadText(filename, text, mime = 'text/markdown') {
      const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
          for (const store of [STORE_MEMORY, STORE_BOOKS]) {
            if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' });
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
    const removeItem = (store, id) => withStore(store, 'readwrite', (objectStore) => objectStore.delete(id));

    /** Stop words stay out of the keyword table. */
    const ZH_STOP = new Set(
      '的 了 是 在 和 与 也 就 都 而 及 或 一个 我们 你们 他们 她们 它们 这 那 有 我 你 他 她 它 不 很 到 对 从 被 把 让 给 但 并 所以 因为 如果 可以 没有 什么 怎么 这个 那个 自己 时候 还是 已经 现在 一些 这样 那样 以及 对于 关于 通过 进行 需要 可能 应该 很多 非常 就是 不是 也是 只是 还有 然后 其中 以上 以下 方面 问题 情况 内容 文字 作品 作者 一个 一种 一样 一直 只有 只要 主要 还有 不是 不能 不会 没 说 要 会 能 着 过 地 得 之 其 此 该 等 被 将 呢 吗 吧 啊 哦 嗯 很 更 最 太 又 再 却 才 已 曾 未 无 非 每 各 某 另'.split(
        ' ',
      ),
    );
    const EN_STOP = new Set(
      'the a an and or but if then than that this these those of to in on at by for with from as is are was were be been being it its it\'s you your we our they their he she his her him them i me my mine do does did have has had can could will would should may might must not no nor so very just also only own same too about into over after before while where when who whom which what how all any both each few more most other some such'.split(
        ' ',
      ),
    );

    /** Word tokens via Intl.Segmenter, with a regex fallback. */
    function segmentWords(text) {
      const words = [];
      try {
        if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
          const segmenter = new Intl.Segmenter('zh', { granularity: 'word' });
          for (const part of segmenter.segment(text)) {
            if (!part.isWordLike) continue;
            const word = part.segment.trim().toLowerCase();
            if (word) words.push(word);
          }
          return words;
        }
      } catch {
        /* fall through */
      }
      for (const word of (text.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? [])) words.push(word.toLowerCase());
      for (const run of (text.match(/[\u4e00-\u9fff]+/g) ?? [])) {
        for (let index = 0; index + 1 < run.length; index += 1) words.push(run.slice(index, index + 2));
      }
      return words;
    }

    /** Rank keyword frequencies, dropping stop words and single characters. */
    function keywordList(words) {
      const frequency = new Map();
      for (const word of words) {
        if (word.length < 2 || ZH_STOP.has(word) || EN_STOP.has(word)) continue;
        if (/^\d+$/.test(word) || !/[\p{L}\p{N}]/u.test(word)) continue;
        frequency.set(word, (frequency.get(word) ?? 0) + 1);
      }
      return [...frequency.entries()]
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count || b.word.length - a.word.length)
        .slice(0, 16);
    }

    /** Split sentences with Intl.Segmenter, falling back to punctuation. */
    function sentenceList(text) {
      const sentences = [];
      try {
        if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
          const segmenter = new Intl.Segmenter('zh', { granularity: 'sentence' });
          for (const part of segmenter.segment(text)) {
            const sentence = part.segment.trim();
            if (sentence) sentences.push(sentence);
          }
        }
      } catch {
        /* fall through */
      }
      if (sentences.length > 0) return sentences;
      for (const part of text.split(/[。！？!?；;\n]+/)) {
        const sentence = part.trim();
        if (sentence) sentences.push(sentence);
      }
      return sentences;
    }

    /** Extractive summary: score sentences by keyword weight, keep source order. */
    function extractiveSummary(sentences, keywords) {
      const weights = new Map(keywords.map(({ word, count }) => [word, count]));
      const scored = sentences
        .map((sentence, index) => {
          let score = 0;
          for (const word of segmentWords(sentence)) score += weights.get(word) ?? 0;
          return { index, sentence, score: score / Math.sqrt(Math.max(8, sentence.length)) };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .sort((a, b) => a.index - b.index);
      return scored.map((item) => item.sentence);
    }

    /** Analyze one text locally. */
    function analyzeText(rawText) {
      const normalized = rawText.replace(/\r\n?/g, '\n');
      const truncated = normalized.length > MAX_ANALYSIS_CHARS;
      const sample = truncated ? normalized.slice(0, MAX_ANALYSIS_CHARS) : normalized;
      const nonSpace = sample.replace(/\s+/g, '');
      const cjk = (sample.match(/[\u4e00-\u9fff]/g) ?? []).length;
      const latin = (sample.match(/[A-Za-z]/g) ?? []).length;
      const words = segmentWords(sample);
      const keywords = keywordList(words);
      const sentences = sentenceList(sample).filter((sentence) => sentence.length >= 8);
      const summary = extractiveSummary(sentences, keywords);
      const paragraphs = sample.split(/\n\s*\n/).filter((part) => part.trim()).length || (sample.trim() ? 1 : 0);
      const language =
        cjk === 0 && latin === 0 ? 'unknown' : cjk > latin * 1.6 ? 'zh' : latin > cjk * 1.6 ? 'en' : 'mixed';
      return {
        stats: {
          chars: sample.length,
          nonSpace: nonSpace.length,
          words: words.length,
          uniqueWords: new Set(words).size,
          sentences: sentences.length,
          paragraphs,
          readingMinutes: Math.max(1, Math.ceil(nonSpace.length / 400)),
          language,
          truncated,
        },
        keywords,
        summary,
      };
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ai-evolution: dictionaries');
        const t = ctx.locale.bind(NS);

        /** Format one timestamp in the active locale. */
        function formatDateTime(ms) {
          try {
            return new Intl.DateTimeFormat(ctx.locale.getLocale().active, {
              year: 'numeric',
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

        /** The workbench page opened by the sidebar entry. */
        function EvolutionPage() {
          const [tab, setTab] = useState('memory');
          const [memories, setMemories] = useState([]);
          const [books, setBooks] = useState([]);
          const [loading, setLoading] = useState(true);
          const [error, setError] = useState('');
          const [notice, setNotice] = useState('');

          const [memTitle, setMemTitle] = useState('');
          const [memText, setMemText] = useState('');
          const [memoryQuery, setMemoryQuery] = useState('');
          const [memoryDraft, setMemoryDraft] = useState(null);
          const [bookQuery, setBookQuery] = useState('');
          const [bookDraft, setBookDraft] = useState(null);
          const [confirmAction, setConfirmAction] = useState(null);

          const [sourceValue, setSourceValue] = useState('');
          const [analysisText, setAnalysisText] = useState('');
          const [analysisName, setAnalysisName] = useState('');
          const [analysisResult, setAnalysisResult] = useState(null);
          const [analysisNote, setAnalysisNote] = useState('');
          const [analyzing, setAnalyzing] = useState(false);

          const fileInputRef = useRef(null);
          const memoryDialogRef = useRef(null);
          const confirmDialogRef = useRef(null);
          const noticeTimer = useRef(null);

          const localeId = ctx.locale.getLocale().active;
          const numberFormat = new Intl.NumberFormat(localeId);
          const formatDate = (ms) => {
            try {
              return new Intl.DateTimeFormat(localeId, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }).format(new Date(ms));
            } catch {
              return new Date(ms).toLocaleString();
            }
          };

          const notify = (message) => {
            setNotice(message);
            if (noticeTimer.current) clearTimeout(noticeTimer.current);
            noticeTimer.current = window.setTimeout(() => setNotice(''), 4000);
          };

          useEffect(() => {
            let cancelled = false;
            Promise.all([listAll(STORE_MEMORY), listAll(STORE_BOOKS)])
              .then(([storedMemories, storedBooks]) => {
                if (cancelled) return;
                setMemories(storedMemories.slice().sort((a, b) => b.createdAt - a.createdAt));
                setBooks(storedBooks.slice().sort((a, b) => b.updatedAt - a.updatedAt));
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

          useEffect(
            () => () => {
              if (noticeTimer.current) clearTimeout(noticeTimer.current);
            },
            [],
          );

          useEffect(() => {
            const dialog = memoryDialogRef.current;
            if (!dialog) return;
            if (memoryDraft) {
              if (!dialog.open) dialog.showModal();
            } else if (dialog.open) {
              dialog.close();
            }
          }, [memoryDraft]);

          useEffect(() => {
            const dialog = confirmDialogRef.current;
            if (!dialog) return;
            if (confirmAction) {
              if (!dialog.open) dialog.showModal();
            } else if (dialog.open) {
              dialog.close();
            }
          }, [confirmAction]);

          const filteredMemories = memories.filter((item) => {
            const query = memoryQuery.trim().toLowerCase();
            if (!query) return true;
            return item.title.toLowerCase().includes(query) || item.text.toLowerCase().includes(query);
          });
          const filteredBooks = books.filter((item) => {
            const query = bookQuery.trim().toLowerCase();
            if (!query) return true;
            return item.title.toLowerCase().includes(query) || item.text.toLowerCase().includes(query);
          });
          const storedBook = bookDraft?.id ? books.find((item) => item.id === bookDraft.id) : null;
          const bookDirty = bookDraft
            ? !bookDraft.id
              ? Boolean(bookDraft.title.trim() || bookDraft.text.trim())
              : !storedBook || storedBook.title !== bookDraft.title || storedBook.text !== bookDraft.text
            : false;

          const requestConfirm = (action) => {
            setMemoryDraft(null);
            setConfirmAction(action);
          };

          const commitMemory = async (record) => {
            try {
              await putItem(STORE_MEMORY, record);
              let next = [record, ...memories.filter((item) => item.id !== record.id)].sort(
                (a, b) => b.createdAt - a.createdAt,
              );
              const overflow = next.slice(MEMORY_LIMIT);
              for (const old of overflow) await removeItem(STORE_MEMORY, old.id);
              setMemories(next.slice(0, MEMORY_LIMIT));
              setError('');
              return true;
            } catch {
              setError(t('saveFailed'));
              return false;
            }
          };

          const addMemory = async (title, text) => {
            const clean = text.trim();
            if (!clean) {
              setError(t('bookRequired'));
              return false;
            }
            const now = Date.now();
            const record = {
              id: newId(),
              title: (title ?? '').trim() || autoTitle(clean) || t('tabMemory'),
              text: clean,
              createdAt: now,
              updatedAt: now,
            };
            if (!(await commitMemory(record))) return false;
            notify(t('memorySaved'));
            return true;
          };

          const saveMemoryDraft = async () => {
            if (!memoryDraft) return;
            const text = memoryDraft.text.trim();
            if (!text) {
              setError(t('bookRequired'));
              return;
            }
            const record = {
              ...memoryDraft,
              title: memoryDraft.title.trim() || autoTitle(text),
              text,
              updatedAt: Date.now(),
            };
            try {
              await putItem(STORE_MEMORY, record);
              setMemories((current) => current.map((item) => (item.id === record.id ? record : item)));
              setMemoryDraft(null);
              setError('');
              notify(t('memoryUpdated'));
            } catch {
              setError(t('saveFailed'));
            }
          };

          const saveBookDraft = async () => {
            if (!bookDraft) return;
            const text = bookDraft.text.trim();
            const title = bookDraft.title.trim() || autoTitle(text) || t('bookUntitled');
            if (!text) {
              setError(t('bookRequired'));
              return;
            }
            const now = Date.now();
            const record = bookDraft.id
              ? { ...bookDraft, title, text, updatedAt: now }
              : {
                  id: newId(),
                  title,
                  text,
                  createdAt: now,
                  updatedAt: now,
                  source: 'local',
                  ext: 'md',
                };
            try {
              await putItem(STORE_BOOKS, record);
              setBooks((current) => [record, ...current.filter((item) => item.id !== record.id)].sort(
                (a, b) => b.updatedAt - a.updatedAt,
              ));
              setBookDraft(record);
              setError('');
              notify(t('bookSaved'));
            } catch {
              setError(t('saveFailed'));
            }
          };

          const deleteTarget = async (action) => {
            try {
              await removeItem(action.kind === 'memory' ? STORE_MEMORY : STORE_BOOKS, action.id);
              if (action.kind === 'memory') {
                setMemories((current) => current.filter((item) => item.id !== action.id));
                notify(t('memoryDeleted'));
              } else {
                setBooks((current) => current.filter((item) => item.id !== action.id));
                setBookDraft((current) => (current?.id === action.id ? null : current));
                notify(t('bookDeleted'));
              }
              setError('');
            } catch {
              setError(t('deleteFailed'));
            }
            setConfirmAction(null);
          };

          const confirm = () => {
            const action = confirmAction;
            if (!action) return;
            if (action.kind === 'discard') {
              setConfirmAction(null);
              setBookDraft(null);
              return;
            }
            void deleteTarget(action);
          };

          const sendToAnalysis = (text, name) => {
            if (!text.trim()) return;
            setAnalysisText(text);
            setAnalysisName(name || '');
            setAnalysisResult(null);
            setAnalysisNote('');
            setSourceValue('');
            setTab('understand');
          };

          const onSourceChange = (event) => {
            const value = event.target.value;
            setSourceValue(value);
            if (value.startsWith('book:')) {
              const book = books.find((item) => item.id === value.slice(5));
              if (book) {
                setAnalysisText(book.text);
                setAnalysisName(book.title);
                setAnalysisResult(null);
                setAnalysisNote('');
              }
            } else if (value.startsWith('memory:')) {
              const memory = memories.find((item) => item.id === value.slice(7));
              if (memory) {
                setAnalysisText(memory.text);
                setAnalysisName(memory.title);
                setAnalysisResult(null);
                setAnalysisNote('');
              }
            } else {
              setAnalysisName('');
            }
          };

          const runAnalysis = async () => {
            const text = analysisText.trim();
            if (!text || analyzing) return;
            setAnalyzing(true);
            setAnalysisResult(null);
            setAnalysisNote('');
            setError('');
            await new Promise((resolve) => window.setTimeout(resolve, 30));
            try {
              const result = analyzeText(text);
              setAnalysisResult(result);
              if (result.stats.truncated) setAnalysisNote(t('truncatedNote').replace(/\{n\}/g, String(MAX_ANALYSIS_CHARS)));
            } catch {
              setError(t('analyzeFailed'));
            }
            setAnalyzing(false);
          };

          const reportMarkdown = () => {
            const result = analysisResult;
            if (!result) return '';
            const stats = result.stats;
            const language =
              stats.language === 'zh'
                ? t('langZh')
                : stats.language === 'en'
                  ? t('langEn')
                  : stats.language === 'mixed'
                    ? t('langMixed')
                    : t('langUnknown');
            return [
              `# ${t('reportTitle')} · ${analysisName || t('understandCustom')}`,
              '',
              `- ${t('reportSource')}：${analysisName || t('understandCustom')}`,
              `- ${t('reportGenerated')}：${formatDateTime(Date.now())}`,
              `- ${t('statChars')}：${stats.chars}${stats.truncated ? `（${t('truncatedNote').replace(/\{n\}/g, String(MAX_ANALYSIS_CHARS))}）` : ''}`,
              `- ${t('statWords')}：${stats.words} · ${t('statSentences')}：${stats.sentences} · ${t('statLanguage')}：${language}`,
              '',
              `## ${t('reportKeywords')}`,
              ...result.keywords.map((item) => `- ${item.word} ×${item.count}`),
              '',
              `## ${t('reportSummary')}`,
              ...result.summary.map((sentence, index) => `${index + 1}. ${sentence}`),
            ].join('\n');
          };

          const exportReport = () => {
            if (!analysisResult) return;
            const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
            downloadText(safeFileName(`understand-${stamp}`, 'md'), reportMarkdown());
            notify(t('exported'));
          };

          const saveSummary = async () => {
            const result = analysisResult;
            if (!result) return;
            const lines = [
              `${t('reportSource')}：${analysisName || t('understandCustom')}`,
              `${t('statChars')}：${result.stats.chars} · ${t('statWords')}：${result.stats.words} · ${t('statSentences')}：${result.stats.sentences}`,
              `${t('keywordsTitle')}：${result.keywords.map((item) => item.word).join('、') || '—'}`,
              '',
              `${t('summaryTitle')}：`,
              ...result.summary.map((sentence, index) => `${index + 1}. ${sentence.slice(0, 320)}`),
            ];
            if (await addMemory(`${t('summaryTitle')} · ${analysisName || t('understandCustom')}`, lines.join('\n'))) {
              setTab('memory');
              setMemoryQuery('');
              notify(t('storedSummary'));
            }
          };

          const exportBook = (book) => {
            if (!book) return;
            downloadText(
              safeFileName(book.title || t('bookUntitled'), book.ext || 'md'),
              book.text,
              book.ext === 'txt' ? 'text/plain' : 'text/markdown',
            );
            notify(t('exported'));
          };

          const importFiles = async (files) => {
            const accepted = files.filter(
              (file) =>
                file.size <= MAX_IMPORT_BYTES &&
                (file.type.startsWith('text/') || /\.(txt|md|markdown)$/i.test(file.name)),
            );
            const imported = [];
            for (const file of accepted) {
              try {
                const text = (await file.text()).trim();
                if (!text) {
                  continue;
                }
                const now = Date.now();
                const ext = /\.md$/i.test(file.name) || /\.markdown$/i.test(file.name) ? 'md' : 'txt';
                const record = {
                  id: newId(),
                  title: file.name.replace(/\.[^.]+$/, '') || t('bookUntitled'),
                  text,
                  createdAt: now,
                  updatedAt: now,
                  source: 'import',
                  ext,
                };
                await putItem(STORE_BOOKS, record);
                imported.push(record);
              } catch {
                /* skip one unreadable file */
              }
            }
            if (imported.length > 0) {
              setBooks((current) => [...imported.slice().reverse(), ...current].sort(
                (a, b) => b.updatedAt - a.updatedAt,
              ));
              notify(t('bookImported').replace('{n}', String(imported.length)));
            }
            const missed = files.length - imported.length;
            if (missed > 0) setError(t('bookSkipped').replace('{n}', String(missed)));
            else setError('');
          };

          const onFilePicked = (event) => {
            const input = event.currentTarget;
            const files = Array.from(input.files ?? []);
            input.value = '';
            if (files.length > 0) void importFiles(files);
          };

          const onTabKeyDown = (event, index) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            const direction = event.key === 'ArrowRight' ? 1 : -1;
            const next = (index + direction + TAB_IDS.length) % TAB_IDS.length;
            setTab(TAB_IDS[next]);
            document.getElementById(`evolution-tab-${TAB_IDS[next]}`)?.focus();
          };

          const emptyState = (title, hint) =>
            h(
              'div',
              { className: 'evo-empty' },
              h('span', { className: 'evo-empty-title' }, title),
              h('span', { className: 'evo-hint' }, hint),
            );

          const renderMemory = () =>
            h(
              'div',
              { className: 'evo-stack' },
              h(
                'section',
                { className: 'evo-card evo-composer' },
                h('label', { className: 'evo-label' }, t('memoryTitle')),
                h('input', {
                  className: 'evo-input',
                  value: memTitle,
                  placeholder: t('memoryTitle'),
                  onChange: (event) => setMemTitle(event.target.value),
                }),
                h('textarea', {
                  className: 'evo-textarea',
                  value: memText,
                  placeholder: t('memoryPlaceholder'),
                  onChange: (event) => setMemText(event.target.value),
                }),
                h(
                  'div',
                  { className: 'evo-row evo-between' },
                  h('span', { className: 'evo-hint' }, t('memoryHint').replace('{n}', String(MEMORY_LIMIT))),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'evo-btn evo-primary',
                      disabled: !memText.trim(),
                      onClick: async () => {
                        if (await addMemory(memTitle, memText)) {
                          setMemTitle('');
                          setMemText('');
                        }
                      },
                    },
                    t('memoryAdd'),
                  ),
                ),
              ),
              h(
                'div',
                { className: 'evo-toolbar' },
                h('input', {
                  type: 'search',
                  className: 'evo-input evo-search',
                  value: memoryQuery,
                  placeholder: t('memorySearch'),
                  onChange: (event) => setMemoryQuery(event.target.value),
                }),
                h('span', { className: 'evo-meta' }, t('memoryCount').replace('{n}', numberFormat.format(memories.length))),
              ),
              filteredMemories.length === 0
                ? emptyState(t('memoryEmpty'), t('memoryEmptyHint'))
                : h(
                    'ul',
                    { className: 'evo-list' },
                    filteredMemories.map((item) =>
                      h(
                        'li',
                        { key: item.id, className: 'evo-card evo-memory' },
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'evo-memory-open',
                            onClick: () => setMemoryDraft({ ...item }),
                          },
                          h('span', { className: 'evo-item-title' }, item.title),
                          h('span', { className: 'evo-preview' }, preview(item.text)),
                          h(
                            'span',
                            { className: 'evo-meta' },
                            `${formatDate(item.updatedAt)} · ${t('bookChars').replace('{n}', numberFormat.format(item.text.length))}`,
                          ),
                        ),
                        h(
                          'div',
                          { className: 'evo-actions' },
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'evo-btn',
                              onClick: () => sendToAnalysis(item.text, item.title),
                            },
                            t('memoryAnalyze'),
                          ),
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'evo-btn evo-danger',
                              onClick: () => requestConfirm({ kind: 'memory', id: item.id, title: item.title }),
                            },
                            t('delete'),
                          ),
                        ),
                      ),
                    ),
                  ),
            );

          const renderBookEditor = () =>
            h(
              'div',
              { className: 'evo-stack' },
              h(
                'div',
                { className: 'evo-toolbar evo-editor-toolbar' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'evo-btn',
                    onClick: () => (bookDirty ? requestConfirm({ kind: 'discard' }) : setBookDraft(null)),
                  },
                  `← ${t('bookBack')}`,
                ),
                h('input', {
                  className: 'evo-input evo-title-input',
                  value: bookDraft.title,
                  placeholder: t('bookTitle'),
                  onChange: (event) => setBookDraft({ ...bookDraft, title: event.target.value }),
                }),
                h('span', { className: 'evo-meta' }, t('bookChars').replace('{n}', numberFormat.format(bookDraft.text.length))),
              ),
              h(
                'div',
                { className: 'evo-toolbar' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'evo-btn evo-primary',
                    disabled: !bookDirty || !bookDraft.text.trim(),
                    onClick: () => void saveBookDraft(),
                  },
                  t('bookSave'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'evo-btn',
                    disabled: !bookDraft.text.trim(),
                    onClick: () => sendToAnalysis(bookDraft.text, bookDraft.title || t('bookUntitled')),
                  },
                  t('bookAnalyze'),
                ),
                h('button', { type: 'button', className: 'evo-btn', onClick: () => exportBook(bookDraft) }, t('bookExport')),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'evo-btn evo-danger',
                    disabled: !bookDraft.id,
                    onClick: () =>
                      requestConfirm({
                        kind: 'book',
                        id: bookDraft.id,
                        title: bookDraft.title || t('bookUntitled'),
                      }),
                  },
                  t('bookDelete'),
                ),
                bookDirty ? h('span', { className: 'evo-meta evo-dirty' }, t('bookUnsaved')) : null,
              ),
              h('textarea', {
                className: 'evo-editor',
                value: bookDraft.text,
                placeholder: t('bookTextPlaceholder'),
                onChange: (event) => setBookDraft({ ...bookDraft, text: event.target.value }),
              }),
            );

          const renderBooks = () =>
            bookDraft
              ? renderBookEditor()
              : h(
                  'div',
                  { className: 'evo-stack' },
                  h(
                    'div',
                    { className: 'evo-toolbar' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'evo-btn evo-primary',
                        onClick: () => fileInputRef.current?.click(),
                      },
                      t('bookImport'),
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'evo-btn',
                        onClick: () => setBookDraft({ id: null, title: '', text: '', source: 'local', ext: 'md' }),
                      },
                      t('bookNew'),
                    ),
                    h('input', {
                      type: 'search',
                      className: 'evo-input evo-search',
                      value: bookQuery,
                      placeholder: t('bookSearch'),
                      onChange: (event) => setBookQuery(event.target.value),
                    }),
                    h('span', { className: 'evo-meta' }, t('bookCount').replace('{n}', numberFormat.format(books.length))),
                  ),
                  h('p', { className: 'evo-hint' }, t('booksHint').replace('{n}', formatBytes(MAX_IMPORT_BYTES))),
                  filteredBooks.length === 0
                    ? emptyState(t('bookEmpty'), t('bookEmptyHint'))
                    : h(
                        'ul',
                        { className: 'evo-grid' },
                        filteredBooks.map((book) =>
                          h(
                            'li',
                            { key: book.id, className: 'evo-card evo-book' },
                            h(
                              'button',
                              {
                                type: 'button',
                                className: 'evo-book-open',
                                onClick: () => setBookDraft({ ...book }),
                              },
                              h('span', { className: 'evo-item-title' }, book.title),
                              h('span', { className: 'evo-preview' }, preview(book.text)),
                              h(
                                'span',
                                { className: 'evo-meta' },
                                `${t('bookChars').replace('{n}', numberFormat.format(book.text.length))} · ${t('bookUpdated').replace('{time}', formatDate(book.updatedAt))}`,
                              ),
                            ),
                            h(
                              'div',
                              { className: 'evo-actions' },
                              h(
                                'button',
                                {
                                  type: 'button',
                                  className: 'evo-btn',
                                  onClick: () => sendToAnalysis(book.text, book.title),
                                },
                                t('memoryAnalyze'),
                              ),
                              h('button', { type: 'button', className: 'evo-btn', onClick: () => exportBook(book) }, t('bookExport')),
                              h(
                                'button',
                                {
                                  type: 'button',
                                  className: 'evo-btn evo-danger',
                                  onClick: () => requestConfirm({ kind: 'book', id: book.id, title: book.title }),
                                },
                                t('delete'),
                              ),
                            ),
                          ),
                        ),
                      ),
                );

          const renderAnalysis = () => {
            const result = analysisResult;
            const language = result
              ? result.stats.language === 'zh'
                ? t('langZh')
                : result.stats.language === 'en'
                  ? t('langEn')
                  : result.stats.language === 'mixed'
                    ? t('langMixed')
                    : t('langUnknown')
              : '';
            const stats = result
              ? [
                  [t('statChars'), numberFormat.format(result.stats.chars)],
                  [t('statNonSpace'), numberFormat.format(result.stats.nonSpace)],
                  [t('statWords'), numberFormat.format(result.stats.words)],
                  [t('statUnique'), numberFormat.format(result.stats.uniqueWords)],
                  [t('statSentences'), numberFormat.format(result.stats.sentences)],
                  [t('statParagraphs'), numberFormat.format(result.stats.paragraphs)],
                  [t('statReading'), t('readingMinutes').replace('{n}', String(result.stats.readingMinutes))],
                  [t('statLanguage'), language],
                  [
                    t('statDensity'),
                    `${result.stats.words ? Math.round((result.stats.uniqueWords / result.stats.words) * 100) : 0}%`,
                  ],
                ]
              : [];
            return h(
              'div',
              { className: 'evo-stack' },
              h(
                'section',
                { className: 'evo-card evo-composer' },
                h(
                  'div',
                  { className: 'evo-row evo-between' },
                  h('label', { className: 'evo-label' }, t('understandSource')),
                  h('span', { className: 'evo-meta' }, t('bookChars').replace('{n}', numberFormat.format(analysisText.length))),
                ),
                h(
                  'div',
                  { className: 'evo-row' },
                  h(
                    'select',
                    { className: 'evo-select', value: sourceValue, onChange: onSourceChange },
                    h('option', { value: '' }, t('understandCustom')),
                    books.length > 0
                      ? h(
                          'optgroup',
                          { label: t('tabBooks') },
                          books.map((book) => h('option', { key: book.id, value: `book:${book.id}` }, book.title)),
                        )
                      : null,
                    memories.length > 0
                      ? h(
                          'optgroup',
                          { label: t('tabMemory') },
                          memories.map((memory) => h('option', { key: memory.id, value: `memory:${memory.id}` }, memory.title)),
                        )
                      : null,
                  ),
                ),
                h('textarea', {
                  className: 'evo-textarea evo-analysis-text',
                  value: analysisText,
                  placeholder: t('understandPlaceholder'),
                  onChange: (event) => {
                    setAnalysisText(event.target.value);
                    setSourceValue('');
                    setAnalysisName('');
                    setAnalysisResult(null);
                    setAnalysisNote('');
                  },
                }),
                h(
                  'div',
                  { className: 'evo-row evo-between' },
                  h('span', { className: 'evo-hint' }, t('understandIntro')),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'evo-btn evo-primary',
                      disabled: analyzing || !analysisText.trim(),
                      onClick: () => void runAnalysis(),
                    },
                    analyzing ? t('understandRunning') : t('understandRun'),
                  ),
                ),
              ),
              analysisNote ? h('p', { className: 'evo-hint' }, analysisNote) : null,
              analyzing ? h('p', { className: 'evo-status', role: 'status' }, t('understandRunning')) : null,
              !analyzing && !result ? emptyState(t('understandEmpty'), t('understandEmptyHint')) : null,
              result
                ? h(
                    'div',
                    { className: 'evo-stack' },
                    h(
                      'section',
                      { className: 'evo-card' },
                      h(
                        'div',
                        { className: 'evo-section-head' },
                        h('h2', { className: 'evo-section-title' }, t('reportStats')),
                        analysisName ? h('span', { className: 'evo-meta' }, analysisName) : null,
                      ),
                      h(
                        'div',
                        { className: 'evo-stat-grid' },
                        stats.map(([label, value], index) =>
                          h(
                            'div',
                            { key: index, className: 'evo-stat' },
                            h('span', { className: 'evo-stat-value' }, value),
                            h('span', { className: 'evo-stat-label' }, label),
                          ),
                        ),
                      ),
                    ),
                    h(
                      'section',
                      { className: 'evo-card' },
                      h(
                        'div',
                        { className: 'evo-section-head' },
                        h('h2', { className: 'evo-section-title' }, t('keywordsTitle')),
                      ),
                      result.keywords.length > 0
                        ? h(
                            'div',
                            { className: 'evo-chips' },
                            result.keywords.map((item) =>
                              h(
                                'span',
                                { key: item.word, className: 'evo-chip', title: `${item.word} ×${item.count}` },
                                h('span', null, item.word),
                                h('span', { className: 'evo-chip-count' }, `×${item.count}`),
                              ),
                            ),
                          )
                        : h('p', { className: 'evo-hint' }, t('keywordsEmpty')),
                    ),
                    h(
                      'section',
                      { className: 'evo-card' },
                      h(
                        'div',
                        { className: 'evo-section-head' },
                        h('h2', { className: 'evo-section-title' }, t('summaryTitle')),
                        h('span', { className: 'evo-meta' }, t('summaryHint')),
                      ),
                      result.summary.length > 0
                        ? h(
                            'ol',
                            { className: 'evo-summary' },
                            result.summary.map((sentence, index) =>
                              h('li', { key: index }, sentence.length > 320 ? `${sentence.slice(0, 320)}…` : sentence),
                            ),
                          )
                        : h('p', { className: 'evo-hint' }, t('summaryEmpty')),
                    ),
                    h(
                      'div',
                      { className: 'evo-actions evo-actions-end' },
                      h('button', { type: 'button', className: 'evo-btn', onClick: exportReport }, t('exportReport')),
                      h('button', { type: 'button', className: 'evo-btn evo-primary', onClick: () => void saveSummary() }, t('saveSummary')),
                    ),
                  )
                : null,
            );
          };

          const confirmMessage =
            confirmAction?.kind === 'memory'
              ? t('confirmMemory')
              : confirmAction?.kind === 'book'
                ? t('confirmBook').replace('{title}', () => confirmAction.title || '')
                : t('discardMessage');

          return h(
            'div',
            { className: 'evo-page' },
            h('style', { key: 'styles' }, CSS),
            h(
              'header',
              { className: 'evo-head', 'data-window-drag': true },
              h(
                'div',
                { className: 'evo-heading' },
                h('h1', { className: 'evo-title' }, t('title')),
                h('p', { className: 'evo-intro' }, t('intro')),
              ),
              h(
                'div',
                { className: 'evo-badges' },
                h('span', { className: 'evo-badge' }, t('badge')),
                h(
                  'span',
                  { className: 'evo-meta' },
                  `${t('memoryCount').replace('{n}', numberFormat.format(memories.length))} · ${t('bookCount').replace('{n}', numberFormat.format(books.length))}`,
                ),
              ),
            ),
            notice ? h('p', { className: 'evo-notice', role: 'status' }, notice) : null,
            error ? h('p', { className: 'evo-error', role: 'alert' }, error) : null,
            h(
              'nav',
              { className: 'evo-tabs', role: 'tablist', 'aria-label': t('title') },
              TAB_IDS.map((id, index) =>
                h(
                  'button',
                  {
                    key: id,
                    id: `evolution-tab-${id}`,
                    type: 'button',
                    role: 'tab',
                    'aria-selected': tab === id,
                    'aria-controls': 'evolution-panel',
                    className: `evo-tab${tab === id ? ' evo-tab-active' : ''}`,
                    onClick: () => setTab(id),
                    onKeyDown: (event) => onTabKeyDown(event, index),
                  },
                  id === 'memory'
                    ? `${t('tabMemory')} · ${memories.length}`
                    : id === 'books'
                      ? `${t('tabBooks')} · ${books.length}`
                      : t('tabUnderstand'),
                ),
              ),
            ),
            h(
              'main',
              { className: 'evo-content', id: 'evolution-panel', role: 'tabpanel' },
              loading
                ? h('p', { className: 'evo-status', role: 'status' }, t('loading'))
                : tab === 'memory'
                  ? renderMemory()
                  : tab === 'books'
                    ? renderBooks()
                    : renderAnalysis(),
            ),
            h('input', {
              ref: fileInputRef,
              type: 'file',
              accept: '.txt,.md,.markdown,text/plain,text/markdown',
              multiple: true,
              hidden: true,
              onChange: onFilePicked,
            }),
            h(
              'dialog',
              {
                ref: memoryDialogRef,
                className: 'evo-dialog',
                'aria-label': t('memoryDialog'),
                onClose: () => setMemoryDraft(null),
                onClick: (event) => {
                  if (event.target === memoryDialogRef.current) event.currentTarget.close();
                },
              },
              memoryDraft
                ? h(
                    React.Fragment,
                    null,
                    h(
                      'div',
                      { className: 'evo-dialog-head' },
                      h('h2', { className: 'evo-dialog-title' }, t('memoryDialog')),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'evo-icon-btn',
                          'aria-label': t('close'),
                          onClick: () => memoryDialogRef.current?.close(),
                        },
                        '\u00d7',
                      ),
                    ),
                    h(
                      'div',
                      { className: 'evo-dialog-body' },
                      h('input', {
                        className: 'evo-input',
                        value: memoryDraft.title,
                        placeholder: t('memoryTitle'),
                        onChange: (event) => setMemoryDraft({ ...memoryDraft, title: event.target.value }),
                      }),
                      h('textarea', {
                        className: 'evo-textarea',
                        value: memoryDraft.text,
                        onChange: (event) => setMemoryDraft({ ...memoryDraft, text: event.target.value }),
                      }),
                    ),
                    h(
                      'div',
                      { className: 'evo-dialog-foot' },
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'evo-btn evo-danger',
                          onClick: () => requestConfirm({ kind: 'memory', id: memoryDraft.id, title: memoryDraft.title }),
                        },
                        t('delete'),
                      ),
                      h(
                        'div',
                        { className: 'evo-foot-right' },
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'evo-btn',
                            onClick: () => {
                              const draft = memoryDraft;
                              setMemoryDraft(null);
                              sendToAnalysis(draft.text, draft.title);
                            },
                          },
                          t('memoryAnalyze'),
                        ),
                        h('button', { type: 'button', className: 'evo-btn', onClick: () => setMemoryDraft(null) }, t('cancel')),
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'evo-btn evo-primary',
                            disabled: !memoryDraft.text.trim(),
                            onClick: () => void saveMemoryDraft(),
                          },
                          t('bookSave'),
                        ),
                      ),
                    ),
                  )
                : null,
            ),
            h(
              'dialog',
              {
                ref: confirmDialogRef,
                className: 'evo-dialog evo-dialog-sm',
                'aria-label': confirmAction?.kind === 'discard' ? t('discardTitle') : t('confirmTitle'),
                onClose: () => setConfirmAction(null),
                onClick: (event) => {
                  if (event.target === confirmDialogRef.current) event.currentTarget.close();
                },
              },
              confirmAction
                ? h(
                    React.Fragment,
                    null,
                    h(
                      'div',
                      { className: 'evo-dialog-head' },
                      h(
                        'h2',
                        { className: 'evo-dialog-title' },
                        confirmAction.kind === 'discard' ? t('discardTitle') : t('confirmTitle'),
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'evo-icon-btn',
                          'aria-label': t('close'),
                          onClick: () => confirmDialogRef.current?.close(),
                        },
                        '\u00d7',
                      ),
                    ),
                    h('div', { className: 'evo-dialog-body' }, h('p', null, confirmMessage)),
                    h(
                      'div',
                      { className: 'evo-dialog-foot' },
                      h('span', null),
                      h(
                        'div',
                        { className: 'evo-foot-right' },
                        h('button', { type: 'button', className: 'evo-btn', onClick: () => setConfirmAction(null) }, t('cancel')),
                        h(
                          'button',
                          {
                            type: 'button',
                            className: `evo-btn ${confirmAction.kind === 'discard' ? '' : 'evo-danger'}`,
                            onClick: confirm,
                          },
                          confirmAction.kind === 'discard' ? t('discard') : t('delete'),
                        ),
                      ),
                    ),
                  )
                : null,
            ),
          );
        }

        ctx.slots.inject('main', () =>
          ctx.slots.register(
            {
              name: 'main',
              key: PANEL_ID,
              locale: NS,
            },
            EvolutionPage,
          ),
        );

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 40,
              label: () => t('panel'),
              locale: NS,
            },
            EvolutionPanelIcon,
          ),
        );
      },
    };
  },
});
