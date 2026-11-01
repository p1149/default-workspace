// Quick retrieval test for memory-inject v2 (no DSH needed).
import { apply } from './index.js'

let handler
const ctx = {
  on: (event, fn) => { if (event === 'agent/pre-step') handler = fn },
  logger: { info: () => {} },
}

apply(ctx, { enabled: true })

const userText = process.argv[2] ?? '底层改造 场景怎么建？四层架构是什么'
const userMessage = {
  id: 'u1',
  role: 'user',
  content: [{ type: 'text', text: userText }],
  source: { kind: 'user' },
}
const decision = { kind: 'proceed', messages: [userMessage] }
const next = async () => decision
const result = await handler({ messages: decision.messages, step: 1, signal: undefined }, next)
const injected = result.messages.filter(m => m !== userMessage)
console.log('用户消息:', userText)
console.log('注入条数:', injected.length)
for (const m of injected) {
  const text = m.content.map(c => c.text).join('')
  console.log('注入字符数:', text.length)
  console.log(text)
}
