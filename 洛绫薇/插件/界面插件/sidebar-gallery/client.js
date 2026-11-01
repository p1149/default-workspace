/**
 * Client half of the Gallery bundle.
 *
 * Registers one left-sidebar entry (`sidebar.panellist`) and the global page it
 * opens (`main`). Both share the same id, which is how the sidebar addresses the
 * panel. Images live in this browser's IndexedDB; nothing is uploaded.
 */
window.__ModuleLoader__.load({
  id: '@local/sidebar-gallery',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Dictionary namespace owned by this plugin. */
    const NS = 'localGallery';
    /** The id shared by the sidebar entry and the main panel it opens. */
    const PANEL_ID = 'gallery';
    /** Browser-local database and object store holding the images. */
    const DB_NAME = 'dsh.local.gallery.v1';
    const STORE_NAME = 'images';
    /** Largest single image accepted, in bytes. */
    const MAX_BYTES = 25 * 1024 * 1024;

    const en = {
      panel: 'Gallery',
      title: 'Gallery',
      intro: 'Images you add — manually or from a folder — stay in this browser; nothing is uploaded.',
      add: 'Add images',
      autoAdd: 'Auto-add folder',
      autoHint: 'Pick a folder: every image inside (subfolders included) is imported, and duplicates are skipped.',
      autoProgress: 'Importing {done}/{total}…',
      autoDone: 'Auto-added {n}, skipped {m}.',
      autoNone: 'No new images found in that folder.',
      count: '{n} images',
      loading: 'Reading this browser’s gallery…',
      empty: 'No images yet',
      emptyHint: 'Drop images here, or use Add images / Auto-add folder.',
      drop: 'Drop to add images',
      open: 'Open image',
      remove: 'Remove image',
      close: 'Close',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      resetZoom: 'Reset zoom',
      maximize: 'Maximize',
      restore: 'Restore',
      zoomHint: 'Wheel to zoom · drag to pan · double-click to reset',
      share: 'Share',
      shareTitle: 'Send image',
      sendToSession: 'Send to conversation',
      caption: 'Caption',
      captionPlaceholder: 'Optional message…',
      noSessions: 'No conversations yet',
      send: 'Send',
      sending: 'Sending…',
      sentToSession: 'Image sent to the conversation',
      sendFailed: 'Could not send the image',
      imageTooLarge: 'Image is too large to send (max 20 MB)',
      sendToPlugin: 'Other plugins',
      copyImage: 'Copy image',
      copied: 'Image copied — paste it into another plugin',
      copyFailed: 'Could not copy the image',
      download: 'Download original',
      pluginHint: 'Copy the image, then paste it into a plugin or input that accepts images.',
      closeShare: 'Close share',
      openConversation: 'Open conversation',
      notImages: 'Only image files can be added.',
      skipped: 'Some files were skipped: only images up to 25 MB are supported.',
      saveFailed: 'Some images could not be saved.',
      deleteFailed: 'Could not remove that image.',
      unavailable: 'Image storage is unavailable in this browser.',
      local: 'Gallery data is stored on this device only.',
      image: 'image',
    };

    const zh = {
      panel: '图片库',
      title: '图片库',
      intro: '手动添加或从文件夹自动添加的图片只保存在本机浏览器，不会上传到任何地方。',
      add: '添加图片',
      autoAdd: '自动添加',
      autoHint: '选择一个文件夹，自动导入其中全部图片（含子文件夹），重复图片会跳过。',
      autoProgress: '正在导入 {done}/{total}…',
      autoDone: '已自动导入 {n} 张，跳过 {m} 张。',
      autoNone: '这个文件夹里没有新的图片。',
      count: '{n} 张图片',
      loading: '正在读取本机图片库…',
      empty: '图片库还是空的',
      emptyHint: '把图片拖到这里，或点击「添加图片」/「自动添加」。',
      drop: '松开以添加图片',
      open: '打开图片',
      remove: '移除图片',
      close: '关闭',
      zoomIn: '放大',
      zoomOut: '缩小',
      resetZoom: '重置缩放',
      maximize: '最大化',
      restore: '还原',
      zoomHint: '滚轮缩放 · 拖动平移 · 双击复位',
      share: '分享',
      shareTitle: '发送图片',
      sendToSession: '发送到会话',
      caption: '附言',
      captionPlaceholder: '可选留言…',
      noSessions: '暂无会话',
      send: '发送',
      sending: '发送中…',
      sentToSession: '图片已发送到会话',
      sendFailed: '发送失败',
      imageTooLarge: '图片过大，无法发送（上限 20 MB）',
      sendToPlugin: '其他插件',
      copyImage: '复制图片',
      copied: '图片已复制，可粘贴到其他插件',
      copyFailed: '复制图片失败',
      download: '下载原图',
      pluginHint: '复制图片后，可在支持图片的插件或输入框中粘贴。',
      closeShare: '关闭分享',
      openConversation: '打开会话',
      notImages: '只能添加图片文件。',
      skipped: '部分文件已跳过：仅支持不超过 25 MB 的图片。',
      saveFailed: '部分图片保存失败。',
      deleteFailed: '无法移除这张图片。',
      unavailable: '当前浏览器无法使用图片存储。',
      local: '图片只保存在这台设备上。',
      image: '图片',
    };

    const CSS = `
.dsh-gallery-page {
  position: relative;
  box-sizing: border-box;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding: calc(var(--dsh-frame-top-clearance, 0px) + 28px) 32px 40px;
  color: var(--dsw-alias-label-primary);
}
.dsh-gallery-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  max-width: 1080px;
  margin: 0 auto 20px;
}
.dsh-gallery-heading {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.dsh-gallery-title {
  margin: 0;
  font-size: 20px;
  line-height: 1.35;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.dsh-gallery-intro {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dsw-alias-label-secondary);
}
.dsh-gallery-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  flex: none;
}
.dsh-gallery-count {
  font-size: 12px;
  line-height: 1;
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
}
.dsh-gallery-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 1080px;
  margin: 0 auto;
}
.dsh-gallery-error {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid var(--dsw-alias-state-error-primary);
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-state-error-primary);
}
.dsh-gallery-status {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}
.dsh-gallery-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 260px;
  padding: 32px;
  border: 1px dashed var(--dsw-alias-border-l2);
  border-radius: 16px;
  background: var(--dsw-alias-bg-layer-1);
  text-align: center;
}
.dsh-gallery-empty-title {
  font-size: 14px;
  font-weight: 600;
}
.dsh-gallery-empty-hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}
.dsh-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.dsh-gallery-item {
  min-width: 0;
}
.dsh-gallery-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-1);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.dsh-gallery-card:hover {
  border-color: var(--dsw-alias-border-l2);
}
.dsh-gallery-card:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
.dsh-gallery-thumb {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  background: var(--dsw-alias-bg-layer-2);
}
.dsh-gallery-caption {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  padding: 8px 10px;
}
.dsh-gallery-name {
  overflow: hidden;
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.dsh-gallery-size {
  flex: none;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
}
.dsh-gallery-btn {
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}
.dsh-gallery-btn:hover:not(:disabled) {
  border-color: var(--dsw-alias-label-secondary);
}
.dsh-gallery-btn:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 1px;
}
.dsh-gallery-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.dsh-gallery-btn-primary {
  border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-brand-primary);
}
.dsh-gallery-btn-danger {
  border-color: var(--dsw-alias-state-error-primary);
  color: var(--dsw-alias-state-error-primary);
}
.dsh-gallery-drop {
  position: absolute;
  inset: 8px;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--dsw-alias-brand-primary);
  border-radius: 16px;
  background: var(--dsw-alias-bg-overlay);
  color: var(--dsw-alias-brand-primary);
  font-size: 14px;
  font-weight: 600;
  pointer-events: none;
}
.dsh-gallery-dialog {
  width: min(960px, calc(100vw - 48px));
  max-width: none;
  max-height: calc(100vh - 64px);
  margin: auto;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 16px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}
.dsh-gallery-dialog[open] {
  display: flex;
  flex-direction: column;
}
.dsh-gallery-dialog::backdrop {
  background: rgba(0, 0, 0, 0.55);
}
.dsh-gallery-max {
  width: calc(100vw - 16px);
  height: calc(100vh - 16px);
  max-width: none;
  max-height: calc(100vh - 16px);
}
.dsh-gallery-max .dsh-gallery-dialog-stage {
  flex: 1 1 auto;
  min-height: 0;
}
.dsh-gallery-max .dsh-gallery-dialog-image {
  max-width: calc(100vw - 80px);
  max-height: calc(100vh - 140px);
}
.dsh-gallery-dialog-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px 10px 18px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.dsh-gallery-dialog-title {
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.dsh-gallery-dialog-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 20px;
  overflow: hidden;
  touch-action: none;
  background: var(--dsw-alias-bg-base);
}
.dsh-gallery-dialog-image {
  display: block;
  max-width: 100%;
  max-height: min(68vh, 720px);
  object-fit: contain;
  border-radius: 8px;
  transform-origin: center center;
  will-change: transform;
  user-select: none;
  -webkit-user-drag: none;
}
.dsh-gallery-zoom {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
}
.dsh-gallery-zoom-level {
  min-width: 42px;
  text-align: center;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
}
.dsh-gallery-zoom-reset {
  height: 26px;
  padding: 0 8px;
  font-size: 11px;
}
.dsh-gallery-icon-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.dsh-gallery-dialog-actions {
  display: flex;
  gap: 8px;
  flex: none;
}
.dsh-gallery-share-open .dsh-gallery-dialog-image {
  max-height: min(44vh, 480px);
}
.dsh-gallery-max.dsh-gallery-share-open .dsh-gallery-dialog-image {
  max-height: calc(100vh - 360px);
}
.dsh-gallery-share {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 18px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-2);
}
.dsh-gallery-share-title {
  font-size: 13px;
  font-weight: 600;
}
.dsh-gallery-share-grid {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.dsh-gallery-field {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 180px;
}
.dsh-gallery-field-label {
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
}
.dsh-gallery-input {
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
}
.dsh-gallery-input:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 1px;
}
.dsh-gallery-share-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.dsh-gallery-share-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--dsw-alias-label-secondary);
}
.dsh-gallery-share-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}
.dsh-gallery-share-note {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}
.dsh-gallery-share-note[data-level='error'] {
  color: var(--dsw-alias-state-error-primary);
}
.dsh-gallery-share-note[data-level='ok'] {
  color: var(--dsw-alias-brand-primary);
}
.dsh-gallery-dialog-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px 10px 18px;
  border-top: 1px solid var(--dsw-alias-border-l1);
}
.dsh-gallery-meta {
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
  text-overflow: ellipsis;
}
.dsh-gallery-icon-btn {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.dsh-gallery-icon-btn:hover {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
}
.dsh-gallery-icon-btn:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 1px;
}
`;

    /** Render a byte count in the compact units people expect. */
    function formatBytes(bytes) {
      if (!bytes) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB'];
      const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
      const value = bytes / 1024 ** exponent;
      const rounded = exponent === 0 || value >= 10 ? Math.round(value) : value.toFixed(1);
      return `${rounded} ${units[exponent]}`;
    }

    /** Open the browser-local image database, creating the store on first use. */
    function openDb() {
      return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
          reject(new Error('indexeddb-unavailable'));
          return;
        }
        const request = window.indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('indexeddb-open-failed'));
      });
    }

    /** Run one object-store request and settle with the transaction outcome. */
    function withStore(mode, action) {
      return openDb().then(
        (db) =>
          new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, mode);
            let result;
            let request;
            try {
              request = action(transaction.objectStore(STORE_NAME));
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

    const listImages = () => withStore('readonly', (store) => store.getAll());
    const insertImage = (record) => withStore('readwrite', (store) => store.add(record));
    const deleteImage = (id) => withStore('readwrite', (store) => store.delete(id));

    /** Stable id for one stored image, with a fallback for old browsers. */
    function newImageId() {
      try {
        return window.crypto.randomUUID();
      } catch {
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      }
    }

    /** A file's identity for duplicate detection across imports. */
    function fingerprintOf(file) {
      return `${file.webkitRelativePath || file.name}|${file.size}|${file.lastModified ?? 0}`;
    }

    /** Accept images even when the browser reports an empty MIME type. */
    function looksLikeImage(file) {
      return file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif|bmp|svg|heic|heif)$/i.test(file.name);
    }

    /**
     * Render the sidebar glyph at the size the sidebar asks for.
     * @param props - the sidebar's icon share: requested edge and selection state.
     * @returns the icon element.
     */
    function GalleryPanelIcon({ size }) {
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
        h('rect', { x: 3.25, y: 4.75, width: 17.5, height: 14.5, rx: 2.5 }),
        h('circle', { cx: 8.5, cy: 9.5, r: 1.5 }),
        h('path', { d: 'M4 17l5-5 3.5 3.5L15 13l5 4.5' }),
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'sidebar-gallery: dictionaries');
        const t = ctx.locale.bind(NS);

        /** Format a stored timestamp in the active locale. */
        function formatDate(timestamp) {
          try {
            return new Intl.DateTimeFormat(ctx.locale.getLocale().active, {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(timestamp);
          } catch {
            return new Date(timestamp).toLocaleString();
          }
        }

        /** Send one gallery blob into a conversation as an image attachment. */
        async function sendImageToSession(sessionId, blob, name, caption) {
          const sessions = ctx.get('sessions');
          if (!sessions) throw new Error('sessions-unavailable');
          const file = new File([blob], name || 'image.png', { type: blob.type || 'image/png' });
          const reference = sessions.retain(sessionId, { source: 'controllerOperation' });
          try {
            const binding = await reference.ready;
            const conversation = binding.ctx.get('conversation');
            if (!conversation) throw new Error('conversation-unavailable');
            if (typeof conversation.createDrafts !== 'function' || typeof conversation.sendSession !== 'function') {
              throw new Error('conversation-unavailable');
            }
            const drafts = conversation.createDrafts(sessionId, [file], false);
            const draft = drafts && drafts[0];
            if (!draft) throw new Error('attachment-unavailable');
            let outcome;
            try {
              outcome = await conversation.sendSession(binding.session, caption, [draft.id], 'queue');
            } catch (error) {
              conversation.releaseDraftAttachment?.(draft.id);
              throw error;
            }
            if (!outcome || outcome.kind !== 'success') {
              conversation.releaseDraftAttachment?.(draft.id);
              throw new Error('send-failed');
            }
          } finally {
            reference.release();
          }
        }

        /** Put one image on the system clipboard as PNG for other plugins to paste. */
        async function copyImageBlob(blob) {
          if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
            throw new Error('clipboard-unavailable');
          }
          let png = blob;
          if (blob.type !== 'image/png') {
            const bitmap = await createImageBitmap(blob);
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const context = canvas.getContext('2d');
            if (!context) throw new Error('canvas-unavailable');
            context.drawImage(bitmap, 0, 0);
            png = await new Promise((resolve, reject) => {
              canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('encode-failed'))), 'image/png');
            });
            bitmap.close?.();
          }
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
        }

        /** Download the selected original through the browser. */
        function downloadImageBlob(blob, name) {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = name || 'image';
          anchor.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        /**
         * The global image page opened by the sidebar entry.
         * @returns the gallery page.
         */
        function GalleryPage(props) {
          const [images, setImages] = React.useState([]);
          const [loading, setLoading] = React.useState(true);
          const [error, setError] = React.useState('');
          const [dragActive, setDragActive] = React.useState(false);
          const [busy, setBusy] = React.useState(false);
          const [autoBusy, setAutoBusy] = React.useState(false);
          const [autoStatus, setAutoStatus] = React.useState('');
          const [selectedId, setSelectedId] = React.useState(null);
          const [zoom, setZoom] = React.useState(1);
          const [pan, setPan] = React.useState({ x: 0, y: 0 });
          const [dragging, setDragging] = React.useState(false);
          const [maximized, setMaximized] = React.useState(false);
          const [shareOpen, setShareOpen] = React.useState(false);
          const [shareSessionId, setShareSessionId] = React.useState('');
          const [shareCaption, setShareCaption] = React.useState('');
          const [shareBusy, setShareBusy] = React.useState(false);
          const [shareNotice, setShareNotice] = React.useState(null);
          const inputRef = React.useRef(null);
          const folderInputRef = React.useRef(null);
          const dialogRef = React.useRef(null);
          const stageRef = React.useRef(null);
          const imageRef = React.useRef(null);
          const dragRef = React.useRef(null);
          const dragDepth = React.useRef(0);
          const imagesRef = React.useRef(images);
          imagesRef.current = images;

          const sessionState = typeof props.useSessions === 'function'
            ? props.useSessions((state) => state)
            : null;
          const sessionOptions = React.useMemo(() => {
            if (!sessionState) return [];
            return sessionState.ids
              .map((id) => sessionState.byId[id])
              .filter(Boolean)
              .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
              .slice(0, 50)
              .map((session) => ({
                id: session.id,
                title: session.displayTitle || session.id,
                updatedAt: session.updatedAt,
              }));
          }, [sessionState]);

          React.useEffect(() => {
            let cancelled = false;
            listImages()
              .then((records) => {
                if (cancelled) return;
                const items = records
                  .slice()
                  .sort((a, b) => b.addedAt - a.addedAt)
                  .map((record) => ({ ...record, url: URL.createObjectURL(record.blob) }));
                setImages(items);
                setLoading(false);
              })
              .catch(() => {
                if (cancelled) return;
                setError(t('unavailable'));
                setLoading(false);
              });
            return () => {
              cancelled = true;
            };
          }, []);

          React.useEffect(
            () => () => {
              for (const item of imagesRef.current) URL.revokeObjectURL(item.url);
            },
            [],
          );

          const selected = images.find((item) => item.id === selectedId) ?? null;

          const clampPan = (scale, value) => {
            const stage = stageRef.current;
            const image = imageRef.current;
            if (!stage || !image) return value;
            const width = image.clientWidth || 0;
            const height = image.clientHeight || 0;
            if (!width || !height) return value;
            const maxX = Math.max(0, (width * scale - stage.clientWidth) / 2);
            const maxY = Math.max(0, (height * scale - stage.clientHeight) / 2);
            return {
              x: Math.min(maxX, Math.max(-maxX, value.x)),
              y: Math.min(maxY, Math.max(-maxY, value.y)),
            };
          };

          const zoomBy = (delta) => {
            setZoom((current) => Math.min(6, Math.max(1, Math.round((current + delta) * 100) / 100)));
          };

          const resetZoom = () => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          };

          const toggleMaximized = () => {
            resetZoom();
            setMaximized((current) => !current);
          };

          const openShare = () => {
            resetZoom();
            setShareCaption('');
            setShareNotice(null);
            setShareOpen(true);
          };

          const closeShare = () => {
            if (shareBusy) return;
            setShareOpen(false);
            setShareNotice(null);
          };

          const sendToSession = async () => {
            if (!selected || !shareSessionId || shareBusy) return;
            if (selected.blob.size > 20 * 1024 * 1024) {
              setShareNotice({ level: 'error', text: t('imageTooLarge') });
              return;
            }
            setShareBusy(true);
            setShareNotice(null);
            try {
              await sendImageToSession(shareSessionId, selected.blob, selected.name, shareCaption.trim());
              setShareNotice({ level: 'ok', text: t('sentToSession'), action: 'send' });
              setShareCaption('');
            } catch (sendError) {
              console.error('[gallery] send failed', sendError);
              setShareNotice({ level: 'error', text: t('sendFailed') });
            } finally {
              setShareBusy(false);
            }
          };

          const openTargetSession = () => {
            if (!shareSessionId) return;
            try {
              ctx.get('uiWorkspace')?.openSession(shareSessionId);
              dialogRef.current?.close();
            } catch (openError) {
              console.error('[gallery] open conversation failed', openError);
            }
          };

          const copyImage = async () => {
            if (!selected) return;
            try {
              await copyImageBlob(selected.blob);
              setShareNotice({ level: 'ok', text: t('copied') });
            } catch (copyError) {
              console.error('[gallery] copy failed', copyError);
              setShareNotice({ level: 'error', text: t('copyFailed') });
            }
          };

          const downloadImage = () => {
            if (!selected) return;
            downloadImageBlob(selected.blob, selected.name);
          };

          React.useEffect(() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
            setDragging(false);
            setMaximized(false);
            setShareOpen(false);
            setShareSessionId('');
            setShareCaption('');
            setShareNotice(null);
            dragRef.current = null;
          }, [selectedId]);

          React.useEffect(() => {
            if (!shareOpen) return;
            if (shareSessionId && sessionOptions.some((option) => option.id === shareSessionId)) return;
            setShareSessionId(sessionOptions[0]?.id ?? '');
          }, [shareOpen, sessionOptions, shareSessionId]);

          React.useEffect(() => {
            if (zoom <= 1) {
              setPan((current) => (current.x === 0 && current.y === 0 ? current : { x: 0, y: 0 }));
              return;
            }
            setPan((current) => clampPan(zoom, current));
          }, [zoom]);

          React.useEffect(() => {
            if (!selected) return undefined;
            const stage = stageRef.current;
            const onWheel = (event) => {
              event.preventDefault();
              setZoom((current) =>
                Math.min(6, Math.max(1, current + (event.deltaY > 0 ? -0.25 : 0.25))),
              );
            };
            const onKeyDown = (event) => {
              const tag = event.target?.tagName;
              if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
              if (event.key === '+' || event.key === '=') {
                event.preventDefault();
                setZoom((current) => Math.min(6, current + 0.5));
              } else if (event.key === '-' || event.key === '_') {
                event.preventDefault();
                setZoom((current) => Math.max(1, current - 0.5));
              } else if (event.key === '0') {
                event.preventDefault();
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }
            };
            stage?.addEventListener('wheel', onWheel, { passive: false });
            window.addEventListener('keydown', onKeyDown);
            return () => {
              stage?.removeEventListener('wheel', onWheel);
              window.removeEventListener('keydown', onKeyDown);
            };
          }, [selected]);

          const onImagePointerDown = (event) => {
            if (zoom <= 1) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture?.(event.pointerId);
            dragRef.current = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              panX: pan.x,
              panY: pan.y,
            };
            setDragging(true);
          };

          const onImagePointerMove = (event) => {
            const drag = dragRef.current;
            if (!drag || drag.id !== event.pointerId) return;
            setPan(
              clampPan(zoom, {
                x: drag.panX + event.clientX - drag.x,
                y: drag.panY + event.clientY - drag.y,
              }),
            );
          };

          const onImagePointerUp = (event) => {
            if (!dragRef.current || dragRef.current.id !== event.pointerId) return;
            dragRef.current = null;
            setDragging(false);
            event.currentTarget.releasePointerCapture?.(event.pointerId);
          };

          React.useEffect(() => {
            const dialog = dialogRef.current;
            if (!dialog) return;
            if (selected) {
              if (!dialog.open) dialog.showModal();
            } else if (dialog.open) {
              dialog.close();
            }
          }, [selected]);

          const addFiles = async (fileList) => {
            if (busy || autoBusy || loading) return;
            setAutoStatus('');
            const files = Array.from(fileList ?? []);
            if (files.length === 0) return;
            const accepted = files.filter((file) => looksLikeImage(file) && file.size <= MAX_BYTES);
            if (accepted.length === 0) {
              setError(t('notImages'));
              return;
            }
            setBusy(true);
            const added = [];
            let failed = false;
            for (const file of accepted) {
              const record = {
                id: newImageId(),
                name: file.webkitRelativePath || file.name || t('image'),
                type: file.type,
                size: file.size,
                addedAt: Date.now(),
                fingerprint: fingerprintOf(file),
                blob: file,
              };
              try {
                await insertImage(record);
                added.push({ ...record, url: URL.createObjectURL(file) });
              } catch {
                failed = true;
              }
            }
            if (added.length > 0) {
              const next = added.slice().reverse();
              setImages((current) => [...next, ...current]);
            }
            if (failed) setError(t('saveFailed'));
            else if (accepted.length < files.length) setError(t('skipped'));
            else setError('');
            setBusy(false);
          };

          // A folder import adds every image it finds, skipping files already in
          // the gallery. Duplicates are detected by relative path, size and
          // last-modified time; records written before this field existed fall
          // back to name + size.
          const importFolder = async (fileList) => {
            if (busy || autoBusy || loading) return;
            const files = Array.from(fileList ?? []);
            if (files.length === 0) return;
            const accepted = files.filter((file) => looksLikeImage(file) && file.size <= MAX_BYTES);
            if (accepted.length === 0) {
              setAutoStatus(t('autoNone'));
              return;
            }
            setAutoBusy(true);
            setError('');
            const seen = new Set();
            const legacy = new Set();
            for (const item of images) {
              if (item.fingerprint) seen.add(item.fingerprint);
              else legacy.add(`${item.name}|${item.size}`);
            }
            let skipped = files.length - accepted.length;
            let failed = 0;
            const added = [];
            for (let index = 0; index < accepted.length; index += 1) {
              const file = accepted[index];
              const fingerprint = fingerprintOf(file);
              const loose = `${file.name}|${file.size}`;
              if (seen.has(fingerprint) || legacy.has(loose)) {
                skipped += 1;
              } else {
                const record = {
                  id: newImageId(),
                  name: file.webkitRelativePath || file.name || t('image'),
                  type: file.type,
                  size: file.size,
                  addedAt: Date.now(),
                  fingerprint,
                  blob: file,
                };
                try {
                  await insertImage(record);
                  added.push({ ...record, url: URL.createObjectURL(file) });
                  seen.add(fingerprint);
                } catch {
                  failed += 1;
                  skipped += 1;
                }
              }
              if (index % 5 === 0 || index === accepted.length - 1) {
                setAutoStatus(
                  t('autoProgress')
                    .replace('{done}', String(index + 1))
                    .replace('{total}', String(accepted.length)),
                );
              }
            }
            if (added.length > 0) {
              const next = added.slice().reverse();
              setImages((current) => [...next, ...current]);
            }
            setAutoStatus(
              t('autoDone')
                .replace('{n}', String(added.length))
                .replace('{m}', String(skipped)),
            );
            if (failed > 0) setError(t('saveFailed'));
            setAutoBusy(false);
          };

          const deleteSelected = async () => {
            if (!selected) return;
            const target = selected;
            try {
              await deleteImage(target.id);
              URL.revokeObjectURL(target.url);
              setImages((current) => current.filter((item) => item.id !== target.id));
              setSelectedId(null);
            } catch {
              setError(t('deleteFailed'));
            }
          };

          const draggingFiles = (event) =>
            Array.from(event.dataTransfer?.types ?? []).includes('Files');

          const onDragEnter = (event) => {
            if (!draggingFiles(event)) return;
            event.preventDefault();
            dragDepth.current += 1;
            setDragActive(true);
          };
          const onDragOver = (event) => {
            if (!draggingFiles(event)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
          };
          const onDragLeave = () => {
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragActive(false);
          };
          const onDrop = (event) => {
            if (!draggingFiles(event)) return;
            event.preventDefault();
            dragDepth.current = 0;
            setDragActive(false);
            void addFiles(event.dataTransfer.files);
          };

          const countLabel = t('count').replace('{n}', String(images.length));

          return h(
            'div',
            { className: 'dsh-gallery-page', onDragEnter, onDragOver, onDragLeave, onDrop },
            h('style', { key: 'styles' }, CSS),
            dragActive ? h('div', { className: 'dsh-gallery-drop' }, h('span', null, t('drop'))) : null,
            h(
              'header',
              { className: 'dsh-gallery-head', 'data-window-drag': true },
              h(
                'div',
                { className: 'dsh-gallery-heading' },
                h('h1', { className: 'dsh-gallery-title' }, t('title')),
                h('p', { className: 'dsh-gallery-intro' }, t('intro')),
              ),
              h(
                'div',
                { className: 'dsh-gallery-toolbar' },
                images.length > 0
                  ? h('span', { className: 'dsh-gallery-count' }, countLabel)
                  : null,
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-gallery-btn',
                    onClick: () => folderInputRef.current?.click(),
                    disabled: busy || autoBusy || loading,
                    title: t('autoHint'),
                  },
                  t('autoAdd'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-gallery-btn dsh-gallery-btn-primary',
                    onClick: () => inputRef.current?.click(),
                    disabled: busy || autoBusy || loading,
                  },
                  t('add'),
                ),
              ),
            ),
            h('input', {
              ref: inputRef,
              type: 'file',
              accept: 'image/*',
              multiple: true,
              hidden: true,
              onChange: (event) => {
                const input = event.currentTarget;
                const files = input.files;
                if (files && files.length > 0) void addFiles(files);
                input.value = '';
              },
            }),
            h('input', {
              ref: folderInputRef,
              type: 'file',
              multiple: true,
              hidden: true,
              webkitdirectory: '',
              directory: '',
              onChange: (event) => {
                const input = event.currentTarget;
                const files = input.files;
                if (files && files.length > 0) void importFolder(files);
                input.value = '';
              },
            }),
            h(
              'div',
              { className: 'dsh-gallery-body' },
              error ? h('p', { className: 'dsh-gallery-error', role: 'alert' }, error) : null,
              autoStatus ? h('p', { className: 'dsh-gallery-status', role: 'status' }, autoStatus) : null,
              loading
                ? h('p', { className: 'dsh-gallery-status', role: 'status' }, t('loading'))
                : images.length === 0
                  ? h(
                      'div',
                      { className: 'dsh-gallery-empty' },
                      h('span', { className: 'dsh-gallery-empty-title' }, t('empty')),
                      h('span', { className: 'dsh-gallery-empty-hint' }, t('emptyHint')),
                    )
                  : h(
                      'ul',
                      { className: 'dsh-gallery-grid' },
                      images.map((item) =>
                        h(
                          'li',
                          { key: item.id, className: 'dsh-gallery-item' },
                          h(
                            'button',
                            {
                              type: 'button',
                              className: 'dsh-gallery-card',
                              'aria-label': `${t('open')} ${item.name}`,
                              onClick: () => setSelectedId(item.id),
                            },
                            h('img', {
                              className: 'dsh-gallery-thumb',
                              src: item.url,
                              alt: item.name,
                              loading: 'lazy',
                              decoding: 'async',
                            }),
                            h(
                              'span',
                              { className: 'dsh-gallery-caption' },
                              h('span', { className: 'dsh-gallery-name' }, item.name),
                              h('span', { className: 'dsh-gallery-size' }, formatBytes(item.size)),
                            ),
                          ),
                        ),
                      ),
                    ),
              h('p', { className: 'dsh-gallery-status' }, t('local')),
            ),
            h(
              'dialog',
              {
                ref: dialogRef,
                className: `dsh-gallery-dialog${maximized ? ' dsh-gallery-max' : ''}${shareOpen ? ' dsh-gallery-share-open' : ''}`,
                'aria-label': selected ? selected.name : t('title'),
                onClose: () => setSelectedId(null),
                onClick: (event) => {
                  if (event.target === dialogRef.current) event.currentTarget.close();
                },
              },
              selected
                ? h(
                    React.Fragment,
                    null,
                    h(
                      'div',
                      { className: 'dsh-gallery-dialog-head' },
                      h('h2', { className: 'dsh-gallery-dialog-title' }, selected.name),
                      h(
                        'div',
                        { className: 'dsh-gallery-zoom' },
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'dsh-gallery-icon-btn',
                            title: t('zoomOut'),
                            'aria-label': t('zoomOut'),
                            disabled: zoom <= 1,
                            onClick: () => zoomBy(-0.5),
                          },
                          '\u2212',
                        ),
                        h('span', { className: 'dsh-gallery-zoom-level' }, `${Math.round(zoom * 100)}%`),
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'dsh-gallery-icon-btn',
                            title: t('zoomIn'),
                            'aria-label': t('zoomIn'),
                            disabled: zoom >= 6,
                            onClick: () => zoomBy(0.5),
                          },
                          '+',
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'dsh-gallery-btn dsh-gallery-zoom-reset',
                            disabled: zoom === 1,
                            onClick: resetZoom,
                          },
                          t('resetZoom'),
                        ),
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'dsh-gallery-icon-btn',
                          title: maximized ? t('restore') : t('maximize'),
                          'aria-label': maximized ? t('restore') : t('maximize'),
                          'aria-pressed': maximized,
                          onClick: toggleMaximized,
                        },
                        maximized ? '\u2921' : '\u2922',
                      ),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'dsh-gallery-icon-btn',
                          'aria-label': t('close'),
                          onClick: () => dialogRef.current?.close(),
                        },
                        '\u00d7',
                      ),
                    ),
                    h(
                      'div',
                      { className: 'dsh-gallery-dialog-stage', ref: stageRef },
                      h('img', {
                        ref: imageRef,
                        className: 'dsh-gallery-dialog-image',
                        src: selected.url,
                        alt: selected.name,
                        draggable: false,
                        style: {
                          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                          cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
                          transition: dragging ? 'none' : 'transform 120ms ease',
                        },
                        onLoad: () => setPan((current) => clampPan(zoom, current)),
                        onDragStart: (event) => event.preventDefault(),
                        onDoubleClick: () => {
                          if (zoom > 1) resetZoom();
                          else setZoom(2.5);
                        },
                        onPointerDown: onImagePointerDown,
                        onPointerMove: onImagePointerMove,
                        onPointerUp: onImagePointerUp,
                        onPointerCancel: onImagePointerUp,
                      }),
                    ),
                    shareOpen
                      ? h(
                          'div',
                          { className: 'dsh-gallery-share' },
                          h('div', { className: 'dsh-gallery-share-title' }, t('shareTitle')),
                          h(
                            'div',
                            { className: 'dsh-gallery-share-grid' },
                            h(
                              'label',
                              { className: 'dsh-gallery-field' },
                              h('span', { className: 'dsh-gallery-field-label' }, t('sendToSession')),
                              h(
                                'select',
                                {
                                  className: 'dsh-gallery-input',
                                  value: shareSessionId,
                                  disabled: shareBusy || sessionOptions.length === 0,
                                  onChange: (event) => {
                                    setShareSessionId(event.target.value);
                                    setShareNotice(null);
                                  },
                                },
                                sessionOptions.length === 0
                                  ? h('option', { value: '' }, t('noSessions'))
                                  : sessionOptions.map((option) =>
                                      h(
                                        'option',
                                        { key: option.id, value: option.id },
                                        `${option.title} · ${formatDate(option.updatedAt)}`,
                                      ),
                                    ),
                              ),
                            ),
                            h(
                              'label',
                              { className: 'dsh-gallery-field' },
                              h('span', { className: 'dsh-gallery-field-label' }, t('caption')),
                              h('input', {
                                type: 'text',
                                className: 'dsh-gallery-input',
                                value: shareCaption,
                                maxLength: 500,
                                placeholder: t('captionPlaceholder'),
                                disabled: shareBusy,
                                onChange: (event) => setShareCaption(event.target.value),
                              }),
                            ),
                          ),
                          h(
                            'div',
                            { className: 'dsh-gallery-share-actions' },
                            h(
                              'button',
                              {
                                type: 'button',
                                className: 'dsh-gallery-btn dsh-gallery-btn-primary',
                                disabled: !shareSessionId || shareBusy || sessionOptions.length === 0,
                                onClick: () => void sendToSession(),
                              },
                              shareBusy ? t('sending') : t('send'),
                            ),
                            shareNotice?.level === 'ok' && shareNotice.action === 'send' && shareSessionId
                              ? h(
                                  'button',
                                  { type: 'button', className: 'dsh-gallery-btn', onClick: openTargetSession },
                                  t('openConversation'),
                                )
                              : null,
                          ),
                          h(
                            'div',
                            { className: 'dsh-gallery-share-actions' },
                            h('span', { className: 'dsh-gallery-share-label' }, t('sendToPlugin')),
                            h(
                              'button',
                              {
                                type: 'button',
                                className: 'dsh-gallery-btn',
                                onClick: () => void copyImage(),
                              },
                              t('copyImage'),
                            ),
                            h(
                              'button',
                              {
                                type: 'button',
                                className: 'dsh-gallery-btn',
                                onClick: downloadImage,
                              },
                              t('download'),
                            ),
                          ),
                          h('p', { className: 'dsh-gallery-share-hint' }, t('pluginHint')),
                          shareNotice
                            ? h(
                                'p',
                                {
                                  className: 'dsh-gallery-share-note',
                                  'data-level': shareNotice.level,
                                  role: 'status',
                                },
                                shareNotice.text,
                              )
                            : null,
                        )
                      : null,
                    h(
                      'div',
                      { className: 'dsh-gallery-dialog-foot' },
                      h(
                        'span',
                        { className: 'dsh-gallery-meta' },
                        `${formatBytes(selected.size)} · ${formatDate(selected.addedAt)} · ${t('zoomHint')}`,
                      ),
                      h(
                        'div',
                        { className: 'dsh-gallery-dialog-actions' },
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'dsh-gallery-btn',
                            disabled: shareBusy,
                            onClick: shareOpen ? closeShare : openShare,
                          },
                          shareOpen ? t('closeShare') : t('share'),
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'dsh-gallery-btn dsh-gallery-btn-danger',
                            disabled: shareBusy,
                            onClick: () => void deleteSelected(),
                          },
                          t('remove'),
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
            GalleryPage,
          ),
        );

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 30,
              label: () => t('panel'),
              locale: NS,
            },
            GalleryPanelIcon,
          ),
        );
      },
    };
  },
});
