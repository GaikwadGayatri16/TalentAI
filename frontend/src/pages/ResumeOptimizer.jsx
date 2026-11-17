import React, { useState } from 'react';
import axios from 'axios';
import { 
  Wand2, Sparkles, Copy, Check, ArrowRight, CheckCircle2, 
  RefreshCw, ShieldCheck, FileText, SplitSquareVertical
} from 'lucide-react';
import { useToast } from '../components/Toast';

export default function ResumeOptimizer() {
  const [sectionType, setSectionType] = useState('summary');
  const [targetRole, setTargetRole] = useState('Senior Software Engineer');
  const [content, setContent] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const toast = useToast();

  const sampleSnippets = {
    summary: "Dedicated software developer with 3 years of experience in Python and web development. Good at solving problems, working in teams, and building APIs.",
    project: "Built an e-commerce website using React and Node.js. It had user login, product catalog, cart management, and payment gateway integration with Stripe.",
    experience_bullet: "Worked on backend microservices. Wrote SQL queries and fixed bugs to make the system run faster."
  };

  const handleUseSample = (type) => {
    setSectionType(type);
    setContent(sampleSnippets[type]);
    setResult(null);
  };

  const handleOptimize = async (e) => {
    e.preventDefault();
    if (!content.trim() || content.trim().length < 15) {
      toast.error('Please enter at least 15 characters to optimize.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/resumes/improve', {
        section_type: sectionType,
        content: content,
        target_role: targetRole
      });
      setResult(res.data);
      toast.success('Generated professional optimization!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to optimize resume section.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyImproved = () => {
    if (!result?.improved) return;
    navigator.clipboard.writeText(result.improved);
    setCopied(true);
    toast.success('Copied improved text to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-slide-up max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">
          AI Resume Optimizer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Transform ordinary bullet points and summaries into executive-grade, STAR-formatted statements without fabricating credentials.
        </p>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Input Form */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-bold font-heading text-foreground flex items-center gap-2">
              <FileText size={16} className="text-primary" /> Source Content
            </h3>
            <span className="text-[11px] text-muted-foreground">Original Draft</span>
          </div>

          <form onSubmit={handleOptimize} className="space-y-4">
            {/* Section Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Section Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'summary', label: 'Summary' },
                  { id: 'project', label: 'Project' },
                  { id: 'experience_bullet', label: 'Experience' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setSectionType(s.id); setResult(null); }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      sectionType === s.id
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-muted/50 border border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Role */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Target Role
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Backend Engineer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Original Content Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Draft Content to Enhance
                </label>
                <button
                  type="button"
                  onClick={() => handleUseSample(sectionType)}
                  className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                >
                  Load Sample
                </button>
              </div>
              <textarea
                rows={6}
                required
                placeholder="Paste your existing bullet point or summary here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md shadow-primary/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  Applying STAR Principles & Action Verbs...
                </>
              ) : (
                <>
                  <Wand2 size={16} /> Enhance with AI Optimizer
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Side-by-Side Enhanced Output */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-bold font-heading text-foreground flex items-center gap-2">
              <Sparkles size={16} className="text-primary" /> AI Optimized Version
            </h3>
            {result && (
              <button
                onClick={handleCopyImproved}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-primary bg-primary/10 rounded-lg hover:bg-primary hover:text-white transition-all cursor-pointer"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            )}
          </div>

          {!result ? (
            <div className="p-12 text-center text-muted-foreground">
              <Wand2 size={36} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-xs">
                Your AI-enhanced version with STAR impact statements and strong action verbs will appear here side-by-side.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {/* Output Content Card */}
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-foreground/90 font-medium leading-relaxed">
                <p>{result.improved}</p>
              </div>

              {/* Action Verbs Incorporated */}
              {result.action_verbs_used && result.action_verbs_used.length > 0 && (
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    High-Impact Action Verbs
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.action_verbs_used.map((verb, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                        {verb}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Enhancements Made */}
              {result.key_changes && result.key_changes.length > 0 && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Key Improvements Applied
                  </span>
                  <ul className="space-y-1.5 text-xs text-foreground/80">
                    {result.key_changes.map((change, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-3 bg-muted/20 border border-border rounded-xl text-[11px] text-muted-foreground flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                <span>Zero fabricated metrics. Enhancements strictly rephrase your verified statements.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
