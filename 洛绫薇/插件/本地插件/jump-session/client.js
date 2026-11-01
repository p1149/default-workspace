window.__ModuleLoader__.load({
  id: '@local/jump-session',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Session opened by 「回主会话」; edit here to point at another Session. */
    const MAIN_SESSION = 'session-13bf187c-533b-4393-8162-682da338f484';

    const buttonStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 8px',
      border: '1px solid var(--dsh-border, rgba(127,127,127,.35))',
      borderRadius: 6,
      background: 'transparent',
      color: 'inherit',
      font: 'inherit',
      cursor: 'pointer',
    };

    function button(label, title, onClick) {
      return h('button', {
        type: 'button',
        title,
        'aria-label': title,
        style: buttonStyle,
        onClick,
      }, label);
    }

    /** Footer actions: open a fresh Session, or jump back to the main one. */
    function Actions(ctx) {
      const workspace = () => (typeof ctx.get === 'function' ? ctx.get('uiWorkspace') : ctx.uiWorkspace);
      return h('span', { style: { display: 'inline-flex', gap: 6 } }, [
        button('＋', '新建会话', (event) => {
          event?.stopPropagation?.();
          try { workspace()?.startSession(); } catch (error) { console.warn('[jump-session] startSession failed', error); }
        }),
        button('⌂', '回到洛绫薇主会话', (event) => {
          event?.stopPropagation?.();
          try { workspace()?.openSession(MAIN_SESSION); } catch (error) { console.warn('[jump-session] openSession failed', error); }
        }),
      ]);
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action',
          id: 'jump-session.actions',
          order: 10,
          label: '会话跳转',
        }, () => Actions(ctx)));
      },
    };
  },
});
