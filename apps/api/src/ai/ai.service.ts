import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StrategyService } from '../strategy/strategy.service';

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private strategy: StrategyService,
  ) {}

  async chat(companyId: string, userId: string, panel: string, message: string, conversationId?: string) {
    const context = await this.buildContext(companyId);
    const systemPrompt = `You are the AI Advisor inside What's Next. ${context}`;
    let reply: string;

    if (process.env.ANTHROPIC_API_KEY) {
      reply = await this.callAnthropic(systemPrompt, message);
    } else {
      reply = this.mockReply(message, context);
    }

    const messages = [{ role: 'user', content: message }, { role: 'assistant', content: reply }];
    const conv = conversationId
      ? await this.prisma.aiConversation.update({
          where: { id: conversationId },
          data: { messages, panel },
        })
      : await this.prisma.aiConversation.create({
          data: { companyId, userId, panel, messages },
        });

    return { conversationId: conv.id, reply };
  }

  async analyzeDecision(companyId: string, userId: string, decisionId: string) {
    const decision = await this.prisma.decision.findFirst({ where: { id: decisionId, companyId } });
    const message = `Decision help: ${decision?.title} - strategic implications, 3 options, your recommendation. ${decision?.detail}`;
    return this.chat(companyId, userId, 'decisions', message);
  }

  private async buildContext(companyId: string): Promise<string> {
    const alignment = await this.strategy.getAlignment(companyId);
    const overloaded = await this.prisma.employee.count({ where: { companyId, loadPct: { gt: 100 } } });
    const pending = await this.prisma.decision.count({ where: { companyId, status: 'pending' } });
    return `LIVE CONTEXT: ${alignment.goals.length} goals, alignment ${alignment.alignmentPct}%, task linkage ${alignment.taskLinkagePct}%, ${alignment.unlinkedProjects} unlinked projects, ${overloaded} overloaded, ${pending} pending decisions.`;
  }

  private async callAnthropic(system: string, message: string): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system,
        messages: [{ role: 'user', content: message }],
      }),
    });
    const data = await res.json() as { content?: Array<{ text: string }> };
    return data.content?.[0]?.text ?? 'Unable to respond.';
  }

  private mockReply(message: string, context: string): string {
    return `Based on your platform data (${context}), here's my analysis for: "${message.slice(0, 80)}..."\n\n1. Priority: Address unlinked projects first — they consume capacity without moving strategy.\n2. Capacity: Reassign work from overloaded employees to those with 30%+ free capacity.\n3. Next step: Resolve pending decisions blocking goal execution.`;
  }
}
