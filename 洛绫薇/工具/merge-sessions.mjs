#!/usr/bin/env node
/**
 * Merge every session of the current DSH workspace into one Markdown record.
 *
 * The session store keeps one compressed v4 JSONL log per session. This script
 * reads those logs directly (read-only), keeps real user input and assistant
 * prose, and folds each step's tool calls into a single summary line. Tool
 * arguments, tool output, reasoning blocks and injected system context are not
 * expanded, so the merged file stays readable.
 *
 * Usage: node tools/merge-sessions.mjs
 * Output: merged-sessions-<YYYY-MM-DD>.md in the workspace root.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const TZ = 'Asia/Shanghai';
const REAL_USER_SOURCES = new Set(['user', 'user-approval']);
const APPROVAL_SOURCE = 'user-approval';

const home = process.env.DSH_HOME;
if (!home) {
  console.error('DSH_HOME is not set; run this from a DSH-launched shell.');
  process.exit(1);
}

const cwd = process.cwd();
const sessionsRoot = path.join(home, 'sessions');

/** Find the session directory for this workspace, falling back to a header scan. */
function findWorkspaceDir() {
  const direct = path.join(sessionsRoot, `--${cwd.replace(/[:\\/]/g, '-')}--`);
  if (fs.existsSync(direct)) return direct;
  for (const entry of fs.readdirSync(sessionsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(sessionsRoot, entry.name);
    const inner = fs.readdirSync(dir).find((name) => name.startsWith('session-'));
    if (!inner) continue;
    try {
      const text = zlib
        .zstdDecompressSync(fs.readFileSync(path.join(dir, inner, 'session.v4.jsonl.zstd')))
        .toString('utf8');
      const header = JSON.parse(text.split('\n')[0]);
      if (header.cwd && path.resolve(header.cwd).toLowerCase() === path.resolve(cwd).toLowerCase()) {
        return dir;
      }
    } catch {
      /* not this workspace */
    }
  }
  return null;
}

const workspaceDir = findWorkspaceDir();
if (!workspaceDir) {
  console.error(`No session directory found for workspace: ${cwd}`);
  process.exit(1);
}

const partsFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
function dateParts(ms) {
  const parts = partsFmt.formatToParts(new Date(ms));
  const get = (type) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}:${get('second')}`,
  };
}
const fmtFull = (ms) => {
  const { date, time } = dateParts(ms);
  return `${date} ${time}`;
};
const fmtTime = (ms) => dateParts(ms).time;

/** Read and parse one compressed v4 session log, skipping a partial tail line. */
function readEvents(file) {
  const text = zlib.zstdDecompressSync(fs.readFileSync(file)).toString('utf8');
  const events = [];
  for (const line of text.split('\n')) {
    if (!line) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      /* the live session may end with a line that is still being written */
    }
  }
  return events;
}

/** Render the user-visible blocks of one user message. */
function userContent(content) {
  const blocks = [];
  for (const block of content ?? []) {
    if (block.type === 'text' && block.text?.trim()) {
      blocks.push(block.text.trim());
    } else if (block.type === 'image') {
      const a = block.attachment ?? {};
      const size = a.width && a.height ? ` ${a.width}×${a.height}` : '';
      blocks.push(`[图片${a.name ? `：${a.name}` : ''}${size}]`);
    }
  }
  return blocks.join('\n\n');
}

/** Assistant prose only; reasoning and tool-call placeholders stay out. */
function assistantText(message) {
  return (message?.content ?? [])
    .filter((block) => block.type === 'text' && block.text?.trim())
    .map((block) => block.text.trim())
    .join('\n\n');
}

/** Keep message Markdown from competing with the document's section outline. */
function demoteHeadings(text) {
  let fence = null;
  return text
    .split('\n')
    .map((line) => {
      const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (fence) {
        if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) {
          fence = null;
        }
        return line;
      }
      if (fenceMatch) {
        fence = fenceMatch[1];
        return line;
      }
      const heading = line.match(/^(#{1,6})(\s+)(.*)$/);
      if (!heading) return line;
      const level = Math.min(6, heading[1].length + 2);
      return `${'#'.repeat(level)}${heading[2]}${heading[3]}`;
    })
    .join('\n');
}

/** One line describing an ask_user_question result. */
function askAnswer(call, result) {
  const raw = (result?.message?.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return raw.replace(/\s+/g, ' ').slice(0, 300);
  }
  if (!Array.isArray(parsed?.answers)) return raw.replace(/\s+/g, ' ').slice(0, 300);
  let questions = [];
  try {
    questions = JSON.parse(call.args ?? '{}').questions ?? [];
  } catch {
    questions = [];
  }
  const text = parsed.answers
    .map((answer) => {
      const question = questions.find((item) => item.id === answer.id);
      const label = question?.header || question?.id || '';
      const selected = Array.isArray(answer.selected) ? answer.selected.join(' / ') : String(answer.selected ?? '');
      const custom = typeof answer.custom === 'string' && answer.custom.trim() ? answer.custom.trim() : '';
      const value = [selected, custom ? `自定义：${custom}` : ''].filter(Boolean).join('；') || '未回答';
      return `${label ? `${label} → ` : ''}${value}`;
    })
    .join('；');
  return text.slice(0, 500);
}

const titleLine = (text) =>
  (text ?? '')
    .split('\n')[0]
    .replace(/^[#>\s-]+/, '')
    .trim()
    .slice(0, 60);

/** Patterns for credentials that must not be copied into a new plain-text file. */
const SECRET_PATTERNS = [
  {
    name: 'url-token',
    re: /([?&](?:token|access_token|api_key|key)=)([A-Za-z0-9._~-]{12,})/gi,
    group: 2,
  },
  { name: 'sk', re: /\bsk-[A-Za-z0-9_-]{16,}\b/g },
  { name: 'ghp', re: /\bghp_[A-Za-z0-9]{20,}\b/g },
  { name: 'github_pat', re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { name: 'aws', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'bearer', re: /(Bearer\s+)([A-Za-z0-9._~-]{20,})/g, group: 2 },
  {
    name: 'key-assignment',
    re: /((?:api[_-]?key|access[_-]?token|secret|password|token)\s*[:=]\s*["']?)([A-Za-z0-9._~-]{20,})/gi,
    group: 2,
  },
  {
    name: 'private-key',
    re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  },
];

/** Mask credentials in the assembled document; source sessions stay untouched. */
function redactSecrets(text) {
  let count = 0;
  const kinds = {};
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern.re, (...args) => {
      count += 1;
      kinds[pattern.name] = (kinds[pattern.name] ?? 0) + 1;
      if (!pattern.group) return '[已隐去]';
      const whole = args[0];
      const value = args[pattern.group];
      const index = whole.lastIndexOf(value);
      return `${whole.slice(0, index)}[已隐去]`;
    });
  }
  return { text: result, count, kinds };
}

const sessionDirs = fs
  .readdirSync(workspaceDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith('session-'))
  .map((entry) => entry.name)
  .sort();

const sessions = [];
const warnings = [];
for (const id of sessionDirs) {
  const file = path.join(workspaceDir, id, 'session.v4.jsonl.zstd');
  if (!fs.existsSync(file)) continue;
  let events;
  try {
    events = readEvents(file);
  } catch (error) {
    warnings.push(`${id}: ${error.message}`);
    continue;
  }
  const header = events.find((event) => event.type === 'session') ?? {};
  const times = events.map((event) => event.time).filter(Number.isFinite);
  const createdAt = header.createdAt ?? times[0] ?? 0;
  const endedAt = times.length ? Math.max(...times) : createdAt;
  const titleEvents = events.filter((event) => event.type === 'session/title');
  const rawTitle = titleEvents.length ? titleEvents[titleEvents.length - 1].data.title : '';

  const stats = { turns: 0, user: 0, assistant: 0, tools: 0 };
  for (const event of events) {
    if (event.type === 'turn/start') stats.turns += 1;
    if (event.type === 'user/message' && REAL_USER_SOURCES.has(event.data.source?.kind)) stats.user += 1;
    if (event.type === 'assistant/message') stats.assistant += 1;
    if (event.type === 'tool/call') stats.tools += 1;
  }

  const firstUserText = events
    .filter((event) => event.type === 'user/message' && event.data.source?.kind === 'user')
    .map((event) => userContent(event.data.content))
    .find(Boolean);
  const title = rawTitle?.trim() || titleLine(firstUserText) || '（无标题）';

  const headerCfg = [...events]
    .reverse()
    .find((event) => event.type === 'request/header')?.data?.header?.config;
  const model = headerCfg
    ? [
        [headerCfg.provider, headerCfg.model].filter(Boolean).join('/'),
        headerCfg.reasoningEffort ? `(${headerCfg.reasoningEffort})` : '',
      ]
        .filter(Boolean)
        .join(' ')
    : '';

  sessions.push({
    id,
    events,
    createdAt,
    endedAt,
    title,
    stats,
    preset: header.agentPreset ?? '',
    model,
  });
}

sessions.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));

/** Build one session's transcript body. */
function transcript(session) {
  const out = [];
  const tools = new Map();
  let answers = [];

  const flushTools = () => {
    if (tools.size === 0) return;
    const groups = new Map();
    for (const tool of tools.values()) {
      const key = `${tool.name}\u0000${tool.status}`;
      if (!groups.has(key)) groups.set(key, { name: tool.name, status: tool.status, count: 0 });
      groups.get(key).count += 1;
    }
    const symbol = { ok: '✓', error: '✕', pending: '…' };
    const summary = [...groups.values()]
      .map((group) => `${group.name} ${symbol[group.status]}${group.count > 1 ? `×${group.count}` : ''}`)
      .join('、');
    out.push('', `> 工具（${tools.size}）：${summary}`);
    for (const answer of answers) out.push('', `> 提问回答：${answer}`);
    tools.clear();
    answers = [];
  };

  for (const event of session.events) {
    if (event.type === 'user/message') {
      const source = event.data.source?.kind;
      if (!REAL_USER_SOURCES.has(source)) continue;
      const text = userContent(event.data.content);
      if (!text) continue;
      flushTools();
      if (source === APPROVAL_SOURCE) {
        out.push('', `> 审批 · ${fmtTime(event.time)}：${text.replace(/\s*\n+\s*/g, ' ').slice(0, 400)}`);
      } else {
        out.push('', `**用户** · ${fmtTime(event.time)}`, '', demoteHeadings(text));
      }
    } else if (event.type === 'assistant/message') {
      const text = assistantText(event.data.message);
      if (!text) continue;
      flushTools();
      out.push('', `**助手** · ${fmtTime(event.time)}`, '', demoteHeadings(text));
    } else if (event.type === 'tool/call') {
      tools.set(event.data.callId, {
        name: event.data.name,
        status: 'pending',
        args: event.data.arguments,
      });
    } else if (event.type === 'tool/result') {
      const resultFor =
        event.data.toolCallId ?? event.data.message?.toolCallId ?? event.data.message?.source?.callId;
      const tool = tools.get(resultFor);
      if (!tool) continue;
      const failed = event.data.message?.isError === true || event.data.isError === true;
      tool.status = failed ? 'error' : 'ok';
      if (tool.name === 'ask_user_question') {
        const answer = askAnswer(tool, event.data);
        if (answer) answers.push(answer);
      }
    } else if (event.type === 'step/end' || event.type === 'turn/end') {
      flushTools();
    }
  }
  flushTools();
  return out.join('\n');
}

const now = Date.now();
const { date, time } = dateParts(now);
const out = [];
out.push('# DSH 工作区会话合并记录', '');
out.push(`- 工作区：\`${cwd}\``);
out.push(`- 生成时间：${date} ${time}（${TZ}）`);
out.push(`- 会话来源：\`${workspaceDir}\``);
out.push(`- 会话数：${sessions.length}`);
out.push('- 安全处理：@@REDACTED_COUNT@@ 处疑似密钥/令牌已隐去（原会话未改动）');
out.push(
  `- 总计：事件 ${sessions.reduce((sum, session) => sum + session.events.length, 0)} · 用户 ${sessions.reduce(
    (sum, session) => sum + session.stats.user,
    0,
  )} · 助手 ${sessions.reduce((sum, session) => sum + session.stats.assistant, 0)} · 工具调用 ${sessions.reduce(
    (sum, session) => sum + session.stats.tools,
    0,
  )}`,
);
out.push('');
out.push(
  '> 说明：按会话创建时间顺序合并。保留真实用户输入与助手正文；工具调用按步骤折叠为一行摘要（✓ 成功、✕ 失败、… 无结果），工具参数、工具输出、模型推理与注入的系统上下文未展开。当前会话是生成时快照，尚未包含本轮最终回复。',
);
if (warnings.length) out.push('', `> 未能读取：${warnings.map((warning) => `\`${warning}\``).join('、')}`);
out.push('');
out.push('## 目录', '');
out.push('| # | 会话 | 开始时间 | 轮次 | 用户 | 助手 | 工具 |');
out.push('|---:|---|---|---:|---:|---:|---:|');
sessions.forEach((session, index) => {
  const title = session.title.replace(/\|/g, '\\|').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
  out.push(
    `| ${index + 1} | [${title}](#session-${index + 1}) | ${fmtFull(session.createdAt).slice(0, 16)} | ${
      session.stats.turns
    } | ${session.stats.user} | ${session.stats.assistant} | ${session.stats.tools} |`,
  );
});

sessions.forEach((session, index) => {
  const current = session.id === process.env.DSH_SESSION_ID;
  out.push('', '---', '', `<a id="session-${index + 1}"></a>`, '', `## ${index + 1}. ${session.title}`, '');
  out.push(`- 会话 ID：\`${session.id}\``);
  out.push(
    `- 时间：${fmtFull(session.createdAt)} – ${fmtFull(session.endedAt)}（${TZ}）${
      current ? ' · 生成时仍在进行中' : ''
    }`,
  );
  out.push(
    `- 统计：${session.stats.turns} 轮 · 用户 ${session.stats.user} · 助手 ${session.stats.assistant} · 工具调用 ${session.stats.tools} · 事件 ${session.events.length}`,
  );
  out.push(`- 预设：${session.preset || '—'}${session.model ? ` · 模型：${session.model}` : ''}`);
  const body = transcript(session);
  out.push('', body.trim() ? body : '（该会话没有用户或助手消息。）');
});

const assembled = `${out.join('\n')}\n`;
const { text: redactedDoc, count: redacted, kinds } = redactSecrets(assembled);
const doc = redactedDoc.replace('@@REDACTED_COUNT@@', String(redacted));
const outFile = path.join(cwd, `merged-sessions-${date}.md`);
fs.writeFileSync(outFile, doc, 'utf8');
console.log(
  JSON.stringify(
    {
      output: outFile,
      sessions: sessions.length,
      events: sessions.reduce((sum, session) => sum + session.events.length, 0),
      chars: doc.length,
      redacted,
      kinds,
      warnings,
    },
    null,
    2,
  ),
);
