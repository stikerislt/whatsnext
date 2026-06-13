'use client';

import { useEffect, useState } from 'react';
import { apiAuth } from '@/lib/api';
import { consumeAiPrompt } from '@/lib/ai-nav';

const PROMPTS = [
  'Which goals are most at risk?',
  'Who has capacity for the EU initiative?',
  'Why is Goal 3 behind?',
  'Which teams are overloaded?',
];

export default function AiAdvisorPage() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    { role: 'assistant', content: "Hello! I'm your AI Strategy Advisor. Full context loaded. Ask me anything." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async (text?: string) => {
    const q = text ?? input;
    if (!q.trim()) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const res = await apiAuth<{ reply: string }>('/ai/chat', { method: 'POST', body: JSON.stringify({ message: q, panel: 'full' }) });
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Unable to connect to AI service.' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const prompt = consumeAiPrompt();
    if (prompt) void send(prompt);
  }, []);

  return (
    <div className="grid grid-cols-[2fr_1fr] gap-4 flex-1 min-h-[500px]">
      <div className="wn-card border-orange-200 flex flex-col">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--v)] animate-pulse" />
          <span className="font-semibold text-sm">AI Strategy Advisor</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`p-3 rounded-lg text-xs max-w-[85%] ${m.role === 'user' ? 'ml-auto bg-orange-50 border border-orange-200' : 'bg-gray-50 border border-gray-200'}`}>
              {m.content}
            </div>
          ))}
          {loading && <div className="text-xs text-gray-400 italic">Analysing…</div>}
        </div>
        <div className="p-3 border-t flex gap-2">
          <input className="flex-1 border border-[var(--border)] rounded-lg px-3 py-2 text-xs" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Ask anything…" />
          <button onClick={() => send()} className="wn-btn-primary">Ask</button>
        </div>
      </div>
      <div className="space-y-3">
        <div className="wn-card p-4">
          <h3 className="text-xs font-semibold mb-2">Quick Prompts</h3>
          {PROMPTS.map((p) => (
            <button key={p} onClick={() => send(p)} className="block w-full text-left text-xs p-2 mb-1 bg-gray-50 rounded hover:bg-orange-50">{p}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
