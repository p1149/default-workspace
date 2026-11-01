/**
 * Client half of Remote Control.
 *
 * Polls the Host HTTP queue and re-dispatches each action as a
 * `dsh-remote-action` window event for other client plugins (the scenes panel
 * listens for open/close/toggle).
 */
window.__ModuleLoader__.load({
  id: '@local/remote-control',
  factory() {
    const PORT = 7123

    return {
      inject: [],
      apply(ctx) {
        const timer = setInterval(async () => {
          try {
            const res = await fetch(`http://127.0.0.1:${PORT}/api/take`, { cache: 'no-store' })
            if (!res.ok) return
            const list = await res.json()
            if (!Array.isArray(list)) return
            for (const action of list) {
              window.dispatchEvent(new CustomEvent('dsh-remote-action', { detail: action }))
            }
          } catch { /* host server may not be up yet */ }
        }, 1500)
        ctx.effect(() => () => clearInterval(timer), 'remote-control: action poller')
      },
    }
  },
})
