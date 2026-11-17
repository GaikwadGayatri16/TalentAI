import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  HelpCircle, Sparkles, ChevronDown, ChevronUp, BookOpen, 
  Award, Briefcase, RefreshCw, CheckCircle2, ArrowRight
} from 'lucide-react';
import { useToast } from '../components/Toast';

export default function InterviewPrep() {
  const [targetRole, setTargetRole] = useState('Full Stack Software Engineer');
  const [jobDescription, setJobDescription] = useState('');
  const [questions, setQuestions] = useState([]);
  const [pastSessions, setPastSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(0);

  const toast = useToast();

  const fetchPastPreps = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/interview-prep');
      setPastSessions(res.data);
      if (res.data.length > 0) {
        setQuestions(res.data[0].questions || []);
        setTargetRole(res.data[0].target_role);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPastPreps();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!targetRole.trim()) {
      toast.error('Please specify a target role.');
      return;
    }

    setGenerating(true);
    try {
      const res = await axios.post('/interview-prep/generate', {
        target_role: targetRole,
        job_description: jobDescription
      });
      setQuestions(res.data.questions || []);
      setExpandedIdx(0);
      toast.success('Generated personalized interview guide!');
      // Refresh past sessions list
      const updated = await axios.get('/interview-prep');
      setPastSessions(updated.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to generate interview questions.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-slide-up max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">
          AI Interview Preparation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tailored interview questions and model answers synthesized from your verified resume projects and target position.
        </p>
      </div>

      {/* Generator Form */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Target Role / Job Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Python Backend Developer, Data Scientist, Full Stack Engineer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Job Context / Description (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. High-throughput FastAPI services, PostgreSQL, AWS ECS"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={generating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-md shadow-primary/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {generating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Generating Personalized Questions...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Generate Custom Interview Guide
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Question Cards Accordion */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold font-heading text-foreground flex items-center gap-2">
            <HelpCircle size={18} className="text-primary" /> Personalized Questions ({questions.length})
          </h2>
          {targetRole && (
            <span className="text-xs font-semibold text-muted-foreground">
              Role: <span className="text-foreground font-bold">{targetRole}</span>
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center bg-card rounded-2xl border border-border">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <HelpCircle size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="text-base font-bold text-foreground">No Questions Generated Yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
              Enter your target job title above and click "Generate Custom Interview Guide" to get real tailored interview questions with model answers.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, idx) => {
              const isExpanded = expandedIdx === idx;
              return (
                <div
                  key={idx}
                  className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm transition-all"
                >
                  <button
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 pr-4">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded bg-muted text-foreground border border-border">
                            {q.category || 'Technical'}
                          </span>
                          {q.difficulty && (
                            <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded ${
                              q.difficulty.toLowerCase() === 'hard'
                                ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                : q.difficulty.toLowerCase() === 'medium'
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            }`}>
                              {q.difficulty}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-foreground/90">
                          {q.question}
                        </h4>
                      </div>
                    </div>

                    <div className="text-muted-foreground shrink-0">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </button>

                  {/* Expanded Body */}
                  {isExpanded && (
                    <div className="p-5 bg-muted/20 border-t border-border space-y-4 animate-fade-in text-xs">
                      <div>
                        <span className="block text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                          Recruiter Evaluation & Suggested Answer Guideline:
                        </span>
                        <p className="text-foreground/90 leading-relaxed bg-card border border-border p-3.5 rounded-xl">
                          {q.suggested_answer}
                        </p>
                      </div>

                      {q.key_topics_to_cover && q.key_topics_to_cover.length > 0 && (
                        <div>
                          <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                            Key Concepts & Technologies to Mention:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {q.key_topics_to_cover.map((topic, tIdx) => (
                              <span key={tIdx} className="px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border text-[11px] font-medium">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
