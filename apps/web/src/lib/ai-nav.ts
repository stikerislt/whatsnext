const PROMPT_KEY = 'wn_ai_prompt';

export function queueAiPrompt(prompt: string) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(PROMPT_KEY, prompt);
  }
}

export function consumeAiPrompt(): string | null {
  if (typeof window === 'undefined') return null;
  const prompt = sessionStorage.getItem(PROMPT_KEY);
  if (prompt) sessionStorage.removeItem(PROMPT_KEY);
  return prompt;
}

export function aiPath(prompt?: string) {
  if (prompt) queueAiPrompt(prompt);
  return '/dashboard/fullai';
}
