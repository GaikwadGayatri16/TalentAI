import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Sparkles, Send, Copy, Trash2, Plus, MessageSquare, 
  Check, RefreshCw, User, AlertCircle, FileText, Bot
} from 'lucide-react';
import { useToast } from '../components/Toast';

export default function AIChatbot() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const [sending, setSending] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [errorBanner, setErrorBanner] = useState('');

  const chatEndRef = useRef(null);
  const toast = useToast();

  const suggestedPrompts = [
    "Analyze my technical skills and highlight my strengths",
    "What key skills am I missing for senior developer roles?",
    "How can I rewrite my project descriptions using STAR method?",
    "Generate 3 technical interview questions based on my projects",
    "Explain my ATS readiness and how I can improve it"
  ];

  // 1. Fetch conversations on mount
  const fetchConversations = async () => {
    try {
      setLoadingConv(true);
      const res = await axios.get('/conversations');
      setConversations(res.data);
      if (res.data.length > 0) {
        setActiveConvId(res.data[0].id);
        await loadMessages(res.data[0].id);
      } else {
        // Create initial conversation automatically
        await handleNewConversation();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load conversations.');
    } finally {
      setLoadingConv(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // 2. Load messages for selected conversation
  const loadMessages = async (convId) => {
    try {
      const res = await axios.get(`/conversations/${convId}/messages`);
      setMessages(res.data);
      setErrorBanner('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to load conversation messages.');
    }
  };

  // Scroll to bottom on message updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSelectConversation = (convId) => {
    if (convId === activeConvId) return;
    setActiveConvId(convId);
    loadMessages(convId);
  };

  const handleNewConversation = async () => {
    try {
      const res = await axios.post('/conversations', { title: 'New Career Chat' });
      setConversations(prev => [res.data, ...prev]);
      setActiveConvId(res.data.id);
      await loadMessages(res.data.id);
      toast.success('Started new conversation.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to start new conversation.');
    }
  };

  const handleDeleteConversation = async (convId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;

    try {
      await axios.delete(`/conversations/${convId}`);
      toast.success('Conversation deleted.');
      const remaining = conversations.filter(c => c.id !== convId);
      setConversations(remaining);
      if (remaining.length > 0) {
        setActiveConvId(remaining[0].id);
        loadMessages(remaining[0].id);
      } else {
        await handleNewConversation();
      }
    } catch (err) {
      toast.error('Failed to delete conversation.');
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || sending) return;

    const userText = input.trim();
    setInput('');
    setErrorBanner('');

    // Optimistic user bubble
    const tempUserMsg = {
      id: Date.now(),
      sender: 'user',
      message: userText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setSending(true);

    try {
      const res = await axios.post(`/conversations/${activeConvId}/messages`, {
        message: userText
      });
      // Append assistant message from backend
      setMessages(prev => [...prev, res.data]);
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Failed to communicate with AI Assistant.';
      setErrorBanner(detail);
      toast.error(detail);
    } finally {
      setSending(false);
    }
  };

  const handleCopyText = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleSuggestedClick = (prompt) => {
    setInput(prompt);
  };

  return (
    <div className="h-[calc(100vh-6rem)] max-w-7xl mx-auto flex gap-4 animate-slide-up">
      {/* Left Chat Sessions Sidebar */}
      <div className="hidden md:flex w-72 flex-col bg-card border border-border rounded-2xl shadow-sm overflow-hidden shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-primary" />
            <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-foreground">
              Conversations
            </h3>
          </div>
          <button
            onClick={handleNewConversation}
            className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white transition-colors cursor-pointer"
            title="Start new conversation"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {conversations.map((c) => {
            const isActive = c.id === activeConvId;
            return (
              <div
                key={c.id}
                onClick={() => handleSelectConversation(c.id)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-sm font-semibold'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Sparkles size={13} className={isActive ? 'text-white' : 'text-primary'} />
                  <span className="truncate">{c.title || 'Career Assistant'}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(c.id, e)}
                  className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                    isActive ? 'hover:bg-primary/80 text-white' : 'hover:bg-muted text-muted-foreground hover:text-red-500'
                  }`}
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold font-heading text-foreground flex items-center gap-2">
                TalentAI Career Assistant
                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Resume-Aware RAG
                </span>
              </h2>
              <span className="text-[11px] text-muted-foreground">
                Powered by Google Gemini • Multi-Turn Memory Active
              </span>
            </div>
          </div>

          <button
            onClick={handleNewConversation}
            className="md:hidden flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1.5 rounded-lg"
          >
            <Plus size={14} /> New
          </button>
        </div>

        {/* Error Banner if API key or connection fails */}
        {errorBanner && (
          <div className="m-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">AI Assistant Notice:</p>
              <p className="mt-0.5">{errorBanner}</p>
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {messages.map((m, idx) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id || idx}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}
              >
                <div className={`flex items-start gap-3 max-w-[85%] sm:max-w-[75%] ${isUser ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-sm ${
                    isUser
                      ? 'bg-primary text-white'
                      : 'bg-muted border border-border text-primary'
                  }`}>
                    {isUser ? <User size={14} /> : <Sparkles size={14} />}
                  </div>

                  {/* Message Bubble */}
                  <div className={`group relative px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isUser
                      ? 'bg-primary text-white rounded-tr-none'
                      : 'bg-muted/40 border border-border text-foreground rounded-tl-none whitespace-pre-line'
                  }`}>
                    <p>{m.message}</p>

                    {/* Copy action for assistant bubbles */}
                    {!isUser && (
                      <button
                        onClick={() => handleCopyText(m.message, idx)}
                        className="absolute top-2 right-2 p-1 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Copy text"
                      >
                        {copiedIdx === idx ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {sending && (
            <div className="flex justify-start animate-slide-up">
              <div className="flex items-start gap-3 max-w-[75%]">
                <div className="w-8 h-8 rounded-xl bg-muted border border-border text-primary flex items-center justify-center shrink-0">
                  <RefreshCw size={14} className="animate-spin" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-muted/40 border border-border text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]"></span>
                  <span className="ml-1 text-[11px] font-medium">Assistant is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Prompts Pills */}
        <div className="px-6 py-2 border-t border-border bg-muted/20 flex gap-2 overflow-x-auto scrollbar-none">
          {suggestedPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSuggestedClick(p)}
              className="whitespace-nowrap px-3 py-1.5 rounded-full bg-card border border-border text-[11px] font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors shrink-0 cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-border bg-card">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              required
              disabled={sending}
              placeholder="Ask about your resume, interview questions, or career strategy..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-4 py-3 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none placeholder-muted-foreground shadow-inner"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="px-5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
