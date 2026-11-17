import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Award, FileText, CheckCircle2, AlertTriangle, Lightbulb, 
  Sparkles, ArrowRight, UploadCloud, RefreshCw, Layers, ShieldCheck, 
  BarChart2, Zap
} from 'lucide-react';
import { useToast } from '../components/Toast';

export default function ResumeAnalysis() {
  const [analysis, setAnalysis] = useState(null);
  const [activeResume, setActiveResume] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const loadData = async (resumeId = null) => {
    try {
      setLoading(true);
      const resList = await axios.get('/resumes');
      setResumes(resList.data);

      if (resList.data.length === 0) {
        setLoading(false);
        return;
      }

      let targetResume = null;
      if (resumeId) {
        targetResume = resList.data.find(r => r.id === resumeId);
      } else {
        targetResume = resList.data.find(r => r.is_active === 1) || resList.data[0];
      }
      setActiveResume(targetResume);

      if (targetResume) {
        const analysisRes = await axios.get(`/resumes/${targetResume.id}/analysis`);
        setAnalysis(analysisRes.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load resume analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectResume = (id) => {
    loadData(Number(id));
  };

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="text-xs font-semibold text-muted-foreground">Evaluating resume dimensions...</span>
        </div>
      </div>
    );
  }

  if (resumes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-card border border-border rounded-2xl p-12 text-center">
        <UploadCloud size={44} className="mx-auto text-primary mb-4" />
        <h2 className="text-xl font-bold font-heading text-foreground">No Resume Found for Analysis</h2>
        <p className="text-xs text-muted-foreground mt-1 mb-6 max-w-md mx-auto">
          Please upload your resume to generate a deep multi-metric evaluation, section-wise scoring, strengths, and actionable improvement feedback.
        </p>
        <button
          onClick={() => navigate('/resumes')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md shadow-primary/25 hover:bg-primary/90 transition-all cursor-pointer"
        >
          <UploadCloud size={16} /> Go to My Resumes
        </button>
      </div>
    );
  }

  const overall = analysis?.overall_score || 0;
  const sections = analysis?.section_scores || {};

  return (
    <div className="space-y-8 animate-slide-up max-w-6xl mx-auto">
      {/* Header and Resume Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">
            AI Resume Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Transparent, multi-dimensional assessment of structure, technical depth, impact, and formatting.
          </p>
        </div>

        {/* Dropdown to switch resumes if multiple exist */}
        {resumes.length > 1 && (
          <div className="flex items-center gap-2 bg-card border border-border p-1.5 rounded-xl self-start md:self-auto">
            <span className="text-xs font-semibold text-muted-foreground pl-2">Document:</span>
            <select
              value={activeResume?.id || ''}
              onChange={(e) => handleSelectResume(e.target.value)}
              className="bg-transparent text-xs font-bold text-foreground border-none focus:outline-none cursor-pointer pr-2"
            >
              {resumes.map(r => (
                <option key={r.id} value={r.id} className="bg-card text-foreground">
                  {r.file_name || `Resume #${r.id}`} {r.is_active === 1 ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Top Banner: Score Card & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Main Score Gauge Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Award size={15} className="text-primary" /> Overall Resume Score
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                100 pt Scale
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-5xl font-heading font-extrabold text-foreground tracking-tight">
                {overall}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">/ 100</span>
            </div>

            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {overall >= 85
                ? 'Excellent resume profile. Strong technical foundation and high structural readability.'
                : overall >= 70
                ? 'Solid profile foundation. A few strategic enhancements in impact metrics will boost ranking.'
                : 'Foundational resume. Significant opportunities exist to highlight missing skills and project impact.'}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">ATS Readiness:</span>
            <span className="text-emerald-500 font-bold">{analysis?.ats_score || 0}% Compatible</span>
          </div>
        </div>

        {/* Section Metrics Breakdown Cards */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold font-heading text-foreground mb-4 flex items-center gap-2">
              <Layers size={18} className="text-primary" /> Section Evaluation Metrics
            </h3>
            
            <div className="space-y-4">
              {/* Structure */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold mb-1">
                  <span className="text-muted-foreground">Layout & Essential Headings</span>
                  <span className="text-foreground font-bold">{sections.structure || 0} / 100</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full transition-all duration-500" 
                    style={{ width: `${sections.structure || 0}%` }}
                  />
                </div>
              </div>

              {/* Content & Action Verbs */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold mb-1">
                  <span className="text-muted-foreground">Content Impact & Measurable Metrics</span>
                  <span className="text-foreground font-bold">{sections.content || 0} / 100</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${sections.content || 0}%` }}
                  />
                </div>
              </div>

              {/* Technical Skills */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold mb-1">
                  <span className="text-muted-foreground">Technical Skill Footprint</span>
                  <span className="text-foreground font-bold">{sections.skills || 0} / 100</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${sections.skills || 0}%` }}
                  />
                </div>
              </div>

              {/* Experience & Projects */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold mb-1">
                  <span className="text-muted-foreground">Work Experience & Project Depth</span>
                  <span className="text-foreground font-bold">{sections.experience || 0} / 100</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${sections.experience || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick CTAs */}
          <div className="pt-4 mt-4 border-t border-border flex flex-wrap items-center gap-3">
            <Link
              to="/ats-analysis"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold transition-all"
            >
              <ShieldCheck size={14} /> Full ATS Audit <ArrowRight size={12} />
            </Link>
            <Link
              to="/job-matching"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-all"
            >
              <Zap size={14} className="text-amber-500" /> Match with Job Description
            </Link>
            <Link
              to="/chat"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-all"
            >
              <Sparkles size={14} className="text-primary" /> Ask Career AI
            </Link>
          </div>
        </div>
      </div>

      {/* Strengths and Weaknesses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Verified Strengths */}
        <div className="bg-card border border-emerald-500/20 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold font-heading text-foreground">Verified Strengths</h3>
              <p className="text-[11px] text-muted-foreground">Strong points extracted directly from your profile</p>
            </div>
          </div>
          
          <ul className="space-y-3">
            {(analysis?.strengths || []).map((str, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground/90 font-medium">
                <span className="text-emerald-500 font-bold shrink-0 mt-0.5">•</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement / Weaknesses */}
        <div className="bg-card border border-amber-500/20 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold font-heading text-foreground">Areas for Improvement</h3>
              <p className="text-[11px] text-muted-foreground">Missing sections or elements that lower screening scores</p>
            </div>
          </div>

          <ul className="space-y-3">
            {(analysis?.weaknesses || []).map((wk, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground/90 font-medium">
                <span className="text-amber-500 font-bold shrink-0 mt-0.5">•</span>
                <span>{wk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Prioritized Actionable Recommendations */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Lightbulb size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold font-heading text-foreground">Prioritized Recommendations</h3>
            <p className="text-[11px] text-muted-foreground">Targeted improvements to maximize callback and interview rates</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(analysis?.suggestions || []).map((sug, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-muted/30 border border-border flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <p className="text-xs font-medium text-foreground/90 leading-relaxed">
                {sug}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
