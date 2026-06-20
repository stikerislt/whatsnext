import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { buildLlmSystemPrompt } from '@whatsnext/shared';

export const DEFAULT_OPENROUTER_MODEL = 'google/gemma-4-26b-a4b-it:free';
export const DEFAULT_OPENROUTER_FALLBACK = 'openrouter/free';

export interface StrategicGoalExtraction {
  title: string;
  kpi?: string;
}

const STRATEGY_EXTRACTION_SYSTEM = buildLlmSystemPrompt(`You are a strategy analyst.
Read the strategy document text and extract exactly 5-6 strategic directions or goals the company is pursuing.

Rules:
- Ignore document titles, author names, headers, footers, dates, and boilerplate.
- Each goal must be a substantive strategic direction (not a sentence fragment or metadata line).
- Titles should be 5-12 words, written as direction statements (e.g. "Expand into EU market").
- Include an optional KPI only when a clear measurable outcome appears in the document.
- Extracted goals will appear in Command Center and Strategy Map as the company's strategic directions.
- Return JSON only, no markdown. Escape any double quotes inside strings.
{"goals":[{"title":"...","kpi":"..."}]}`);

class OpenRouterModelError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'OpenRouterModelError';
  }
}

@Injectable()
export class LlmService {
  private readonly log = new Logger(LlmService.name);

