/**
 * Client half of the Quick Notes bundle.
 *
 * Registers one left-sidebar entry (`sidebar.panellist`) and the global page it
 * opens (`main`). Both share the same id, which is how the sidebar addresses the
 * panel. The note itself never leaves this browser.
 */
window.__ModuleLoader__.load({
  id: '@local/sidebar-notes',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Dictionary namespace owned by this plugin. */
    const NS = 'localNotes';
    /** The id shared by the sidebar entry and the main panel it opens. */
    const PANEL_ID = 'notes';
    /** Browser-local storage key; holds only the note text. */
    const STORAGE_KEY = 'dsh.local.notes.v1';
    /**
     * Seed note written the first time the panel opens on a browser that has
     * nothing stored yet. Keeps long-lived links (e.g. the private remote)
     * visible without the user retyping them; never overwrites an existing note.
     */
    const DEFAULT_NOTE =
      '远程仓库（私有 · origin/main）\n' +
      'https://github.com/p1149/default-workspace.git\n' +
      '\n' +
      '上传流程：密钥扫描(sk-|gho_|ghp_|xox|AIza) → git add -A → commit → git push origin main\n' +
      '\n' +
      '（以上由洛绫薇 2026-10-31 预置，可随意改）';

    const en = {
      panel: 'Quick Notes',
      title: 'Quick Notes',
      intro: 'Jot something down. It auto-saves when you leave and stays in this browser, not in your session.',
      placeholder: 'Type a note…',
      save: 'Save',
      clear: 'Clear',
      saved: 'Saved in this browser',
      unsaved: 'Unsaved changes',
      empty: 'Nothing saved yet',
      characters: '{n} characters',
      shortcut: 'Ctrl+Enter saves · Auto-saves on exit',
      writeFailed: 'Could not save in this browser. Your text stays in the editor.',
    };

    const zh = {
      panel: '速记',
      title: '速记',
      intro: '随手记一段文字，退出时会自动保存。内容只保存在本机浏览器里，不会写进会话。',
      placeholder: '在这里输入…',
      save: '保存',
      clear: '清空',
      saved: '已保存在本机浏览器',
      unsaved: '有未保存的修改',
      empty: '还没有保存内容',
      characters: '{n} 字符',
      shortcut: 'Ctrl+Enter 保存 · 退出时自动保存',
      writeFailed: '无法写入本机存储，内容仍留在编辑器里。',
    };

    const CSS = `
.dsh-notes-page {
  box-sizing: border-box;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding: calc(var(--dsh-frame-top-clearance, 0px) + 28px) 32px 40px;
  color: var(--dsw-alias-label-primary);
}
.dsh-notes-head {
  max-width: 820px;
  margin: 0 auto 20px;
}
.dsh-notes-heading {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dsh-notes-title {
  margin: 0;
  font-size: 20px;
  line-height: 1.35;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.dsh-notes-intro {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dsw-alias-label-secondary);
}
.dsh-notes-body {
  max-width: 820px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dsh-notes-card {
  display: flex;
  flex-direction: column;
  min-height: 280px;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-1);
}
.dsh-notes-editor {
  flex: 1 1 auto;
  box-sizing: border-box;
  width: 100%;
  min-height: 220px;
  padding: 18px 18px 12px;
  border: 0;
  outline: none;
  resize: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: var(--dsh-content-font-size, 14px);
  line-height: 1.75;
}
.dsh-notes-editor::placeholder {
  color: var(--dsw-alias-label-secondary);
}
.dsh-notes-editor:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: -2px;
}
.dsh-notes-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px 10px 18px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-2);
}
.dsh-notes-count {
  font-size: 12px;
  line-height: 1;
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
}
.dsh-notes-actions {
  display: flex;
  gap: 8px;
}
.dsh-notes-btn {
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
.dsh-notes-btn:hover:not(:disabled) {
  border-color: var(--dsw-alias-label-secondary);
}
.dsh-notes-btn:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 1px;
}
.dsh-notes-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.dsh-notes-btn-primary {
  border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-brand-primary);
}
.dsh-notes-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}
.dsh-notes-footer[data-dirty='true'] {
  color: var(--dsw-alias-state-warn-primary);
}
.dsh-notes-error {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-state-error-primary);
}
`;

    /** Read the saved note, tolerating a browser that denies storage. */
    function readNote() {
      try {
        return window.localStorage.getItem(STORAGE_KEY) ?? '';
      } catch {
        return '';
      }
    }

    /** Persist (or clear) the note; reports whether storage accepted the write. */
    function writeNote(value) {
      try {
        if (value) window.localStorage.setItem(STORAGE_KEY, value);
        else window.localStorage.removeItem(STORAGE_KEY);
        return true;
      } catch {
        return false;
      }
    }

    /**
     * Render the sidebar glyph at the size the sidebar asks for.
     * @param props - the sidebar's icon share: requested edge and selection state.
     * @returns the icon element.
     */
    function NotesPanelIcon({ size }) {
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
        h('path', { d: 'M6 3.75h8.25L18 7.5v12.75H6z' }),
        h('path', { d: 'M14.25 3.75V7.5H18' }),
        h('path', { d: 'M9 12h6' }),
        h('path', { d: 'M9 15.25h4' }),
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'sidebar-notes: dictionaries');
        const t = ctx.locale.bind(NS);

        /**
         * The global page opened by the sidebar entry.
         * @returns the scratchpad page.
         */
        function NotesPage() {
          const [draft, setDraft] = React.useState(() => {
            const stored = readNote();
            if (stored) return stored;
            // First open on this browser: seed the note and persist it so the
            // panel never looks empty when a standing link exists.
            writeNote(DEFAULT_NOTE);
            return DEFAULT_NOTE;
          });
          const [saved, setSaved] = React.useState(draft);
          const [error, setError] = React.useState('');
          // Refs mirror the latest values so teardown and page-hide handlers can
          // flush the draft without depending on a render that may never come.
          const draftRef = React.useRef(draft);
          const savedRef = React.useRef(saved);
          draftRef.current = draft;
          savedRef.current = saved;
          const dirty = draft !== saved;

          const save = () => {
            const current = draftRef.current;
            if (!writeNote(current)) {
              setError(t('writeFailed'));
              return;
            }
            savedRef.current = current;
            setError('');
            setSaved(current);
          };

          const clear = () => {
            if (!writeNote('')) {
              setError(t('writeFailed'));
              return;
            }
            draftRef.current = '';
            savedRef.current = '';
            setError('');
            setDraft('');
            setSaved('');
          };

          // Save on exit: leaving the panel unmounts the page, while closing or
          // reloading the window only hides it. Both paths persist unsaved text.
          React.useEffect(() => {
            const flush = (updateView) => {
              const current = draftRef.current;
              if (current === savedRef.current) return;
              if (!writeNote(current)) return;
              savedRef.current = current;
              if (updateView) {
                setError('');
                setSaved(current);
              }
            };
            const onHidden = () => flush(true);
            const onPageHide = () => flush(false);
            const onVisibilityChange = () => {
              if (document.visibilityState === 'hidden') onHidden();
            };
            document.addEventListener('visibilitychange', onVisibilityChange);
            window.addEventListener('pagehide', onPageHide);
            return () => {
              document.removeEventListener('visibilitychange', onVisibilityChange);
              window.removeEventListener('pagehide', onPageHide);
              flush(false);
            };
          }, []);

          const status = dirty ? t('unsaved') : saved ? t('saved') : t('empty');

          return h(
            'div',
            { className: 'dsh-notes-page' },
            h('style', { key: 'styles' }, CSS),
            h(
              'header',
              { className: 'dsh-notes-head', 'data-window-drag': true },
              h(
                'div',
                { className: 'dsh-notes-heading' },
                h('h1', { className: 'dsh-notes-title' }, t('title')),
                h('p', { className: 'dsh-notes-intro' }, t('intro')),
              ),
            ),
            h(
              'div',
              { className: 'dsh-notes-body' },
              h(
                'section',
                { className: 'dsh-notes-card' },
                h('textarea', {
                  className: 'dsh-notes-editor',
                  value: draft,
                  placeholder: t('placeholder'),
                  'aria-label': t('title'),
                  spellCheck: false,
                  onChange: (event) => {
                    const value = event.target.value;
                    draftRef.current = value;
                    setDraft(value);
                  },
                  onKeyDown: (event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                      event.preventDefault();
                      save();
                    }
                  },
                }),
                h(
                  'div',
                  { className: 'dsh-notes-bar' },
                  h(
                    'span',
                    { className: 'dsh-notes-count' },
                    t('characters').replace('{n}', String(draft.length)),
                  ),
                  h(
                    'div',
                    { className: 'dsh-notes-actions' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsh-notes-btn',
                        onClick: clear,
                        disabled: draft.length === 0 && saved.length === 0,
                      },
                      t('clear'),
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsh-notes-btn dsh-notes-btn-primary',
                        onClick: save,
                        disabled: !dirty,
                      },
                      t('save'),
                    ),
                  ),
                ),
              ),
              error ? h('p', { className: 'dsh-notes-error', role: 'alert' }, error) : null,
              h(
                'p',
                {
                  className: 'dsh-notes-footer',
                  role: 'status',
                  'data-dirty': dirty ? 'true' : 'false',
                },
                h('span', null, status),
                h('span', null, t('shortcut')),
              ),
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
            NotesPage,
          ),
        );

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 20,
              label: () => t('panel'),
              locale: NS,
            },
            NotesPanelIcon,
          ),
        );
      },
    };
  },
});
