/**
 * Top navigation for the local panel entries, New Session, and Workspaces.
 *
 * Moves the plugin entry row and the left rail's primary actions into a
 * frame-wide bar in `shell.overlay`. The sidebar is auto-collapsed to its rail
 * so the top bar is the primary navigation; the rail keeps brand and settings.
 */
window.__ModuleLoader__.load({
  id: '@local/top-nav',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'localTopNav';

    const en = {
      nav: 'Main navigation',
      chat: 'Chat',
      plugins: 'Plugins',
      schedules: 'Schedules',
      notes: 'Notes',
      gallery: 'Gallery',
      newSession: 'New session',
      workspace: 'Workspaces',
      settings: 'Settings',
      expandSidebar: 'Show sidebar',
      collapseSidebar: 'Hide sidebar',
      allSessions: 'All sessions',
      noWorkspaces: 'No workspaces yet',
      noSessions: 'No sessions yet',
      archive: 'Archive',
      unarchive: 'Unarchive',
      archived: 'Archived',
      cut: 'Cut',
      copy: 'Copy',
      paste: 'Paste',
      selectAll: 'Select all',
      openSession: 'Open session',
      archiveSession: 'Archive session',
      unarchiveSession: 'Unarchive session',
      deleteSession: 'Delete session (archive)',
      deleteConfirm: 'Permanent deletion is not available. Stop and archive this session, removing it from the active list?',
      copySessionTitle: 'Copy session title',
      openLink: 'Open link',
      copyLink: 'Copy link address',
      copyImage: 'Copy image',
      saveImage: 'Save image',
      openImage: 'Open image in new tab',
      backToSession: 'Back to chat',
      refresh: 'Refresh page',
    };

    const zh = {
      nav: '主导航',
      chat: '会话',
      plugins: '插件',
      schedules: '日程',
      notes: '笔记',
      gallery: '图片库',
      newSession: '新会话',
      workspace: '工作区',
      settings: '设置',
      expandSidebar: '展开侧栏',
      collapseSidebar: '收起侧栏',
      allSessions: '全部会话',
      noWorkspaces: '暂无工作区',
      noSessions: '暂无会话',
      archive: '归档',
      unarchive: '取消归档',
      archived: '已归档',
      cut: '剪切',
      copy: '复制',
      paste: '粘贴',
      selectAll: '全选',
      openSession: '打开会话',
      archiveSession: '归档会话',
      unarchiveSession: '取消归档',
      deleteSession: '删除会话（归档）',
      deleteConfirm: '当前版本不支持永久删除。将停止并归档该会话，并从活动列表移除，确定吗？',
      copySessionTitle: '复制会话标题',
      openLink: '打开链接',
      copyLink: '复制链接地址',
      copyImage: '复制图片',
      saveImage: '图片另存为',
      openImage: '新标签页打开图片',
      backToSession: '回到会话',
      refresh: '刷新页面',
    };

    const CSS = `
      html:not(.dsh-topnav-sidebar-open) #root [class*="panelList"] { display: none !important; }
      html:not(.dsh-topnav-sidebar-open) #root [class*="regionArea"] { display: none !important; }
      html:not(.dsh-topnav-sidebar-open) #root [class*="newSession"] { display: none !important; }
      #root > div[class*="frame"],
      #root > div > div[class*="frame"] {
        box-sizing: border-box !important;
        padding-top: calc(var(--dsh-frame-chrome-top, 0px) + 78px) !important;
      }
      html:not(.dsh-topnav-sidebar-open) #root > div[class*="frame"] > div[class*="sidebarCol"] {
        width: 0 !important;
        min-width: 0 !important;
        overflow: hidden !important;
        border-right: 0 !important;
      }
      html.dsh-topnav-sidebar-open #root > div[class*="frame"] > div[class*="sidebarCol"] {
        width: auto !important;
        min-width: 0 !important;
        overflow: hidden !important;
        border-right: 0.5px solid var(--dsw-alias-border-l3) !important;
      }
      html:not(.dsh-topnav-sidebar-open) #root > div[class*="frame"] > div[class*="sidebarCol"] [class*="toggle"] {
        display: none !important;
      }
      #root > div[class*="frame"] > div[class*="sidebarCol"] [class*="toggle"] {
        display: none !important;
      }
      #root > div[class*="frame"] > div[class*="sidebarCol"] [class*="footArea"] {
        display: block !important;
      }
      .dsh-top-nav {
        position: fixed;
        z-index: 999;
        top: var(--dsh-frame-chrome-top, 0px);
        left: 0;
        right: 0;
        height: 44px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-sizing: border-box;
        padding: 0 14px;
        border-bottom: 1px solid var(--dsw-alias-border-l1);
        background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-label-primary);
        pointer-events: auto;
        -webkit-app-region: no-drag;
      }
      html[data-platform='darwin'] .dsh-top-nav { padding-left: 84px; }
      .dsh-top-nav-brand {
        flex: none;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        color: var(--dsw-alias-label-secondary);
      }
      .dsh-top-nav-items {
        display: flex;
        flex: 1;
        align-items: center;
        gap: 2px;
        min-width: 0;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .dsh-top-nav-items::-webkit-scrollbar { display: none; }
      .dsh-top-nav-btn {
        flex: none;
        height: 30px;
        padding: 0 12px;
        border: 1px solid transparent;
        border-radius: 8px;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 12px;
        line-height: 1;
        cursor: pointer;
        white-space: nowrap;
      }
      .dsh-top-nav-btn:hover {
        background: var(--dsw-alias-bg-overlay);
        color: var(--dsw-alias-label-primary);
      }
      .dsh-top-nav-btn[data-active='true'] {
        border-color: var(--dsw-alias-border-l1);
        background: var(--dsw-alias-bg-overlay);
        color: var(--dsw-alias-brand-primary);
      }
      .dsh-top-nav-btn:focus-visible {
        outline: 2px solid var(--dsw-alias-brand-primary);
        outline-offset: 1px;
      }
      .dsh-top-nav-new {
        flex: none;
        height: 30px;
        padding: 0 12px;
        border: 1px solid var(--dsw-alias-brand-primary);
        border-radius: 8px;
        background: var(--dsw-alias-brand-primary);
        color: var(--dsw-alias-label-on-brand, #fff);
        font: inherit;
        font-size: 12px;
        cursor: pointer;
        white-space: nowrap;
      }
      .dsh-top-sessions {
        position: fixed;
        z-index: 998;
        top: calc(var(--dsh-frame-chrome-top, 0px) + 44px);
        left: 0;
        right: 0;
        height: 34px;
        display: flex;
        align-items: center;
        gap: 5px;
        box-sizing: border-box;
        padding: 0 14px;
        overflow-x: auto;
        overflow-y: hidden;
        border-bottom: 1px solid var(--dsw-alias-border-l1);
        background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-label-secondary);
        pointer-events: auto;
        -webkit-app-region: no-drag;
        scrollbar-width: thin;
        scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent;
      }
      .dsh-top-sessions::-webkit-scrollbar { height: 4px; }
      .dsh-top-sessions::-webkit-scrollbar-thumb {
        border-radius: 2px;
        background: var(--dsw-alias-scrollbar-bg-l2);
      }
      html[data-platform='darwin'] .dsh-top-sessions { padding-left: 84px; }
      .dsh-top-sessions-label {
        flex: none;
        padding-right: 4px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--dsw-alias-label-secondary);
      }
      .dsh-top-session-workspace {
        flex: none;
        padding: 0 4px 0 10px;
        border-left: 1px solid var(--dsw-alias-border-l1);
        font-size: 10px;
        font-weight: 600;
        color: var(--dsw-alias-label-secondary);
        white-space: nowrap;
      }
      .dsh-top-session-btn {
        flex: none;
        max-width: 180px;
        height: 24px;
        padding: 0 8px;
        overflow: hidden;
        border: 1px solid transparent;
        border-radius: 6px;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 11px;
        line-height: 1;
        text-overflow: ellipsis;
        white-space: nowrap;
        cursor: pointer;
      }
      .dsh-top-session-btn:hover {
        background: var(--dsw-alias-bg-overlay);
        color: var(--dsw-alias-label-primary);
      }
      .dsh-top-session-btn[data-active='true'] {
        border-color: var(--dsw-alias-border-l1);
        background: var(--dsw-alias-bg-overlay);
        color: var(--dsw-alias-brand-primary);
      }
      .dsh-top-session-empty {
        flex: none;
        font-size: 11px;
        color: var(--dsw-alias-label-secondary);
      }
      .dsh-top-nav-menu { position: relative; flex: none; }
      .dsh-top-nav-menu .dsh-top-nav-btn { padding: 0 10px; }
      .dsh-top-nav-dropdown {
        position: absolute;
        top: calc(100% + 6px);
        right: 0;
        width: 300px;
        max-height: min(60vh, 420px);
        overflow: auto;
        box-sizing: border-box;
        padding: 6px;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 10px;
        background: var(--dsw-alias-bg-layer-1);
        box-shadow: 0 12px 30px rgb(0 0 0 / 0.28);
      }
      .dsh-top-nav-workspace { padding: 4px 0; }
      .dsh-top-nav-workspace + .dsh-top-nav-workspace {
        border-top: 1px solid var(--dsw-alias-border-l1);
      }
      .dsh-top-nav-workspace-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        width: 100%;
        padding: 6px 8px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--dsw-alias-label-primary);
        font: inherit;
        font-size: 12px;
        font-weight: 600;
        text-align: left;
        cursor: pointer;
      }
      .dsh-top-nav-workspace-title:hover { background: var(--dsw-alias-bg-overlay); }
      .dsh-top-nav-workspace-title span:last-child {
        overflow: hidden;
        color: var(--dsw-alias-label-secondary);
        font-weight: 400;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .dsh-top-nav-session {
        display: block;
        width: 100%;
        padding: 5px 8px 5px 18px;
        overflow: hidden;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 12px;
        text-align: left;
        text-overflow: ellipsis;
        white-space: nowrap;
        cursor: pointer;
      }
      .dsh-top-nav-session:hover {
        background: var(--dsw-alias-bg-overlay);
        color: var(--dsw-alias-label-primary);
      }
      .dsh-top-nav-session-row {
        display: flex;
        align-items: center;
        gap: 2px;
      }
      .dsh-top-nav-session-row .dsh-top-nav-session { flex: 1; min-width: 0; }
      .dsh-top-nav-session-static { cursor: default; }
      .dsh-top-nav-session-action {
        flex: none;
        height: 24px;
        padding: 0 6px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 10px;
        cursor: pointer;
      }
      .dsh-top-nav-session-action:hover {
        background: var(--dsw-alias-bg-overlay);
        color: var(--dsw-alias-state-error-primary);
      }
      .dsh-top-nav-workspace-heading {
        padding: 7px 8px 4px;
        font-size: 11px;
        font-weight: 600;
        color: var(--dsw-alias-label-secondary);
      }
      .dsh-ctx-menu {
        position: fixed;
        inset: auto;
        z-index: 10050;
        visibility: hidden;
        min-width: 190px;
        max-width: 280px;
        box-sizing: border-box;
        margin: 0;
        padding: 5px;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 10px;
        background: var(--dsw-alias-bg-layer-1);
        box-shadow: 0 12px 32px rgb(0 0 0 / 0.32);
        color: var(--dsw-alias-label-primary);
        font-size: 12px;
        pointer-events: auto;
      }
      .dsh-ctx-item {
        display: flex;
        align-items: center;
        width: 100%;
        min-height: 28px;
        padding: 5px 10px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: 12px;
        text-align: left;
        cursor: pointer;
      }
      .dsh-ctx-item:hover:not(:disabled),
      .dsh-ctx-item:focus-visible {
        outline: none;
        background: var(--dsw-alias-bg-overlay);
        color: var(--dsw-alias-label-primary);
      }
      .dsh-ctx-item:disabled {
        opacity: 0.42;
        cursor: default;
      }
      .dsh-ctx-sep {
        height: 1px;
        margin: 4px 6px;
        background: var(--dsw-alias-border-l1);
      }
      .dsh-top-nav-empty {
        margin: 0;
        padding: 10px;
        color: var(--dsw-alias-label-secondary);
        font-size: 12px;
      }
      @media (max-width: 760px) {
        .dsh-top-nav { gap: 6px; padding: 0 8px; }
        .dsh-top-nav-brand { display: none; }
        .dsh-top-nav-btn { padding: 0 8px; font-size: 11px; }
        .dsh-top-nav-new { padding: 0 8px; font-size: 11px; }
      }
    `;

    return {
      inject: ['slots', 'locale', 'layout'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'top-nav dictionaries');
        const t = ctx.locale.bind(NS);

        /** Install one document-wide custom context menu. */
        function installContextMenu(ctx, t) {
          let menu = null;

          const close = () => {
            if (menu) {
              menu.remove();
              menu = null;
            }
          };

          const copyText = async (text) => {
            if (text) await navigator.clipboard.writeText(text);
          };

          const copyImage = async (src) => {
            const response = await fetch(src);
            let png = await response.blob();
            if (png.type !== 'image/png') {
              const bitmap = await createImageBitmap(png);
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
          };

          const pasteInto = async (field) => {
            const text = await navigator.clipboard.readText();
            if (!text) return;
            field.focus();
            if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
              const start = field.selectionStart ?? field.value.length;
              const end = field.selectionEnd ?? start;
              field.setRangeText(text, start, end, 'end');
              field.dispatchEvent(new Event('input', { bubbles: true }));
              return;
            }
            document.execCommand('insertText', false, text);
          };

          const saveImage = (image) => {
            const src = image.currentSrc || image.src;
            const anchor = document.createElement('a');
            anchor.href = src;
            anchor.download = image.alt || 'image';
            anchor.click();
          };

          const openLink = (href) => {
            window.open(href, '_blank', 'noopener,noreferrer');
          };

          const buildItems = (event) => {
            const target = event.target instanceof Element ? event.target : null;
            const session = target?.closest('[data-dsh-session-id]');
            const link = target?.closest('a[href]');
            const image = target?.closest('img');
            const editable = target?.closest('input, textarea, [contenteditable="true"]');
            const selection = String(window.getSelection()?.toString() || '').trim();
            const items = [];
            const item = (label, action, disabled = false) => ({ label, action, disabled });
            const separator = () => ({ separator: true });

            if (session) {
              const sessionId = session.getAttribute('data-dsh-session-id');
              const title = session.getAttribute('data-dsh-session-title') || '';
              const archived = session.getAttribute('data-dsh-archived') === 'true';
              items.push(item(t('openSession'), () => ctx.get('uiWorkspace')?.openSession(sessionId)));
              items.push(item(
                archived ? t('unarchiveSession') : t('archiveSession'),
                async () => {
                  const workspace = ctx.get('uiWorkspace');
                  if (!workspace) return;
                  if (archived) await workspace.unarchiveSession(sessionId);
                  else await workspace.archiveSession(sessionId);
                },
              ));
              if (!archived) {
                items.push(item(t('deleteSession'), async () => {
                  if (!window.confirm(t('deleteConfirm'))) return;
                  const workspace = ctx.get('uiWorkspace');
                  if (!workspace) return;
                  await workspace.archiveSession(sessionId, { stopActivity: true });
                }));
              }
              items.push(item(t('copySessionTitle'), () => copyText(title)));
            }

            if (editable) {
              items.push(item(t('cut'), () => document.execCommand('cut'), selection.length === 0));
              items.push(item(t('copy'), () => document.execCommand('copy'), selection.length === 0));
              items.push(item(t('paste'), () => pasteInto(editable)));
              items.push(item(t('selectAll'), () => {
                if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
                  editable.focus();
                  editable.select();
                } else {
                  editable.focus();
                  document.execCommand('selectAll');
                }
              }));
            } else if (selection) {
              items.push(item(t('copy'), () => copyText(selection)));
            }

            if (link) {
              items.push(item(t('openLink'), () => openLink(link.href)));
              items.push(item(t('copyLink'), () => copyText(link.href)));
            }

            if (image) {
              const src = image.currentSrc || image.src;
              items.push(item(t('copyImage'), () => copyImage(src)));
              items.push(item(t('saveImage'), () => saveImage(image)));
              items.push(item(t('openImage'), () => openLink(src)));
            }

            if (items.length > 0) items.push(separator());
            items.push(item(t('backToSession'), () => ctx.layout.selectPanel(null)));
            items.push(item(t('refresh'), () => window.location.reload()));
            return items;
          };

          const show = (event, items) => {
            close();
            const element = document.createElement('div');
            element.className = 'dsh-ctx-menu';
            element.setAttribute('role', 'menu');
            for (const entry of items) {
              if (entry.separator) {
                const line = document.createElement('div');
                line.className = 'dsh-ctx-sep';
                element.append(line);
                continue;
              }
              const button = document.createElement('button');
              button.type = 'button';
              button.className = 'dsh-ctx-item';
              button.setAttribute('role', 'menuitem');
              button.textContent = entry.label;
              button.disabled = entry.disabled;
              button.addEventListener('click', async (clickEvent) => {
                clickEvent.stopPropagation();
                close();
                try {
                  await entry.action();
                } catch (error) {
                  console.error('[context-menu] action failed', error);
                }
              });
              element.append(button);
            }
            document.body.append(element);
            element.setAttribute('popover', 'manual');
            if (typeof element.showPopover === 'function') {
              try {
                element.showPopover();
              } catch (error) {
                console.error('[context-menu] showPopover failed', error);
              }
            }
            menu = element;
            const rect = element.getBoundingClientRect();
            const margin = 8;
            let left = event.clientX;
            let top = event.clientY;
            if (left + rect.width > window.innerWidth - margin) {
              left = Math.max(margin, window.innerWidth - rect.width - margin);
            }
            if (top + rect.height > window.innerHeight - margin) {
              top = Math.max(margin, window.innerHeight - rect.height - margin);
            }
            element.style.left = `${left}px`;
            element.style.top = `${top}px`;
            element.style.visibility = 'visible';
            const first = element.querySelector('.dsh-ctx-item:not(:disabled)');
            if (first instanceof HTMLElement) first.focus();
          };

          const onContextMenu = (event) => {
            const target = event.target instanceof Element ? event.target : null;
            if (target?.closest('.dsh-ctx-menu')) return;
            const items = buildItems(event);
            if (items.length === 0) return;
            event.preventDefault();
            show(event, items);
          };

          const onPointerDown = (event) => {
            if (menu && !menu.contains(event.target)) close();
          };

          const onKeyDown = (event) => {
            if (!menu) return;
            if (event.key === 'Escape') {
              event.preventDefault();
              close();
              return;
            }
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
            event.preventDefault();
            const entries = [...menu.querySelectorAll('.dsh-ctx-item:not(:disabled)')];
            if (entries.length === 0) return;
            const current = entries.indexOf(document.activeElement);
            const delta = event.key === 'ArrowDown' ? 1 : -1;
            const next = entries[(current + delta + entries.length) % entries.length];
            next.focus();
          };

          const onDismiss = () => close();
          document.addEventListener('contextmenu', onContextMenu, true);
          document.addEventListener('pointerdown', onPointerDown, true);
          document.addEventListener('keydown', onKeyDown, true);
          document.addEventListener('scroll', onDismiss, true);
          window.addEventListener('resize', onDismiss);
          window.addEventListener('blur', onDismiss);
          return () => {
            close();
            document.removeEventListener('contextmenu', onContextMenu, true);
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown, true);
            document.removeEventListener('scroll', onDismiss, true);
            window.removeEventListener('resize', onDismiss);
            window.removeEventListener('blur', onDismiss);
          };
        }

        ctx.effect(() => installContextMenu(ctx, t), 'global context menu');

        ctx.effect(() => {
          const style = document.createElement('style');
          style.dataset.dshTopNav = 'true';
          style.textContent = CSS;
          document.head.append(style);
          return () => style.remove();
        }, 'top-nav styles');

        function TopNav(props) {
          const activePanelId = typeof props.usePanelInfo === 'function'
            ? props.usePanelInfo((info) => info.activePanelId)
            : null;
          const workspaceState = props.useWorkspaces((state) => state);
          const sessionState = props.useSessions((state) => state);
          const [menuOpen, setMenuOpen] = React.useState(false);
          const [sidebarOpen, setSidebarOpen] = React.useState(false);
          const [activeSessionId, setActiveSessionId] = React.useState(null);
          const menuRef = React.useRef(null);

          const workspaces = React.useMemo(() => {
            if (!workspaceState) return [];
            const archived = workspaceState.archivedSessionIds || [];
            return workspaceState.items.map((workspace) => ({
              ...workspace,
              sessions: (workspace.sessionIds || [])
                .map((id) => sessionState?.byId?.[id])
                .filter(Boolean)
                .filter((session) => !archived.includes(session.id)),
            }));
          }, [workspaceState, sessionState]);

          const archivedSessions = React.useMemo(() => {
            if (!workspaceState) return [];
            return (workspaceState.archivedSessionIds || [])
              .map((id) => sessionState?.byId?.[id])
              .filter(Boolean);
          }, [workspaceState, sessionState]);

          React.useEffect(() => {
            if (!menuOpen) return undefined;
            const onPointerDown = (event) => {
              if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
            };
            const onKeyDown = (event) => {
              if (event.key === 'Escape') setMenuOpen(false);
            };
            document.addEventListener('pointerdown', onPointerDown);
            document.addEventListener('keydown', onKeyDown);
            return () => {
              document.removeEventListener('pointerdown', onPointerDown);
              document.removeEventListener('keydown', onKeyDown);
            };
          }, [menuOpen]);

          React.useEffect(() => {
            const frame = document.querySelector('#root > div[class*="frame"]');
            if (!frame) return undefined;
            const removeSidebarTrack = () => {
              if (document.documentElement.classList.contains('dsh-topnav-sidebar-open')) return;
              const value = frame.style.gridTemplateColumns;
              if (!value) return;
              const next = value.replace(/^\s*\d+(?:\.\d+)?px/, '0px');
              if (next !== value) frame.style.gridTemplateColumns = next;
            };
            removeSidebarTrack();
            const observer = new MutationObserver(removeSidebarTrack);
            observer.observe(frame, { attributes: true, attributeFilter: ['style', 'class'] });
            return () => observer.disconnect();
          }, []);

          React.useEffect(() => {
            document.documentElement.classList.toggle('dsh-topnav-sidebar-open', sidebarOpen);
            const frame = document.querySelector('#root > div[class*="frame"]');
            if (!frame) return undefined;
            const collapsed = frame.hasAttribute('data-sidebar-collapsed');
            try {
              if (sidebarOpen && collapsed) ctx.layout.toggleSidebar();
              if (!sidebarOpen && !collapsed) ctx.layout.toggleSidebar();
            } catch (error) {
              console.error('[top-nav] toggle sidebar failed', error);
            }
            return () => {
              document.documentElement.classList.remove('dsh-topnav-sidebar-open');
            };
          }, [sidebarOpen]);

          const openPanel = (id) => {
            try {
              ctx.layout.selectPanel(id);
            } catch (error) {
              console.error('[top-nav] selectPanel failed', error);
            }
          };

          const startSession = () => {
            setMenuOpen(false);
            try {
              ctx.get('uiWorkspace')?.startSession();
            } catch (error) {
              console.error('[top-nav] startSession failed', error);
            }
          };

          const openWorkspace = (workspaceId) => {
            setMenuOpen(false);
            try {
              void ctx.get('uiWorkspace')?.openWorkspace(workspaceId);
            } catch (error) {
              console.error('[top-nav] openWorkspace failed', error);
            }
          };

          const openSession = (sessionId) => {
            setMenuOpen(false);
            setActiveSessionId(sessionId);
            try {
              ctx.get('uiWorkspace')?.openSession(sessionId);
            } catch (error) {
              console.error('[top-nav] openSession failed', error);
            }
          };

          const archiveSession = async (sessionId) => {
            setMenuOpen(false);
            try {
              await ctx.get('uiWorkspace')?.archiveSession(sessionId);
            } catch (error) {
              console.error('[top-nav] archiveSession failed', error);
            }
          };

          const unarchiveSession = async (sessionId) => {
            setMenuOpen(false);
            try {
              await ctx.get('uiWorkspace')?.unarchiveSession(sessionId);
            } catch (error) {
              console.error('[top-nav] unarchiveSession failed', error);
            }
          };

          const openSettings = () => {
            const trigger = document.querySelector('[data-slot="sidebar.settings"] button[aria-haspopup="dialog"]')
              || document.querySelector('#root [class*="sidebarCol"] button[aria-haspopup="dialog"]');
            if (trigger instanceof HTMLElement) trigger.click();
            else console.error('[top-nav] settings trigger not found');
          };

          const items = [
            { id: null, label: t('chat') },
            { id: 'plugins', label: t('plugins') },
            { id: 'schedules', label: t('schedules') },
            { id: 'notes', label: t('notes') },
            { id: 'gallery', label: t('gallery') },
          ];

          return h(
            React.Fragment,
            null,
            h(
              'nav',
              { className: 'dsh-top-nav', 'aria-label': t('nav') },
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-top-nav-btn dsh-top-nav-expand',
                title: sidebarOpen ? t('collapseSidebar') : t('expandSidebar'),
                'aria-label': sidebarOpen ? t('collapseSidebar') : t('expandSidebar'),
                'aria-expanded': sidebarOpen ? 'true' : 'false',
                onClick: () => setSidebarOpen((open) => !open),
              },
              sidebarOpen ? '\u00ab' : '\u2630',
            ),
            h('span', { className: 'dsh-top-nav-brand' }, 'DSH'),
            h(
              'div',
              { className: 'dsh-top-nav-items' },
              items.map((item) => {
                const active = item.id === null ? activePanelId === null : activePanelId === item.id;
                return h(
                  'button',
                  {
                    key: item.id ?? 'chat',
                    type: 'button',
                    className: 'dsh-top-nav-btn',
                    'data-active': active ? 'true' : 'false',
                    'aria-current': active ? 'page' : undefined,
                    onClick: () => openPanel(item.id),
                  },
                  item.label,
                );
              }),
            ),
            h(
              'button',
              { type: 'button', className: 'dsh-top-nav-new', onClick: startSession },
              `+ ${t('newSession')}`,
            ),
            h(
              'div',
              { className: 'dsh-top-nav-menu', ref: menuRef },
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-top-nav-btn',
                  'aria-haspopup': 'menu',
                  'aria-expanded': menuOpen ? 'true' : 'false',
                  onClick: () => setMenuOpen((open) => !open),
                },
                `${t('workspace')} \u25be`,
              ),
              menuOpen
                ? h(
                    'div',
                    { className: 'dsh-top-nav-dropdown', role: 'menu' },
                    workspaces.length === 0
                      ? h('p', { className: 'dsh-top-nav-empty' }, t('noWorkspaces'))
                      : workspaces.map((workspace) =>
                          h(
                            'div',
                            { key: workspace.workspaceId, className: 'dsh-top-nav-workspace' },
                            h(
                              'button',
                              {
                                type: 'button',
                                className: 'dsh-top-nav-workspace-title',
                                title: workspace.path,
                                onClick: () => openWorkspace(workspace.workspaceId),
                              },
                              h('span', null, workspace.title || workspace.path),
                              h('span', null, workspace.path),
                            ),
                            workspace.sessions.length === 0
                              ? h('p', { className: 'dsh-top-nav-empty' }, t('noSessions'))
                              : workspace.sessions.map((session) =>
                                  h(
                                    'div',
                                    { key: session.id, className: 'dsh-top-nav-session-row' },
                                    h(
                                      'button',
                                      {
                                        type: 'button',
                                        className: 'dsh-top-nav-session',
                                        title: session.displayTitle,
                                        'data-dsh-session-id': session.id,
                                        'data-dsh-session-title': session.displayTitle,
                                        'data-dsh-archived': 'false',
                                        onClick: () => openSession(session.id),
                                      },
                                      session.displayTitle,
                                    ),
                                    h(
                                      'button',
                                      {
                                        type: 'button',
                                        className: 'dsh-top-nav-session-action',
                                        title: t('archive'),
                                        onClick: () => void archiveSession(session.id),
                                      },
                                      t('archive'),
                                    ),
                                  ),
                                ),
                          ),
                        ),
                    archivedSessions.length === 0
                      ? null
                      : h(
                          'div',
                          { className: 'dsh-top-nav-workspace' },
                          h('div', { className: 'dsh-top-nav-workspace-heading' }, t('archived')),
                          archivedSessions.map((session) =>
                            h(
                              'div',
                              { key: session.id, className: 'dsh-top-nav-session-row' },
                              h(
                                'span',
                                {
                                  className: 'dsh-top-nav-session dsh-top-nav-session-static',
                                  title: session.displayTitle,
                                  'data-dsh-session-id': session.id,
                                  'data-dsh-session-title': session.displayTitle,
                                  'data-dsh-archived': 'true',
                                },
                                session.displayTitle,
                              ),
                              h(
                                'button',
                                {
                                  type: 'button',
                                  className: 'dsh-top-nav-session-action',
                                  title: t('unarchive'),
                                  onClick: () => void unarchiveSession(session.id),
                                },
                                t('unarchive'),
                              ),
                            ),
                          ),
                        ),
                  )
                : null,
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-top-nav-btn',
                title: t('settings'),
                'aria-label': t('settings'),
                onClick: openSettings,
              },
              t('settings'),
            ),
            ),
            h(
              'div',
              { className: 'dsh-top-sessions', 'aria-label': t('allSessions') },
              h('span', { className: 'dsh-top-sessions-label' }, t('allSessions')),
              workspaces.length === 0
                ? h('span', { className: 'dsh-top-session-empty' }, t('noSessions'))
                : workspaces.map((workspace) =>
                    h(
                      React.Fragment,
                      { key: workspace.workspaceId },
                      h(
                        'span',
                        { className: 'dsh-top-session-workspace', title: workspace.path },
                        workspace.title || workspace.path,
                      ),
                      workspace.sessions.length === 0
                        ? h('span', { className: 'dsh-top-session-empty' }, t('noSessions'))
                        : workspace.sessions.map((session) =>
                            h(
                              'button',
                              {
                                key: session.id,
                                type: 'button',
                                className: 'dsh-top-session-btn',
                                title: session.displayTitle,
                                'data-active': activeSessionId === session.id ? 'true' : 'false',
                                'data-dsh-session-id': session.id,
                                'data-dsh-session-title': session.displayTitle,
                                'data-dsh-archived': 'false',
                                onClick: () => openSession(session.id),
                              },
                              session.displayTitle,
                            ),
                          ),
                    ),
                  ),
            ),
          );
        }

        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            {
              name: 'shell.overlay',
              id: 'top-nav',
              order: 0,
            },
            TopNav,
          ),
        );
      },
    };
  },
});
