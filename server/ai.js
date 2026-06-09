import { config, isAiConfigured } from './config.js'

// Groq exposes an OpenAI-compatible API, so we call it directly with fetch
// (no SDK dependency). Forced function-calling guarantees schema-valid JSON,
// which is how we satisfy "never crash on malformed AI output".

// A typed error so routes can return a clean status + friendly message.
export class AIError extends Error {
  constructor(message, status = 502) {
    super(message)
    this.name = 'AIError'
    this.status = status
  }
}

// ── Function (tool) schemas ────────────────────────────────────────────────
const PARSE_TOOL = {
  type: 'function',
  function: {
    name: 'save_reminder',
    description: "Return the structured reminder extracted from the user's natural-language text.",
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short imperative title, e.g. "Call John". No date/time words.' },
        datetime: {
          type: 'string',
          description:
            'The reminder time as an ISO 8601 datetime in the user timezone (e.g. 2026-06-03T09:00:00). ALWAYS fill this in when any day or time is implied — for recurring reminders use the NEXT concrete occurrence. Empty string only if truly no time is implied.',
        },
        recurrence: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly', 'custom'] },
        recurrence_detail: {
          type: 'string',
          description: 'For custom recurrence only, a hint like "WEEKLY:TU,TH" or "INTERVAL:2;UNIT:week". Empty otherwise.',
        },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        notes: { type: 'string', description: 'Extra detail not part of the title. May be empty.' },
      },
      required: ['title', 'datetime', 'recurrence', 'priority'],
    },
  },
}

// Call Groq and return the forced function's parsed arguments object.
async function callGroqTool({ system, user, tool, maxTokens }) {
  let res
  try {
    res = await fetch(`${config.groqBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.groqModel,
        temperature: 0.2,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        tools: [tool],
        tool_choice: { type: 'function', function: { name: tool.function.name } },
      }),
    })
  } catch {
    throw new AIError('Could not reach the AI service. Check your connection and try again.', 502)
  }

  if (!res.ok) {
    // Map provider errors to friendly messages without leaking the key.
    let detail = ''
    try {
      const body = await res.json()
      detail = body?.error?.message || ''
    } catch {
      /* ignore */
    }
    if (res.status === 401) throw new AIError('Groq rejected the API key. Check GROQ_API_KEY in your .env.', 401)
    if (res.status === 429) throw new AIError('Hit the Groq rate limit. Wait a moment and try again.', 429)
    if (res.status === 404) throw new AIError(`Groq model "${config.groqModel}" not found. Set GROQ_MODEL in your .env to a current model.`, 400)
    if (res.status === 400) throw new AIError(detail || 'The AI request was invalid. Try rephrasing.', 400)
    throw new AIError('The AI service is temporarily unavailable. Please try again.', 502)
  }

  const data = await res.json()
  const call = data?.choices?.[0]?.message?.tool_calls?.[0]
  if (!call?.function?.arguments) throw new AIError('The AI did not return structured data. Please try again.', 502)
  try {
    return JSON.parse(call.function.arguments)
  } catch {
    throw new AIError('The AI returned malformed data. Please try again.', 502)
  }
}

export async function parseReminder({ text, now, timezone }) {
  if (!isAiConfigured()) throw new AIError('AI is not configured. Add GROQ_API_KEY to your .env to enable parsing.', 503)
  if (!text || !text.trim()) throw new AIError('Please enter some text to parse.', 400)

  const system =
    'You convert a single natural-language reminder into structured fields by calling the save_reminder function. ' +
    `The current time is ${now} and the timezone is ${timezone}. ` +
    'Resolve every relative date ("tomorrow", "every Tuesday at 9am", "next month", "in 3 days") against that current time and ALWAYS output a concrete ISO 8601 datetime — for recurring reminders, use the next upcoming occurrence. ' +
    'Use the EXACT same UTC offset that appears in the current time above for your output datetime (do not invent a different timezone). ' +
    'If a date is given without a time, default to 09:00 local. Only leave datetime empty if no date or time is implied at all. ' +
    'Keep the title short and free of date words. Infer priority from urgency cues (default medium). ' +
    'For repeating reminders, set recurrence and, when custom, a machine hint in recurrence_detail.'

  const input = await callGroqTool({
    system,
    user: `Reminder text:\n"""${text.trim()}"""`,
    tool: PARSE_TOOL,
    maxTokens: 500,
  })

  const recurrence = ['none', 'daily', 'weekly', 'monthly', 'custom'].includes(input.recurrence) ? input.recurrence : 'none'
  const priority = ['low', 'medium', 'high'].includes(input.priority) ? input.priority : 'medium'
  return {
    title: (input.title || '').trim() || text.trim().slice(0, 80),
    datetime: input.datetime && String(input.datetime).trim() ? String(input.datetime).trim() : null,
    recurrence,
    recurrenceDetail: input.recurrence_detail || '',
    priority,
    notes: input.notes || '',
  }
}
