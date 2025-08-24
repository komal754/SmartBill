import { useState, useRef, useEffect } from 'react';

export default function ChatbotWidget() {
  // Quick reply options
  const quickReplies = [
    "Show my spending this month",
    "Show my spending last week",
    "Show my payments last month",
    "How are you?",
  ];

  function handleQuickReply(option) {
    setInput(option);
    setTimeout(() => {
      document.getElementById('chatbot-input')?.focus();
    }, 50);
  }

  function handleEndChat() {
    setMessages([
      { role: 'assistant', content: 'Chat ended. If you need anything else, just open the chat again!' }
    ]);
    setInput('');
    setLoading(false); // Immediately stop loading
    setTimeout(() => setOpen(false), 800);
  }
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am your SmartBill AI assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (open && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages(msgs => [...msgs, userMsg]);
    setInput('');
    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json();
      let reply = data.answer || 'Sorry, I could not understand.';
      setMessages(msgs => [...msgs, { role: 'assistant', content: reply }]);
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        setMessages(msgs => [...msgs, { role: 'assistant', content: 'Sorry, the request timed out.' }]);
      } else {
        setMessages(msgs => [...msgs, { role: 'assistant', content: 'Sorry, there was an error.' }]);
      }
    }
    setLoading(false);
  }

  return (
    <>
      <button
        aria-label="Open AI Chatbot"
        className={`fixed bottom-6 right-6 z-50 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white rounded-full shadow-2xl w-16 h-16 flex items-center justify-center focus:outline focus:ring-2 focus:ring-blue-400 transition-all duration-500 backdrop-blur-lg ${open ? 'scale-90 opacity-60 blur-[1px]' : 'scale-100 opacity-100'} animate-float`}
        onClick={() => setOpen(o => !o)}
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.22), 0 2px 8px 0 rgba(30,64,175,0.10)' }}
      >
        <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 15h8M9 9h.01M15 9h.01" />
        </svg>
      </button>
      <div
        className={`fixed bottom-24 right-6 z-50 w-80 max-w-[95vw] bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-blue-200 flex flex-col transition-all duration-700 ease-in-out ${open ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-8 scale-95 pointer-events-none'}`}
        style={{ boxShadow: open ? '0 16px 64px 0 rgba(30,64,175,0.22)' : undefined, border: '1.5px solid #c7d2fe' }}
        role="dialog"
        aria-modal="true"
        aria-label="AI Chatbot"
      >
        <div className="p-4 border-b bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500/90 text-white rounded-t-3xl flex items-center justify-between animate-fade-in shadow-md">
          <span className="font-bold tracking-wide text-lg drop-shadow">SmartBill AI Chatbot</span>
          <button aria-label="Close chat" onClick={() => setOpen(false)} className="ml-2 text-white hover:text-blue-200 text-xl font-bold transition-transform transform hover:scale-125">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-blue-100/60 to-white/80 animate-fade-in" style={{ maxHeight: 340, backdropFilter: 'blur(8px)' }}>
          {/* Quick reply options */}
          <div className="flex flex-wrap gap-2 mb-2">
            {quickReplies.map((option, idx) => (
              <button
                key={idx}
                type="button"
                className="px-3 py-1 rounded-full bg-blue-200/80 text-blue-800 text-xs font-medium shadow hover:bg-blue-300/90 transition-all focus:outline focus:ring-2 focus:ring-blue-400"
                onClick={() => handleQuickReply(option)}
                disabled={loading}
              >
                {option}
              </button>
            ))}
            <button
              type="button"
              className="px-3 py-1 rounded-full bg-red-100/80 text-red-700 text-xs font-medium shadow hover:bg-red-200/90 transition-all focus:outline focus:ring-2 focus:ring-red-400 ml-auto"
              onClick={handleEndChat}
              disabled={loading}
            >
              End Chat
            </button>
          </div>
          {/* Chat messages */}
          {messages.map((msg, i) => (
            <div key={i} className={`relative max-w-[85%] px-4 py-2 rounded-2xl shadow-lg text-sm break-words transition-all duration-300 ${msg.role === 'user' ? 'ml-auto bg-gradient-to-br from-blue-500/90 to-blue-300/80 text-white animate-bubble-user border-2 border-blue-200/60' : 'bg-white/90 text-blue-900 border-2 border-blue-100/80 animate-bubble-bot'}`}
              style={{ marginBottom: 6, boxShadow: msg.role === 'user' ? '0 2px 12px 0 #60a5fa33' : '0 2px 8px 0 #c7d2fe55' }}>
              {msg.content}
              {msg.role === 'assistant' && (
                <span className="absolute -left-3 top-1 w-5 h-5 bg-blue-200/80 rounded-full flex items-center justify-center shadow-md animate-pulse">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="8" cy="8" r="7" /></svg>
                </span>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={sendMessage} className="flex border-t border-blue-100/60 p-3 gap-2 bg-white/80 rounded-b-3xl animate-fade-in backdrop-blur">
          <input
            id="chatbot-input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 border-2 border-blue-200/60 rounded-full px-3 py-2 focus:outline focus:ring-2 focus:ring-blue-400 bg-blue-50/80 text-blue-900 placeholder-blue-400 transition-all shadow-sm"
            placeholder="Ask me anything..."
            aria-label="Type your message"
            disabled={loading}
            autoFocus={open}
          />
          <button type="submit" className="bg-gradient-to-br from-blue-600 to-blue-400 text-white px-5 py-2 rounded-full shadow-lg hover:from-blue-700 hover:to-blue-500 focus:outline focus:ring-2 focus:ring-blue-400 disabled:opacity-60 transition-all flex items-center gap-2" disabled={loading || !input.trim()} aria-label="Send message">
            {loading ? <span className="animate-spin">...</span> : <><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg><span className="hidden sm:inline">Send</span></>}
          </button>
        </form>
        <style>{`
          .animate-fade-in { animation: fadeIn 0.4s; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
          .animate-bubble-user { animation: bubbleUser 0.3s; }
          .animate-bubble-bot { animation: bubbleBot 0.3s; }
          @keyframes bubbleUser { from { opacity: 0; transform: translateX(40px) scale(0.8); } to { opacity: 1; transform: none; } }
          @keyframes bubbleBot { from { opacity: 0; transform: translateX(-40px) scale(0.8); } to { opacity: 1; transform: none; } }
          .animate-float { animation: floatBtn 2.5s ease-in-out infinite alternate; }
          @keyframes floatBtn { 0% { transform: translateY(0) scale(1); } 100% { transform: translateY(-8px) scale(1.04); } }
        `}</style>
      </div>
    </>
  );
}
