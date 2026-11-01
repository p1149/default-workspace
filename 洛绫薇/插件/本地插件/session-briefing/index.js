/**
 * session-briefing — DSH 宿主侧「会话开场简报」插件。
 *
 * 目标（场景「底层改造」定位卡第 ① 项）：会话开场自动注入简报——
 * 全局须知原话 + 场景清单 + 任务看板 + 健康摘要 + 开场必读顺序，
 * 让每个新会话不必靠模型「自己记得」就知道框架当前状态。
 *
 * 实现依据（照着 DSH 官方 time-context 插件模式写，见源码
 * deepseek-harness/packages/context/time-context/src/index.ts）：
 *   - 挂 `agent/pre-step` waterfall，先 `await next()` 拿决策，
 *     再返回 `{ ...decision, messages: [...decision.messages, 简报消息] }`；
 *   - 简报消息是 user 角色、`source.kind === 'session-briefing'`
 *     （MessageSourceMap 是 merge-extensible 的，生产者各自声明 kind），
 *     因而「模型可见 ⟺ 已记日志」；
 *   - 同一会话只注入一次：会话历史里已有该 source 即视为已开场。
 *
 * 设计约束：
 *   - fail-open：读文件/组装/注入任何一步失败，都原样返回决策，绝不阻断会话；
 *   - 只对 workspace 内的主会话注入（子代理会话不注入，免得 token 翻倍）；
 *   - 零 @deepseek-ai 依赖，只用 Node 内置模块，能热装、能单测。
 */
import { existsSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const PLUGIN_DIR = dirname(fileURLToPath(import.meta.url))

/**
 * 默认工作区探测。
 *
 * 历史坑（2026-11-01 实测）：原写法是 `dirname(PLUGIN_DIR)`，当时插件平铺在工作区根目录，
 * 所以成立；04:5x 把插件包收进 `插件/` 之后，它算出来变成 `<工作区>\插件` —— 所有简报文件
 * 都读不到，而 fail-open 不报错，简报会**静默退化成只剩「开场必读顺序」一块**。
 * 现改为：从插件目录向上找「工作区标记」（`洛绫薇的记忆/` 或 `AGENTS.md`），最多上溯 3 级；
 * 找不到再退回上两级。仍是 fail-open，不影响会话。
 */
function detectWorkspace(start) {
  let dir = start
  for (let i = 0; i < 4; i += 1) {
    try {
      if (existsSync(join(dir, '洛绫薇的记忆')) || existsSync(join(dir, 'AGENTS.md'))) return dir
    } catch { /* 探测失败按未命中处理 */ }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return dirname(dirname(start))
}
const DEFAULT_WORKSPACE = detectWorkspace(PLUGIN_DIR)

export const name = 'session-briefing'
export const inject = ['agents']

const DEFAULTS = Object.freeze({
  enabled: true,
  /** 只有在这些工作目录下的主会话才注入；留空 = 插件目录的上一级。 */
  workspace: '',
  /**
   * 简报档位（2026-11-01 加）：
   *   standard = 现状（全局须知 / 场景与归档 / 任务看板 / 记忆当前状态 / 开场必读顺序）
   *   compact  = 只留全局须知 / 任务看板 / 记忆当前状态，各节上限与总上限均压到 60%
   * 用来实测「注入更多是否反而更慢」：先量标准档，再切紧凑档对比。
   */
  preset: 'standard',
  /** 简报正文总字符上限（超出按节截断）。 */
  maxChars: 2400,
  /** 各节独立上限。 */
  sceneChars: 240,
  boardChars: 700,
  healthChars: 320,
  memoryChars: 700,
  referenceChars: 320,
  /** 完成回执最多带几条（最近几条）。 */
  boardReceipts: 2,
  /** 简报总开关：false 时整个插件不注册任何监听。 */
  files: {
    reference: '洛绫薇的记忆/框架/共享/参考.md',
    board: '洛绫薇的记忆/框架/共享/任务看板.md',
    health: '洛绫薇的记忆/框架/共享/健康摘要.md',
    memory: '洛绫薇的记忆/框架/洛绫薇的记忆.md',
    scenesDir: '洛绫薇的记忆/框架/场景',
    archiveDir: '洛绫薇的记忆/框架/archive',
  },
})

/* ------------------------------------------------------------------ */
/* 纯函数：文本工具                                                    */
/* ------------------------------------------------------------------ */

function normalizePath(value) {
  return String(value ?? '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
}

function clip(text, max) {
  const flat = String(text ?? '').trim()
  if (max <= 0 || flat.length <= max) return flat
  return `${flat.slice(0, Math.max(0, max - 1))}…`
}

function stamp(date = new Date()) {
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 读 UTF-8 文本；不存在或读失败返回 ''（fail-open）。 */
async function readText(file, maxBytes = 128 * 1024) {
  try {
    const text = await readFile(file, 'utf8')
    return text.length > maxBytes ? text.slice(0, maxBytes) : text
  } catch {
    return ''
  }
}

/** 源文件的修改时间（`HH:mm`），用于在块标题上标「这份数据截至几点」；读不到返回 ''。 */
async function fileTime(file) {
  try {
    const info = await stat(file)
    const date = new Date(info.mtimeMs)
    const pad = value => String(value).padStart(2, '0')
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  } catch {
    return ''
  }
}

/**
 * 提取 markdown 小节：从 `headingPrefix` 开头的标题起，到下一个同级或更高级标题为止。
 * 找不到返回 ''。用于从 参考.md / 任务看板.md / 健康摘要.md / 记忆.md 里抠出要注入的几块。
 */
export function pickSection(markdown, headingPrefix) {
  const lines = String(markdown ?? '').split(/\r?\n/)
  const start = lines.findIndex(line => {
    const match = /^(#{1,6})\s+(.*)$/.exec(line)
    return match !== null && match[2].trim().startsWith(headingPrefix)
  })
  if (start < 0) return ''
  const level = /^(#{1,6})\s/.exec(lines[start])[1].length
  const body = []
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = /^(#{1,6})\s/.exec(lines[index])
    if (match !== null && match[1].length <= level) break
    body.push(lines[index])
  }
  return body.join('\n').trim()
}

/** 去掉 markdown 引用行（`> ` 开头）与空行，保留正文。 */
function stripQuotes(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .filter(line => !/^\s*>\s?/.test(line))
    .join('\n')
    .trim()
}

/** 取列表里最后 n 个 `- ` 开头的块（完成回执是多行块）。 */
function lastListBlocks(text, count) {
  const lines = String(text ?? '').split(/\r?\n/)
  const blocks = []
  let current = null
  for (const line of lines) {
    if (/^\s*-\s/.test(line)) {
      if (current !== null) blocks.push(current.join('\n').trim())
      current = [line]
    } else if (current !== null && line.trim() !== '') {
      current.push(line)
    }
  }
  if (current !== null) blocks.push(current.join('\n').trim())
  return blocks.slice(-Math.max(1, count))
}

/* ------------------------------------------------------------------ */
/* 简报组装                                                            */
/* ------------------------------------------------------------------ */

/** 场景清单：优先按 场景索引.md 的表格顺序（主人认知的顺序），读不到再列目录。 */
async function listScenes(workspace, files) {
  const index = await readText(join(workspace, files.scenesDir, '..', '共享', '场景索引.md'))
  const fromIndex = []
  for (const line of index.split(/\r?\n/)) {
    const match = /^\|\s*([^|*]+?)\s*\|\s*`框架\/场景\/([^/`]+)\/`/.exec(line)
    if (match !== null) fromIndex.push(match[2].trim())
  }
  if (fromIndex.length > 0) return fromIndex
  try {
    const entries = await readdir(join(workspace, files.scenesDir), { withFileTypes: true })
    const names = entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
    if (names.length > 0) return names
  } catch {
    /* no scene directory: leave the briefing without a scene list */
  }
  return []
}

/** 最近一份交接归档的文件名（只给文件名，不读全文）。 */
async function latestArchive(workspace, files) {
  try {
    const entries = await readdir(join(workspace, files.archiveDir))
    const records = entries
      .filter(entry => /^\d{4}-\d{2}-\d{2}_\d{4}\.md$/.test(entry))
      .sort()
    return records.at(-1) ?? ''
  } catch {
    return ''
  }
}

/**
 * 组装简报正文。任何一节读不到就跳过（fail-open），最后按总上限裁切。
 *
 * @param {string} workspace - 工作区根目录。
 * @param {object} settings - 解析后的配置。
 * @param {Date} now - 生成时间。
 * @returns {Promise<string>} 简报正文；读不到任何内容时返回 ''。
 */
export async function buildBriefing(workspace, settings, now = new Date()) {
  const files = settings.files
  const compact = settings.preset === 'compact'
  // 紧凑档：总上限与各节上限一律压到 60%，回执只带 1 条，并省掉「场景与归档」「开场必读顺序」。
  const shrink = value => Math.max(120, Math.round(value * 0.6))
  const capacity = compact
    ? {
        maxChars: shrink(settings.maxChars),
        referenceChars: shrink(settings.referenceChars),
        boardChars: shrink(settings.boardChars),
        memoryChars: shrink(settings.memoryChars),
        boardReceipts: 1,
      }
    : {
        maxChars: settings.maxChars,
        referenceChars: settings.referenceChars,
        boardChars: settings.boardChars,
        memoryChars: settings.memoryChars,
        boardReceipts: settings.boardReceipts,
      }

  const scenes = await listScenes(workspace, files)
  const [referenceRaw, boardRaw, memoryRaw, archive, referenceAt, boardAt, memoryAt] = await Promise.all([
    readText(join(workspace, files.reference)),
    readText(join(workspace, files.board)),
    readText(join(workspace, files.memory)),
    latestArchive(workspace, files),
    fileTime(join(workspace, files.reference)),
    fileTime(join(workspace, files.board)),
    fileTime(join(workspace, files.memory)),
  ])

  const blocks = []
  // 每块标「源文件几点」——注入的是快照，让模型知道这份数据截至何时（2026-11-01 加）。
  const push = (heading, body, at) => {
    const text = String(body ?? '').trim()
    if (text.length === 0) return
    blocks.push(`### ${heading}${at ? `（源文件 ${at}）` : ''}\n${text}`)
  }

  // ① 全局须知：只认主人与洛绫薇原话。
  const reference = stripQuotes(pickSection(referenceRaw, '一、全局须知'))
  if (reference.length > 0) push('全局须知（原话 · 只读）', clip(reference, capacity.referenceChars), referenceAt)

  // ② 场景清单 + 归档指针（紧凑档省略）。
  if (!compact) {
    const sceneLines = []
    if (scenes.length > 0) sceneLines.push(`现有场景（${scenes.length}）：${scenes.join(' / ')}`)
    if (archive.length > 0) sceneLines.push(`最新交接归档：洛绫薇的记忆/框架/archive/${archive}`)
    if (sceneLines.length > 0) push('场景与归档', clip(sceneLines.join('\n'), settings.sceneChars))
  }

  // ③ 任务看板：待办 + 最近完成回执。
  const boardBlocks = []
  const todo = pickSection(boardRaw, '待办（分发）')
  if (todo.length > 0 && !/（待记录）/.test(todo)) boardBlocks.push(`待办：\n${todo}`)
  const receipts = lastListBlocks(pickSection(boardRaw, '完成回执'), capacity.boardReceipts)
    .map(block => clip(block, 240))
  if (receipts.length > 0) boardBlocks.push(`最近回执：\n${receipts.join('\n')}`)
  const notices = pickSection(boardRaw, '通知 / 冲突')
  if (notices.length > 0 && !/^（无）/.test(notices)) boardBlocks.push(`通知：\n${notices}`)
  if (boardBlocks.length > 0) push('任务看板', clip(boardBlocks.join('\n\n'), capacity.boardChars), boardAt)

  // ④ 记忆快照：当前状态。
  const memory = stripQuotes(pickSection(memoryRaw, '当前状态'))
  if (memory.length > 0) push('记忆 · 当前状态', clip(memory, capacity.memoryChars), memoryAt)

  // ⑤ 开场必读顺序（紧凑档省略）。
  // ⚠ 2026-11-01 13:02 起健康摘要已停用（主人令），此处不再列入。
  if (!compact) {
    push('开场必读顺序', [
      '法则 → 规则 → 记忆 → 共享/参考 → 任务看板 → archive 最新一条交接记录。',
      '若本会话已绑定某个场景，先读 洛绫薇的记忆/框架/场景/<场景名>/ 下的 定位卡 与 记忆。',
    ].join('\n'))
  }

  if (blocks.length === 0) return ''

  const header = `【洛绫薇 · 会话开场简报】自动注入（session-briefing · ${compact ? 'compact' : 'standard'}，生成于 ${stamp(now)}）。`
  return clip(`${header}\n\n${blocks.join('\n\n')}`, capacity.maxChars)
}

/* ------------------------------------------------------------------ */
/* 会话判断                                                            */
/* ------------------------------------------------------------------ */

function sessionEvents(agent) {
  try {
    const events = agent?.session?.snapshotEvents?.()
    return Array.isArray(events) ? events : []
  } catch {
    return []
  }
}

/** 会话历史里是否已有本插件的注入记录（跨重启也认得出「已开场」）。 */
export function alreadyBriefed(agent) {
  return sessionEvents(agent).some(event => (
    event?.type === 'user/message' && event?.data?.source?.kind === name
  ))
}

/** 是否本插件管得着的会话：workspace 内的主会话。 */
export function eligible(agent, workspace) {
  const header = agent?.session?.header
  if (!header) return false
  if (header.origin === 'subagent' || (header.delegationDepth ?? 0) > 0) return false
  if (!workspace) return true
  const cwd = header.cwd
  if (!cwd) return false
  const root = normalizePath(workspace)
  const target = normalizePath(cwd)
  return target === root || target.startsWith(`${root}/`)
}

function warn(message) {
  try {
    process.stderr.write(`${message}\n`)
  } catch {
    /* stderr gone: nothing left to report to */
  }
}

/* ------------------------------------------------------------------ */
/* 插件入口                                                            */
/* ------------------------------------------------------------------ */

/**
 * 注册会话开场简报。
 *
 * @param {object} ctx - Cordis 插件上下文。
 * @param {object} config - cordis.patch.yml 里的 config。
 * @returns {void}
 */
export function apply(ctx, config = {}) {
  const settings = {
    ...DEFAULTS,
    ...config,
    files: { ...DEFAULTS.files, ...(config.files ?? {}) },
  }
  const workspace = resolve(settings.workspace || DEFAULT_WORKSPACE)
  if (!settings.enabled) return

  /** 已注入过的会话（内存快路径；历史扫描仍然兜底跨重启）。 */
  const briefed = new Set()
  let building = null

  const briefingFor = async () => {
    if (building === null) {
      building = buildBriefing(workspace, settings).catch(error => {
        warn(`session-briefing: 简报组装失败（跳过注入）：${error?.message ?? error}`)
        return ''
      })
    }
    return building
  }

  const createMessage = text => ({
    id: randomUUID(),
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: name, form: 'snapshot', sections: [{ name, text }] },
  })

  ctx.effect(() => {
    const off = ctx.on('agent/pre-step', async (payload, next) => {
      const decision = await next()
      try {
        if (decision?.kind === 'reject') return decision
        const { agent, signal } = payload ?? {}
        if (signal?.aborted) return decision
        if (!agent || !eligible(agent, workspace)) return decision
        const sessionId = agent?.id ?? agent?.session?.id
        if (!sessionId) return decision
        if (briefed.has(sessionId) || alreadyBriefed(agent)) return decision
        const text = await briefingFor()
        if (!text) return decision
        briefed.add(sessionId)
        return { ...decision, messages: [...decision.messages, createMessage(text)] }
      } catch (error) {
        warn(`session-briefing: 注入失败（fail-open）：${error?.message ?? error}`)
        return decision
      }
    }, { prepend: true })

    return () => {
      try { off?.() } catch { /* disposer is best effort */ }
    }
  }, 'session-briefing: 会话开场简报')
}

/** 供单测与外部排查：解析后的默认工作区。 */
export const defaults = Object.freeze({
  ...DEFAULTS,
  defaultWorkspace: DEFAULT_WORKSPACE,
})