  isConfigured(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY);
  }

  get model(): string {
    return this.modelChain()[0];
  }

  private modelChain(): string[] {
    const primary = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;
    const fallbacks = process.env.OPENROUTER_MODEL_FALLBACKS?.split(',')
      .map((m) => m.trim())
      .filter(Boolean) ?? [DEFAULT_OPENROUTER_FALLBACK];
    return [...new Set([primary, ...fallbacks])];
  }

  async chat(system: string, message: string, opts?: { maxTokens?: number }): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }
    const { content } = await this.callOpenRouter(system, message, { maxTokens: opts?.maxTokens ?? 1000 });
    return content;
  }

  async extractStrategicGoals(documentText: string): Promise<{ goals: StrategicGoalExtraction[] }> {
    const trimmed = documentText.trim().slice(0, 14000);
    if (!trimmed) {
      throw new BadRequestException('Document contained no readable text.');
    }

    if (!this.isConfigured()) {
      throw new BadRequestException('AI extraction is not configured. Set OPENROUTER_API_KEY.');
    }

    const { content: raw, model } = await this.callOpenRouter(
      STRATEGY_EXTRACTION_SYSTEM,
      `Extract strategic directions from this document:\n\n${trimmed}`,
      { maxTokens: 2000, jsonMode: true },
    );

    let parsed: { goals: StrategicGoalExtraction[] };
    try {
      parsed = this.parseGoalsJson(raw);
    } catch (err) {
      this.log.warn(
        `Goals JSON parse failed via ${model}: ${err instanceof Error ? err.message : err}; raw: ${raw.slice(0, 400)}`,
      );
      throw new BadRequestException(
        'Could not read strategic directions from the AI response. Try again or enter goals manually.',
      );
    }
    if (parsed.goals.length < 3) {
      this.log.warn(`LLM returned only ${parsed.goals.length} goals via ${model}; raw: ${raw.slice(0, 200)}`);
      throw new BadRequestException(
        'Could not extract enough strategic directions from this document. Try editing the goals manually.',
      );
    }

    this.log.log(`Extracted ${parsed.goals.length} goals via ${model}`);
    return parsed;
  }

  private async callOpenRouter(
    system: string,
    user: string,
    opts?: { maxTokens?: number; jsonMode?: boolean },
  ): Promise<{ content: string; model: string }> {
    const models = this.modelChain();
    let lastError: Error | null = null;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      try {
        const content = await this.callOpenRouterWithModel(model, system, user, opts);
        if (i > 0) {
          this.log.log(`OpenRouter fallback succeeded with ${model}`);
        }
        return { content, model };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const retryable = err instanceof OpenRouterModelError ? err.retryable : false;
        const hasMore = i < models.length - 1;

        if (retryable && hasMore) {
          this.log.warn(`Model ${model} failed (${lastError.message.slice(0, 160)}) — trying next model`);
          continue;
        }

        if (err instanceof BadRequestException) throw err;
        break;
      }
    }

    throw new BadRequestException(
      lastError?.message?.slice(0, 250) ?? 'All AI models failed. Please try again shortly.',
    );
  }

  private async callOpenRouterWithModel(
    model: string,
    system: string,
    user: string,
    opts?: { maxTokens?: number; jsonMode?: boolean },
  ): Promise<string> {
    try {
      return await this.requestOpenRouterCompletion(model, system, user, opts);
    } catch (err) {
      if (opts?.jsonMode && err instanceof OpenRouterModelError && err.status === 400) {
        this.log.warn(`JSON mode rejected by ${model}, retrying without response_format`);
        return this.requestOpenRouterCompletion(model, system, user, { ...opts, jsonMode: false });
      }
      throw err;
    }
  }

  private async requestOpenRouterCompletion(
    model: string,
    system: string,
    user: string,
    opts?: { maxTokens?: number; jsonMode?: boolean },
  ): Promise<string> {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: opts?.maxTokens ?? 1000,
      temperature: 0.1,
    };
    if (opts?.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.WEB_URL ?? 'http://localhost:3000',
        'X-Title': "What's Next",
      },
      body: JSON.stringify(body),
    });

    const errText = await res.text();

    if (!res.ok) {
      const retryable = res.status === 429 || res.status === 502 || res.status === 503 || res.status === 529;
      throw new OpenRouterModelError(
        `AI analysis failed (${model}): ${errText.slice(0, 250)}`,
        retryable,
        res.status,
      );
    }

    let data: { choices?: Array<{ message?: { content?: string } }> };
    try {
      data = JSON.parse(errText) as { choices?: Array<{ message?: { content?: string } }> };
    } catch {
      throw new OpenRouterModelError(`Invalid response from ${model}`, true);
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new OpenRouterModelError(`Empty response from ${model}`, true);
    }
    return content;
  }

  private parseGoalsJson(raw: string): { goals: StrategicGoalExtraction[] } {
    for (const candidate of this.jsonCandidates(raw)) {
      try {
        const goals = this.normalizeGoals(JSON.parse(candidate));
        if (goals.length > 0) return { goals };
      } catch {
        // try next candidate
      }
    }

    const regexGoals = this.extractGoalsByRegex(raw);
    if (regexGoals.length > 0) return { goals: regexGoals };

    throw new SyntaxError('No parseable goals in LLM response');
  }

  private jsonCandidates(raw: string): string[] {
    const stripped = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'");

    const seen = new Set<string>();
    const add = (s: string) => {
      const t = s.trim();
      if (t && !seen.has(t)) {
        seen.add(t);
        return t;
      }
      return null;
    };

    const out: string[] = [];
    const push = (s: string | null) => {
      if (s) out.push(s);
    };

    push(add(stripped));
    push(add(stripped.replace(/,\s*([\]}])/g, '$1')));

    const objectMatch = stripped.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      push(add(objectMatch[0]));
      push(add(objectMatch[0].replace(/,\s*([\]}])/g, '$1')));
    }

    // Truncated JSON — try to close open array/object
    if (!stripped.trimEnd().endsWith('}')) {
      const trimmed = stripped.replace(/,\s*$/, '');
      push(add(`${trimmed}]}`));
      push(add(`${trimmed}}`));
      push(add(`${trimmed}]}`));
    }

    return out;
  }

  private normalizeGoals(parsed: unknown): StrategicGoalExtraction[] {
    const root = parsed as { goals?: unknown[] } | unknown[];
    const list = Array.isArray(root) ? root : (root.goals ?? []);
    return list
      .map((item) => {
        if (typeof item === 'string') {
          return { title: item.trim() };
        }
        const g = item as { title?: string; kpi?: string; name?: string };
        return {
          title: (g.title ?? g.name ?? '').trim(),
          kpi: g.kpi?.trim() || undefined,
        };
      })
      .filter((g) => g.title.length >= 8 && g.title.length <= 200)
      .filter((g) => !this.looksLikeMetadata(g.title))
      .slice(0, 6);
  }

  private extractGoalsByRegex(raw: string): StrategicGoalExtraction[] {
    const goals: StrategicGoalExtraction[] = [];
    const objectRe =
      /\{\s*"title"\s*:\s*"((?:\\.|[^"\\])*)"(?:\s*,\s*"kpi"\s*:\s*"((?:\\.|[^"\\])*)")?\s*\}/gi;

    for (const match of raw.matchAll(objectRe)) {
      const title = this.unescapeJsonString(match[1] ?? '');
      const kpi = match[2] ? this.unescapeJsonString(match[2]) : undefined;
      if (title.length >= 8 && title.length <= 200 && !this.looksLikeMetadata(title)) {
        goals.push({ title, kpi });
      }
    }

    if (goals.length >= 3) return goals.slice(0, 6);

    // Looser fallback: "title": "..." even outside strict object boundaries
    const titleRe = /"title"\s*:\s*"((?:\\.|[^"\\])*)"/gi;
    const loose: StrategicGoalExtraction[] = [];
    for (const match of raw.matchAll(titleRe)) {
      const title = this.unescapeJsonString(match[1] ?? '');
      if (title.length >= 8 && title.length <= 200 && !this.looksLikeMetadata(title)) {
        loose.push({ title });
      }
    }
    return (goals.length > loose.length ? goals : loose).slice(0, 6);
  }

  private unescapeJsonString(value: string): string {
    return value
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .trim();
  }

  private looksLikeMetadata(title: string): boolean {
    const lower = title.toLowerCase();
    return (
      /^basic strategic plan$/i.test(title) ||
      /authored by/i.test(title) ||
      /^this strategic plan/i.test(title) ||
      /^strategic plan$/i.test(title) ||
      lower.length < 12
    );
  }
}
