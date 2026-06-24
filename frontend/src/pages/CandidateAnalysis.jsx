import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Award, FileText, CheckCircle2, XCircle, BookOpen, 
  HelpCircle, MessageSquare, Send, Sparkles, AlertCircle, ChevronDown, ChevronUp 
} from 'lucide-react';

export default function CandidateAnalysis() {
  const { candidateId, jobId } = useParams();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('score');
  
  // Accordions for interview questions
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  
  // Chatbot states
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hello! I have loaded this candidate\'s resume. Ask me anything, e.g., "What ML projects has Charlie done?" or "Does Alice know AWS?"' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const fetchCandidateDetails = async () => {
    try {
      const response = await axios.get(`/candidates/${candidateId}/evaluation/${jobId}`);
      setData(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load candidate analysis profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidateDetails();
  }, [candidateId, jobId]);

  // Scroll chatbot to bottom when message arrives
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setChatLoading(true);
    
    try {
      const response = await axios.post(`/candidates/${candidateId}/chat`, { question: userMsg });
      setChatMessages(prev => [...prev, { sender: 'bot', text: response.data.answer }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I failed to query the resume database. Make sure the backend server and Gemini API keys are online.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4 bg-background">
        <Link to={`/jobs/${jobId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-all font-semibold">
          <ArrowLeft size={16} /> Back to Candidate Leaderboard
        </Link>
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <span>{error || 'Evaluation not available.'}</span>
        </div>
      </div>
    );
  }

  // Recommendation Badge style mapping
  const recommendationStyles = {
    'Strong Hire': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 glow-success',
    'Hire': 'bg-indigo-500/10 text-primary dark:text-indigo-400 border-indigo-500/30 glow-primary',
    'Consider': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    'Reject': 'bg-destructive/10 text-destructive border-destructive/30'
  };

  const tabs = [
    { id: 'score', label: 'ATS Breakdown', icon: Award },
    { id: 'evaluation', label: 'AI Evaluation', icon: Sparkles },
    { id: 'skills', label: 'Skill Gap & Paths', icon: BookOpen },
    { id: 'interview', label: 'Interview Prep', icon: HelpCircle },
    { id: 'chatbot', label: 'Resume Chatbot (RAG)', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6 animate-slide-up bg-background text-foreground">
      {/* Header section with back link */}
      <div>
        <Link to={`/jobs/${jobId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-all font-semibold mb-2">
          <ArrowLeft size={16} /> Back to Candidate Leaderboard
        </Link>
        
        {/* Candidate Bio Header */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg uppercase shadow-inner">
              {data.candidate_id ? 'C' + data.candidate_id : 'CA'}
            </div>
            <div>
              <h1 className="text-2xl font-heading font-extrabold text-foreground leading-tight">Candidate Evaluation Profile</h1>
              <p className="text-xs font-semibold text-muted-foreground mt-0.5">Job Alignment Assessment Pipeline</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Final Score badge */}
            <div className="text-right bg-muted/40 border border-border px-4 py-2 rounded-xl">
              <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Final Match Score</span>
              <span className="text-xl font-extrabold text-primary">{data.final_score}%</span>
            </div>
            
            {/* Gemini Recommendation badge */}
            <div className={`px-4 py-2.5 rounded-xl border font-bold text-sm text-center shadow-sm ${recommendationStyles[data.hiring_recommendation] || 'bg-muted text-muted-foreground'}`}>
              <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Rec</span>
              {data.hiring_recommendation}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs navigation panel */}
      <div className="flex flex-wrap border border-border gap-1 bg-muted/40 p-1.5 rounded-xl max-w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 glow-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content panel */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[450px]">
        
        {/* TAB 1: ATS SCORE BREAKDOWN */}
        {activeTab === 'score' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-foreground font-heading">Deterministic ATS Score Breakdown</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Weight breakdown scoring aggregate: Skill (50%), Experience (20%), Projects (20%), Education (10%).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
              <div className="space-y-5">
                
                {/* Skill Match */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-muted-foreground">Required & Preferred Skill Match (50% weight)</span>
                    <span className="text-foreground font-bold">{data.ats_breakdown.skills_score} / 50</span>
                  </div>
                  <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${(data.ats_breakdown.skills_score / 50) * 100}%` }}></div>
                  </div>
                </div>

                {/* Experience Match */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-muted-foreground">Experience Alignment (20% weight)</span>
                    <span className="text-foreground font-bold">{data.ats_breakdown.experience_score} / 20</span>
                  </div>
                  <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${(data.ats_breakdown.experience_score / 20) * 100}%` }}></div>
                  </div>
                </div>

                {/* Projects Match */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-muted-foreground">Project Highlights (20% weight)</span>
                    <span className="text-foreground font-bold">{data.ats_breakdown.projects_score} / 20</span>
                  </div>
                  <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${(data.ats_breakdown.projects_score / 20) * 100}%` }}></div>
                  </div>
                </div>

                {/* Education Match */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-muted-foreground">Education Credentials (10% weight)</span>
                    <span className="text-foreground font-bold">{data.ats_breakdown.education_score} / 10</span>
                  </div>
                  <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-400 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(129,140,248,0.5)]" style={{ width: `${(data.ats_breakdown.education_score / 10) * 100}%` }}></div>
                  </div>
                </div>

              </div>

              {/* Aggregated Score Panel */}
              <div className="bg-muted/40 border border-border rounded-2xl p-6 flex flex-col justify-center items-center text-center shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider relative">Total ATS Score</span>
                <span className="text-5xl font-extrabold text-foreground mt-2 relative">
                  {data.ats_score}
                  <span className="text-base text-muted-foreground">/100</span>
                </span>
                
                <div className="w-full border-t border-border my-4"></div>
                
                <div className="flex justify-between w-full text-xs font-semibold text-muted-foreground relative">
                  <span>Semantic Vector Score: {data.similarity_score}%</span>
                  <span>ATS weight: 60%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AI EVALUATION (GEMINI) */}
        {activeTab === 'evaluation' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-foreground font-heading">AI Evaluation Summary</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Gemini-generated semantic report highlighting strengths, weaknesses, and profile fit.</p>
            </div>

            <div className="p-4 bg-muted/30 border border-border rounded-xl leading-relaxed text-sm text-foreground/80">
              <p className="font-medium text-foreground italic">" {data.ai_summary} "</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Strengths */}
              <div className="border border-emerald-500/20 rounded-xl p-5 bg-emerald-500/5">
                <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 mb-3">
                  <CheckCircle2 size={16} /> Key Strengths
                </h4>
                <ul className="space-y-2 text-xs text-muted-foreground font-medium">
                  {data.strengths.map((str, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-500 select-none">•</span>
                      <span className="text-foreground/90">{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="border border-destructive/20 rounded-xl p-5 bg-destructive/5">
                <h4 className="text-sm font-bold text-destructive flex items-center gap-2 mb-3">
                  <XCircle size={16} /> Areas of Improvement
                </h4>
                <ul className="space-y-2 text-xs text-muted-foreground font-medium">
                  {data.weaknesses.map((wk, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-destructive select-none">•</span>
                      <span className="text-foreground/90">{wk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SKILL GAP & LEARNING PATHS */}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-foreground font-heading">Skill Gap Analysis</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Identifies critical skills missing from candidate's profile relative to the job requirements.</p>
            </div>

            {/* Gap badge listing */}
            <div className="bg-muted/40 border border-border rounded-xl p-5">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Skill Set Comparisons</h4>
              <div className="space-y-3">
                {data.missing_skills.length > 0 ? (
                  <div>
                    <span className="inline-block text-xs font-bold text-destructive mb-1">Missing Requirements ({data.missing_skills.length}):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {data.missing_skills.map((skill, i) => (
                        <span key={i} className="text-xs font-semibold bg-destructive/10 border border-destructive/20 text-destructive px-2.5 py-0.5 rounded-md">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> Candidate matches all identified skill parameters.
                  </div>
                )}
              </div>
            </div>

            {/* Learning paths */}
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <BookOpen size={16} className="text-primary" />
                Recommended Upskilling Paths
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.learning_path.map((path, i) => (
                  <div key={i} className="bg-muted/30 border border-border p-4 rounded-xl shadow-sm card-hover flex items-start gap-3">
                    <div className="bg-primary/10 border border-primary/20 text-primary w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground leading-relaxed">{path}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: INTERVIEW PREP QUESTIONS */}
        {activeTab === 'interview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-foreground font-heading">Personalized Interview Guide</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Custom questions tailored to the candidate's profile, including expected answers.</p>
            </div>

            <div className="space-y-4">
              {data.interview_questions.map((item, idx) => {
                const isExpanded = expandedQuestion === idx;
                return (
                  <div key={idx} className="border border-border rounded-xl overflow-hidden shadow-sm bg-card card-hover">
                    <button
                      onClick={() => setExpandedQuestion(isExpanded ? null : idx)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/20 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase bg-foreground text-background rounded-md">
                          {item.category}
                        </span>
                        <span className="text-sm font-semibold text-foreground/90">{item.question}</span>
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                    </button>
                    
                    {isExpanded && (
                      <div className="p-4 bg-muted/40 border-t border-border text-xs text-muted-foreground leading-relaxed space-y-1 animate-fade-in">
                        <span className="block font-bold text-foreground/75 uppercase tracking-wider mb-1">Recruiter Evaluation Guide / Suggested Answer:</span>
                        <p className="text-foreground/90">{item.suggested_answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: RESUME CHATBOT (RAG) */}
        {activeTab === 'chatbot' && (
          <div className="flex flex-col h-[480px] animate-fade-in">
            {/* Header info */}
            <div className="border-b border-border pb-3 mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground font-heading">RAG Resume Chatbot</h3>
                <p className="text-xs text-muted-foreground">Ask specific candidate-related questions compiled from the FAISS database.</p>
              </div>
              <span className="px-3 py-1 text-[10px] font-bold uppercase bg-indigo-500/10 border border-indigo-500/20 text-primary dark:text-indigo-400 rounded-full flex items-center gap-1">
                <Sparkles size={11} className="animate-pulse" /> FAISS + Gemini Connected
              </span>
            </div>

            {/* Chat Timeline history */}
            <div className="flex-1 overflow-y-auto space-y-3.5 p-4 bg-muted/20 border border-border rounded-xl mb-4 scrollbar-thin">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                  <div className="flex items-start gap-2.5 max-w-[80%]">
                    {msg.sender === 'bot' && (
                      <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Sparkles size={12} />
                      </div>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      msg.sender === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-none glow-primary' 
                        : 'bg-card border border-border text-foreground rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                    {msg.sender === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-primary border border-primary/30 text-primary-foreground flex items-center justify-center shrink-0 mt-0.5 shadow-sm uppercase font-semibold text-[10px]">
                        ME
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={12} className="animate-spin" />
                    </div>
                    <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef}></div>
            </div>

            {/* Input form */}
            <form onSubmit={handleSendChatMessage} className="flex gap-2">
              <input
                type="text"
                required
                disabled={chatLoading}
                className="flex-1 px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-xs placeholder-muted-foreground text-foreground shadow-sm"
                placeholder="Ask about candidate, e.g., 'What projects have they done?'"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={chatLoading}
                className="px-4 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl flex items-center justify-center transition-all shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
