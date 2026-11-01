// llm-ollama — DSH provider adapter that talks to a local Ollama server
// through its OpenAI-compatible endpoint (/v1/chat/completions).
//
// Registers provider route "ollama". The model config must point at it:
//   agent-default-model: { provider: ollama, model: luolingwei }
import { LlmAdapter, LlmError } from '@deepseek-ai/dsh-llm'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PLUGIN_DIR = dirname(fileURLToPath(import.meta.url))

const PROVIDER = 'ollama'
const DEFAULT_BASE = 'http://127.0.0.1:11434/v1'

function textOf(blocks) {
  return (blocks ?? []).filter(b => b.type === 'text').map(b => b.text).join('')
}

// DSH request messages -> OpenAI chat completions messages.
function toOpenAIMessages(options) {
  const out = []
  if (typeof options.system === 'string' && options.system.length > 0) {
    out.push({ role: 'system', content: options.system })
  }
  for (const m of options.messages ?? []) {
    const text = textOf(m.content)
    if (m.role === 'system' || m.role === 'developer') {
      if (text.length > 0) out.push({ role: 'system', content: text })
      continue
    }
    if (m.role === 'assistant') {
      const toolCalls = (m.content ?? [])
        .filter(b => b.type === 'tool-call')
        .map(b => ({ id: b.id, type: 'function', function: { name: b.name, arguments: b.arguments } }))
      const msg = { role: 'assistant', content: text.length > 0 ? text : null }
      if (toolCalls.length > 0) msg.tool_calls = toolCalls
      out.push(msg)
      continue
    }
    if (m.role === 'tool') {
      out.push({ role: 'tool', content: text, tool_call_id: m.source?.toolCallId ?? '' })
      continue
    }
    out.push({ role: 'user', content: text })
  }
  return out
}

class OllamaAdapter extends LlmAdapter {
  constructor(config = {}) {
    super()
    this.baseURL = config.baseURL ?? DEFAULT_BASE
  }

  providerInfo(provider) {
    return { id: provider, name: 'Ollama (local)' }
  }

  async listModels(provider) {
    // The plugin starts Ollama asynchronously, so wait out its startup before
    // reporting an empty catalog to the GUI.
    for (let attempt = 0; attempt < 12; attempt++) {
      try {
        const res = await fetch(`${this.baseURL}/models`, { signal: AbortSignal.timeout(2000) })
        if (res.ok) {
          const json = await res.json()
          return (json.data ?? []).map(m => ({ provider, id: m.id, name: m.id }))
        }
      } catch { /* Ollama may still be starting */ }
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    return []
  }

  async resolveModel(provider, model) {
    return {
      provider,
      id: model,
      name: model,
      context: { contextWindow: 32768 },
      defaultMaxTokens: 4096,
    }
  }

  async *stream(options) {
    const body = {
      model: options.model,
      messages: toOpenAIMessages(options),
      stream: true,
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(options.maxTokens !== undefined ? { max_tokens: options.maxTokens } : {}),
      ...(options.stop ? { stop: options.stop } : {}),
      ...(options.tools?.length
        ? { tools: options.tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })) }
        : {}),
    }

    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      signal: options.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new LlmError(`Ollama HTTP ${res.status}: ${text}`, 'TRANSPORT', { status: res.status })
    }
    if (!res.body) throw new LlmError('Ollama returned no response body', 'EMPTY_RESPONSE')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let textIndex = -1
    let textBuf = ''
    let reasoningIndex = -1
    let reasoningBuf = ''
    const toolBlocks = []
    let nextIndex = 0
    let finishReason = 'stop'
    let usage

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let nl
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim()
          buffer = buffer.slice(nl + 1)
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') continue
          let chunk
          try { chunk = JSON.parse(payload) } catch { continue }
          const choice = chunk.choices?.[0]
          if (!choice) continue
          const delta = choice.delta ?? {}

          if (typeof delta.reasoning_content === 'string' && delta.reasoning_content.length > 0) {
            if (reasoningIndex < 0) {
              reasoningIndex = nextIndex++
              yield { type: 'block-start', index: reasoningIndex, blockType: 'reasoning' }
            }
            reasoningBuf += delta.reasoning_content
            yield { type: 'reasoning-delta', index: reasoningIndex, text: delta.reasoning_content }
          }
          if (typeof delta.content === 'string' && delta.content.length > 0) {
            if (textIndex < 0) {
              textIndex = nextIndex++
              yield { type: 'block-start', index: textIndex, blockType: 'text' }
            }
            textBuf += delta.content
            yield { type: 'text-delta', index: textIndex, text: delta.content }
          }
          if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const i = tc.index ?? 0
              if (!toolBlocks[i]) {
                toolBlocks[i] = { index: nextIndex++, id: tc.id ?? `call_${i}`, name: '', args: '' }
                yield { type: 'block-start', index: toolBlocks[i].index, blockType: 'tool-call' }
              }
              const t = toolBlocks[i]
              if (tc.function?.name) t.name = tc.function.name
              if (typeof tc.function?.arguments === 'string') {
                t.args += tc.function.arguments
                yield { type: 'tool-call-delta', index: t.index, id: t.id, name: t.name, argumentsDelta: tc.function.arguments }
              }
            }
          }
          if (choice.finish_reason) finishReason = choice.finish_reason
          if (chunk.usage) {
            usage = {
              inputTokens: chunk.usage.prompt_tokens ?? 0,
              outputTokens: chunk.usage.completion_tokens ?? 0,
              ...(chunk.usage.total_tokens !== undefined ? { totalTokens: chunk.usage.total_tokens } : {}),
            }
          }
        }
      }
    } finally {
      try { await reader.cancel() } catch { /* stream already closed */ }
    }

    if (reasoningIndex >= 0) {
      yield { type: 'block-end', index: reasoningIndex, block: { type: 'reasoning', text: reasoningBuf } }
    }
    if (textIndex >= 0) {
      yield { type: 'block-end', index: textIndex, block: { type: 'text', text: textBuf } }
    }
    for (const t of toolBlocks.filter(Boolean)) {
      yield { type: 'block-end', index: t.index, block: { type: 'tool-call', id: t.id, name: t.name, arguments: t.args } }
    }
    if (usage) yield { type: 'usage', usage }
    const reason = finishReason === 'tool_calls'
      ? { kind: 'tool-calls' }
      : finishReason === 'length'
        ? { kind: 'max-tokens' }
        : { kind: 'stop' }
    yield { type: 'finish', reason }
  }
}

export const name = 'llm-ollama'
export const inject = ['llm']

// Start the local Ollama server one second after DSH loads this plugin, so the
// GUI settles first. A hidden-window VBScript launches the console server, so
// no console window flashes.
function ensureOllamaRunning() {
  const vbs = join(PLUGIN_DIR, 'start-ollama.vbs')
  setTimeout(() => {
    try {
      spawn('wscript.exe', [vbs], { detached: true, stdio: 'ignore', windowsHide: true }).unref()
    } catch { /* the next request reports the unreachable server */ }
  }, 1000)
}

export function apply(ctx, config = {}) {
  const adapter = new OllamaAdapter(config)
  ensureOllamaRunning()
  ctx.effect(() => {
    ctx.llm.registerConfigurableProviders([
      { provider: PROVIDER, displayName: 'Ollama (local)', settingsNs: ctx.fiber.entry?.options.id ?? name, settingsPath: [] },
    ])
    const registration = ctx.llm.registerAdapter([PROVIDER], adapter)
    return () => {
      if (typeof registration === 'function') registration()
      else registration?.dispose?.()
    }
  }, 'llm-ollama: provider adapter')
}
