/**
 * session-briefing 单测：注入时机 / 去重 / 子代理豁免 / workspace 过滤 / fail-open / 截断。
 *
 * 运行：node test\briefing.test.mjs
 * 退出码 0 = 全过；任何断言失败 = 非 0。
 */
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  alreadyBriefed,
  apply,
  buildBriefing,
  defaults,
  eligible,
  pickSection,
} from '../index.js'

const root = await mkdtemp(join(tmpdir(), 'briefing-test-'))

async function seed() {
  // 2026-11-01 方案 C 后所有 md 都搬进 洛绫薇的记忆/，夹具路径同步（此前夹具仍是旧路径 → 本项曾误报 FAIL）
  const dirs = [
    '洛绫薇的记忆/框架/共享',
    '洛绫薇的记忆/框架/场景/底层改造',
    '洛绫薇的记忆/框架/场景/本地电脑',
    '洛绫薇的记忆/框架/场景/自我复盘',
    '洛绫薇的记忆/框架/场景/客户交付',
    '洛绫薇的记忆/框架/archive',
  ]
  for (const dir of dirs) await mkdir(join(root, dir), { recursive: true })

  await writeFile(join(root, '洛绫薇的记忆/框架/共享/参考.md'), [
    '# 共享参考',
    '',
    '## 一、全局须知（原话 · 只读 · 每轮注入）',
    '',
    '> 只认「主人与洛绫薇」原话，只读。',
    '',
    '洛绫薇你需要完成我给你的任务。',
    '如果主人错了记得提醒。',
    '',
    '## 二、画像参考',
    '',
    '（待记录）',
    '',
  ].join('\n'), 'utf8')

  await writeFile(join(root, '洛绫薇的记忆/框架/共享/任务看板.md'), [
    '# 任务看板',
    '',
    '## 待办（分发）',
    '- 待办 A：建开场简报插件',
    '',
    '## 完成回执',
    '- 2026-10-30 07:35「底层改造」：第一条回执。',
    '- 2026-10-30 07:50「底层改造」：第二条回执。',
    '- 2026-10-30 08:03「底层改造」：第三条回执。',
    '',
    '## 通知 / 冲突',
    '- ⚠ 待上报主人：重启 DSH。',
    '',
  ].join('\n'), 'utf8')

  await writeFile(join(root, '洛绫薇的记忆/框架/共享/健康摘要.md'), [
    '# 健康摘要',
    '',
    '## 系统健康（最近）',
    '- 磁盘正常。',
    '',
    '## 待关注',
    '- 底层改造机制待实现。',
    '',
  ].join('\n'), 'utf8')

  await writeFile(join(root, '洛绫薇的记忆/框架/洛绫薇的记忆.md'), [
    '# 洛绫薇 · 记忆',
    '',
    '## 当前状态（最近一次会话）',
    '- **2026-10-30 底层改造**：建开场简报插件。',
    '',
    '## 待办 / 下一步',
    '- 待主人确认。',
    '',
  ].join('\n'), 'utf8')

  await writeFile(join(root, '洛绫薇的记忆/框架/archive/2026-10-30_1255.md'), '# 交接记录\n', 'utf8')
}

/** 假 Cordis 上下文：记录事件处理器，effect 立即执行。 */
function fakeCtx() {
  const handlers = {}
  return {
    handlers,
    on(event, handler) {
      handlers[event] = handler
      return () => { delete handlers[event] }
    },
    effect(fn) { return fn() },
  }
}

function fakeAgent({ cwd = root, origin = 'user', id = 'session-test', events = [] } = {}) {
  return {
    id,
    session: {
      header: { cwd, origin, delegationDepth: 0 },
      snapshotEvents: () => events,
    },
  }
}

function baseDecision() {
  return {
    kind: 'continue',
    messages: [{
      id: 'u-1',
      role: 'user',
      content: [{ type: 'text', text: '主人：开工' }],
      source: { kind: 'user' },
    }],
  }
}

const next = async () => baseDecision()
const payload = agent => ({ agent, turn: 1, step: 1, signal: new AbortController().signal })

const results = []
function check(label, fn) {
  try {
    fn()
    results.push({ label, ok: true })
  } catch (error) {
    results.push({ label, ok: false, error })
  }
}

