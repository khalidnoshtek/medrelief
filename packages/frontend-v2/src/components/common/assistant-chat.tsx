import { useState, useRef, useEffect } from 'react';
import { financeApi } from '../../api';
import { useAuthStore } from '../../store/auth-store';
import { VoiceButton } from './voice-input';
import { Spinner } from '../ui/primitives';
import { MessageCircle, Send, X, Bot } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export function AssistantChat() {
  const user = useAuthStore((s) => s.user)!;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hi! I can answer questions about your business. Try:\n• "What\'s today\'s revenue?"\n• "Top referring doctors"\n• "How many pending bills?"\n• "Most popular tests"' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const result = await financeApi.askAssistant(q, user.branchId);
      setMessages((m) => [...m, { role: 'assistant', text: result.answer }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'Sorry, something went wrong. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center active:bg-blue-700 z-30"
      >
        <Bot size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-3 left-3 max-w-lg mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 z-30 flex flex-col" style={{ maxHeight: '70vh' }}>
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
            <Bot size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold">Business Assistant</p>
            <p className="text-[10px] text-gray-400">Ask about revenue, bills, doctors, tests</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: '200px' }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-md'
                : 'bg-gray-100 text-gray-800 rounded-bl-md'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3 rounded-bl-md">
              <Spinner size="sm" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-gray-100 flex items-center gap-2">
        <VoiceButton onText={(t) => send(t)} className="shrink-0" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask a question..."
          className="flex-1 min-w-0 px-3 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-40 active:bg-blue-700 shrink-0"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
