import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Cheaper/faster model, plenty capable for chat + structured program edits.
export const ASSISTANT_MODEL = 'claude-haiku-4-5'