async function run() {
  await seed()
  globalThis.__briefing = await buildBriefing(root, defaults, new Date('2026-10-30T12:50:00+08:00'))
  globalThis.__short = await buildBriefing(root, { ...defaults, maxChars: 40 })

  // 1. pickSection：抠小节，止于同级标题。
  check('pickSection 抠出「一、全局须知」', () => {
    const section = pickSection('# x\n\n## 一、全局须知\n\n> 引用\n\n正文\n\n## 二、画像\n', '一、全局须知')
    assert.match(section, /正文/)
    assert.doesNotMatch(section, /画像/)
  })

  // 2. buildBriefing：内容齐全（2026-11-01 起健康摘要已停用，不再注入）。
  check('buildBriefing 内容齐全', () => {
    const text = globalThis.__briefing
    assert.match(text, /会话开场简报/)
    assert.match(text, /洛绫薇你需要完成我给你的任务/)
    assert.match(text, /现有场景（4）/)
    assert.match(text, /待办 A/)
    assert.match(text, /第三条回执/)
    // 健康摘要 2026-11-01 13:02 主人令停用 → 其「待关注」内容不该再进简报。
    assert.doesNotMatch(text, /底层改造机制待实现/, '健康摘要已停用，不该再注入')
    assert.match(text, /建开场简报插件/)
    assert.match(text, /2026-10-30_1255\.md/)
    assert.doesNotMatch(text, /第一条回执/, 'boardReceipts=2 时不该带最旧一条')
    // 每块标源文件时间（2026-11-01 加）。
    assert.match(text, /源文件 \d{2}:\d{2}/, '块标题应带源文件时间')
    assert.match(text, /session-briefing · standard/)
  })

  // 3. 首次 pre-step 注入。
  {
    const ctx = fakeCtx()
    apply(ctx, { workspace: root })
    const decision = await ctx.handlers['agent/pre-step'](payload(fakeAgent()), next)
    check('首次 pre-step 注入一条简报消息', () => {
      assert.equal(decision.messages.length, 2)
      const injected = decision.messages[1]
      assert.equal(injected.role, 'user')
      assert.equal(injected.source.kind, 'session-briefing')
      assert.equal(injected.source.form, 'snapshot')
      assert.ok(injected.id)
      assert.match(injected.content[0].text, /会话开场简报/)
    })

    // 4. 同会话第二次不再注入。
    const again = await ctx.handlers['agent/pre-step'](payload(fakeAgent()), next)
    check('同会话第二次不重复注入', () => {
      assert.equal(again.messages.length, 1)
    })

    // 5. 子代理会话不注入。
    const sub = await ctx.handlers['agent/pre-step'](payload(fakeAgent({ id: 'session-sub', origin: 'subagent' })), next)
    check('子代理会话不注入', () => {
      assert.equal(sub.messages.length, 1)
    })

    // 6. workspace 外不注入。
    const outside = await ctx.handlers['agent/pre-step'](
      payload(fakeAgent({ id: 'session-out', cwd: 'C:/somewhere/else' })),
      next,
    )
    check('workspace 外不注入', () => {
      assert.equal(outside.messages.length, 1)
    })

    // 7. reject 决策原样放行。
    const reject = await ctx.handlers['agent/pre-step'](payload(fakeAgent({ id: 'session-rej' })), async () => ({
      kind: 'reject',
      messages: [],
    }))
    check('reject 决策不注入', () => {
      assert.equal(reject.kind, 'reject')
      assert.equal(reject.messages.length, 0)
    })
  }

  // 8. 跨重启（历史里已有注入记录）不再注入。
  {
    const ctx = fakeCtx()
    apply(ctx, { workspace: root })
    const agent = fakeAgent({
      events: [{ type: 'user/message', data: { source: { kind: 'session-briefing' } } }],
    })
    check('alreadyBriefed 认历史注入', () => assert.equal(alreadyBriefed(agent), true))
    const decision = await ctx.handlers['agent/pre-step'](payload(agent), next)
    check('历史已注入的会话不再注入', () => assert.equal(decision.messages.length, 1))
  }

  // 9. fail-open：workspace 不存在 → 不注入、不抛错。
  {
    const ctx = fakeCtx()
    apply(ctx, { workspace: join(root, '不存在的目录') })
    const decision = await ctx.handlers['agent/pre-step'](payload(fakeAgent()), next)
    check('fail-open：读不到文件时不注入也不抛错', () => {
      assert.equal(decision.messages.length, 1)
    })
  }

  // 10. maxChars 截断。
  check('maxChars 截断生效', () => {
    const text = globalThis.__short
    assert.ok(text.length <= 40, `长度 ${text.length} 应 ≤ 40`)
  })

  // 11. eligible 判定。
  check('eligible：主会话在 workspace 内为真', () => assert.equal(eligible(fakeAgent(), root), true))
  check('eligible：子代理为假', () => assert.equal(eligible(fakeAgent({ origin: 'subagent' }), root), false))

  // 12. defaults 可读。
  check('defaults 暴露默认工作区', () => assert.ok(defaults.defaultWorkspace))
}

globalThis.__briefing = ''
globalThis.__short = ''

try {
  await run()
  const failed = results.filter(result => !result.ok)
  for (const result of results) {
    console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.label}`)
    if (!result.ok) console.log(`     ${result.error?.message ?? result.error}`)
  }
  if (failed.length > 0) {
    console.log(`\nFAILED: ${failed.length}/${results.length}`)
    process.exitCode = 1
  } else {
    console.log(`\nOK: session-briefing 单测全部通过（${results.length} 项）`)
  }
} finally {
  await rm(root, { recursive: true, force: true })
}
