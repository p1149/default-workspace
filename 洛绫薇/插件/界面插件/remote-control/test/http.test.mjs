/**
 * Self-test for the Remote Control host half.
 *
 * Boots the real plugin `apply()` against a minimal mock context on a spare
 * port, then exercises every HTTP endpoint the phone page uses. Run with:
 *   node remote-control/test/http.test.mjs
 */
import assert from 'node:assert/strict'

process.env.DSH_REMOTE_PORT = '17123'
process.env.DSH_REMOTE_BIND = '127.0.0.1'
const BASE = 'http://127.0.0.1:17123'

const delivered = []
const sessions = [
  { id: 'session-aaaa1111', status: 'inactive' },
  { id: 'session-bbbb2222', status: 'running' },
]

const disposers = []
const createdRequests = []
const ctx = {
  get(name) {
    if (name === 'agents') {
      return {
        list: () => sessions,
        get: (id) => (sessions.some((s) => s.id === id)
          ? { id, followup: (message) => delivered.push({ sessionId: id, message }) }
          : undefined),
      }
    }
    if (name === 'sessionController') {
      return {
        create: async (request) => {
          createdRequests.push(request)
          const id = 'session-cccc3333'
          sessions.push({ id, status: 'running' })
          return { sessionId: id, agent: { id, followup: (message) => delivered.push({ sessionId: id, message }) } }
        },
      }
    }
    return undefined
  },
  effect(fn) {
    disposers.push(fn())
  },
}

const plugin = await import('../index.js')
plugin.apply(ctx)

const waitForServer = async () => {
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/status`)
      if (res.ok) return
    } catch { /* not listening yet */ }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('server did not start')
}
await waitForServer()

const results = []
const check = (name, ok, detail) => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

try {
  // 1. Page carries the message form the phone needs.
  const page = await fetch(`${BASE}/`)
  const html = await page.text()
  check('GET / 200 + 手机页有指令输入框', page.status === 200 && html.includes('id="msg"') && html.includes('/api/notify'),
    `status=${page.status} len=${html.length}`)

  // 2. Session list reflects the live registry.
  const listRes = await fetch(`${BASE}/api/sessions`)
  const list = await listRes.json()
  check('GET /api/sessions 列出会话', listRes.status === 200 && Array.isArray(list) && list.length === 2
    && list.find((s) => s.id === 'session-bbbb2222')?.running === true,
    JSON.stringify(list))

  // 3. Deliver into a live session.
  const okRes = await fetch(`${BASE}/api/notify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId: 'session-aaaa1111', message: '链路自检：手机发来的指令' }),
  })
  const okBody = await okRes.json()
  const gotText = delivered[0]?.message?.content?.[0]?.text
  check('POST /api/notify 投递到会话', okRes.status === 200 && okBody.ok === true
    && delivered.length === 1 && gotText === '链路自检：手机发来的指令',
    JSON.stringify({ status: okRes.status, delivered: delivered.length, text: gotText }))

  // 4. Unknown session is refused, not silently dropped.
  const missingRes = await fetch(`${BASE}/api/notify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId: 'session-nope', message: 'x' }),
  })
  check('POST /api/notify 未知会话 404', missingRes.status === 404, `status=${missingRes.status}`)

  // 5. Targeted action goes to the session (Bluetooth bridge path).
  const actRes = await fetch(`${BASE}/api/action`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'say', sessionId: 'session-bbbb2222', text: '来自蓝牙的指令' }),
  })
  const actBody = await actRes.json()
  const last = delivered[delivered.length - 1]
  check('POST /api/action 定向转投会话', actRes.status === 200 && actBody.ok === true
    && last?.sessionId === 'session-bbbb2222' && last?.message?.content?.[0]?.text === '来自蓝牙的指令',
    JSON.stringify({ status: actRes.status, session: last?.sessionId }))

  // 6. Legacy bare action still queues for the client poller.
  const legacyRes = await fetch(`${BASE}/api/action`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'open-scenes' }),
  })
  const takeRes = await fetch(`${BASE}/api/take`)
  const taken = await takeRes.json()
  check('POST /api/action 旧动作入队 + /api/take 取出',
    legacyRes.status === 200 && Array.isArray(taken) && taken.includes('open-scenes'),
    JSON.stringify(taken))

  // 7. Malformed body is rejected.
  const badRes = await fetch(`${BASE}/api/notify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{oops',
  })
  check('POST /api/notify 坏 JSON 400', badRes.status === 400, `status=${badRes.status}`)

  // 8. /api/new-session 拒绝不存在的 cwd（看板问题 D：不再凭空造目录）。
  const badCwdRes = await fetch(`${BASE}/api/new-session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'ping', cwd: 'Z:\\\\no-such-path' }),
  })
  const badCwdBody = await badCwdRes.json()
  check('POST /api/new-session 非法 cwd 400', badCwdRes.status === 400
    && badCwdBody.ok === false && createdRequests.length === 0,
    JSON.stringify({ status: badCwdRes.status, error: badCwdBody.error, created: createdRequests.length }))

  // 9. /api/new-session 接受工作区内的合法 cwd，并把会话建出来。
  const goodCwdRes = await fetch(`${BASE}/api/new-session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'ping', cwd: process.cwd() }),
  })
  const goodCwdBody = await goodCwdRes.json()
  check('POST /api/new-session 合法 cwd 200 + 建会话', goodCwdRes.status === 200
    && goodCwdBody.ok === true && goodCwdBody.sessionId === 'session-cccc3333'
    && createdRequests.length === 1,
    JSON.stringify({ status: goodCwdRes.status, sessionId: goodCwdBody.sessionId, cwd: createdRequests[0]?.cwd }))

  // 10. 真实工作区（插件所在目录上溯两级）必须被接受 —— 2026-11-01 回归用例：
  //     首版只认 process.cwd()，重启后宿主 cwd=profiles\desktop，把工作区也挡成 400 了。
  const { fileURLToPath } = await import('node:url')
  const pathMod = await import('node:path')
  const workspaceDir = pathMod.resolve(pathMod.dirname(fileURLToPath(import.meta.url)), '..', '..')
  const wsRes = await fetch(`${BASE}/api/new-session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: 'ping', cwd: workspaceDir }),
  })
  const wsBody = await wsRes.json()
  check('POST /api/new-session 插件所在工作区 200', wsRes.status === 200
    && wsBody.ok === true && createdRequests.length === 2,
    JSON.stringify({ status: wsRes.status, cwd: workspaceDir, error: wsBody.error }))
} finally {
  for (const dispose of disposers) {
    try { dispose?.() } catch { /* already disposed */ }
  }
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length > 0) {
  console.error('FAILED: ' + failed.map((r) => r.name).join(' | '))
  process.exitCode = 1
}
