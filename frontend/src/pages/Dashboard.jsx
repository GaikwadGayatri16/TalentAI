import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Briefcase, Users, Award, ShieldCheck, Sparkles, ArrowRight, 
  UploadCloud, GitCompare, MessageSquare, HelpCircle, FileText, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../App';
import { useToast } from '../components/Toast';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 text-slate-100 border border-slate-800 px-3.5 py-2 rounded-xl shadow-xl text-xs">
        {label && <p className="font-bold mb-1 font-heading">{label}</p>}
        {payload.map((p, idx) => (
          <p key={idx} className="font-medium flex items-center gap-1.5 mt-0.5 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.fill || 'hsl(var(--primary))' }} />
            <span className="capitalize">{p.name || 'Count'}:</span>{' '}
            <span className="text-white font-bold">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState(user?.role === 'recruiter' || user?.role === 'admin' ? 'recruiter' : 'candidate');
  
  // Data states
  const [candidateData, setCandidateData] = useState(null);
  const [recruiterData, setRecruiterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [candRes, recRes] = await Promise.all([
        axios.get('/dashboard/candidate').catch(() => ({ data: null })),
        axios.get('/analytics').catch(() => ({ data: null }))
      ]);
      setCandidateData(candRes.data);
      setRecruiterData(recRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="text-xs font-semibold text-muted-foreground">Aggregating platform metrics...</span>
        </div>
      </div>
    );
  }

  const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-8 animate-slide-up max-w-6xl mx-auto">
      {/* Header and Perspective Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">
            Platform Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time analytics, ATS diagnostic readiness, and active career roadmaps.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-card border border-border p-1 rounded-xl self-start sm:self-auto shadow-sm">
          <button
            onClick={() => setViewMode('candidate')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'candidate'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Candidate Hub
          </button>
          <button
            onClick={() => setViewMode('recruiter')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'recruiter'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Recruiter Analytics
          </button>
        </div>
      </div>

      {/* ========================================= */}
      {/* CANDIDATE VIEW */}
      {/* ========================================= */}
      {viewMode === 'candidate' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Resume Score */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Resume Score
                </span>
                <h3 className="text-2xl font-bold font-heading text-foreground mt-1">
                  {candidateData?.latest_analysis?.overall_score ? `${candidateData.latest_analysis.overall_score}%` : 'N/A'}
                </h3>
                <span className="text-[10px] text-muted-foreground">Multi-dimensional rating</span>
              </div>
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <Award size={22} />
              </div>
            </div>

            {/* ATS Readiness */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  ATS Readiness
                </span>
                <h3 className="text-2xl font-bold font-heading text-emerald-500 mt-1">
                  {candidateData?.latest_analysis?.ats_score ? `${candidateData.latest_analysis.ats_score}%` : 'N/A'}
                </h3>
                <span className="text-[10px] text-muted-foreground">Automated scan score</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                <ShieldCheck size={22} />
              </div>
            </div>

            {/* Total Resumes */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  My Resumes
                </span>
                <h3 className="text-2xl font-bold font-heading text-foreground mt-1">
                  {candidateData?.total_resumes || 0}
                </h3>
                <span className="text-[10px] text-muted-foreground">Uploaded documents</span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
                <UploadCloud size={22} />
              </div>
            </div>

            {/* Job Matches */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Target Matches
                </span>
                <h3 className="text-2xl font-bold font-heading text-foreground mt-1">
                  {candidateData?.total_matches || 0}
                </h3>
                <span className="text-[10px] text-muted-foreground">Job matches evaluated</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                <GitCompare size={22} />
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Quick Career Actions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                to="/resumes"
                className="p-3.5 rounded-xl bg-muted/40 hover:bg-primary/10 hover:border-primary/30 border border-border transition-all flex flex-col items-center text-center gap-2 group"
              >
                <UploadCloud size={20} className="text-primary group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-foreground">Manage Resumes</span>
              </Link>
              <Link
                to="/resume-analysis"
                className="p-3.5 rounded-xl bg-muted/40 hover:bg-primary/10 hover:border-primary/30 border border-border transition-all flex flex-col items-center text-center gap-2 group"
              >
                <Award size={20} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-foreground">Deep Analysis</span>
              </Link>
              <Link
                to="/job-matching"
                className="p-3.5 rounded-xl bg-muted/40 hover:bg-primary/10 hover:border-primary/30 border border-border transition-all flex flex-col items-center text-center gap-2 group"
              >
                <GitCompare size={20} className="text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-foreground">Match With Job</span>
              </Link>
              <Link
                to="/chat"
                className="p-3.5 rounded-xl bg-muted/40 hover:bg-primary/10 hover:border-primary/30 border border-border transition-all flex flex-col items-center text-center gap-2 group"
              >
                <Sparkles size={20} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-foreground">Career AI Chat</span>
              </Link>
            </div>
          </div>

          {/* Grid: Extracted Skills & Recent Job Matches */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Verified Skills from Resume */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold font-heading text-foreground">
                  Extracted Technical Skills
                </h3>
                <Link to="/resume-analysis" className="text-xs font-semibold text-primary hover:underline">
                  View All
                </Link>
              </div>

              {candidateData?.top_skills?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {candidateData.top_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  Upload a resume in My Resumes to display your extracted technical skills.
                </div>
              )}
            </div>

            {/* Recent Target Job Matches */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold font-heading text-foreground">
                  Recent Job Matches
                </h3>
                <Link to="/job-matching" className="text-xs font-semibold text-primary hover:underline">
                  New Match
                </Link>
              </div>

              {candidateData?.recent_matches?.length > 0 ? (
                <div className="space-y-2.5">
                  {candidateData.recent_matches.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{m.job_title}</h4>
                        {m.job_company && (
                          <span className="text-[11px] text-muted-foreground">{m.job_company}</span>
                        )}
                      </div>
                      <span className="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-primary/10 text-primary border border-primary/20">
                        {m.overall_match_score}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No job matches evaluated yet. Run a match in the Job Matching section!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* RECRUITER VIEW */}
      {/* ========================================= */}
      {viewMode === 'recruiter' && recruiterData && (
        <div className="space-y-6">
          {/* KPI Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
              <div className="p-4 rounded-xl border text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/30">
                <Briefcase size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Job Profiles</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{recruiterData.total_jobs}</h3>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
              <div className="p-4 rounded-xl border text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/30">
                <Users size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Resumes Screened</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{recruiterData.total_candidates}</h3>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
              <div className="p-4 rounded-xl border text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/30">
                <Award size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Average Candidate ATS</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{recruiterData.average_ats_score}%</h3>
              </div>
            </div>
          </div>

          {/* Recruiter Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Skills Bar Chart */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-foreground mb-4 font-heading">
                Top Candidate Pool Skills
              </h3>
              <div className="h-72">
                {recruiterData.top_skills.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={recruiterData.top_skills} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" fontSize={11} />
                      <YAxis dataKey="skill_name" type="category" fontSize={11} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Candidates" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
                    No candidate skills in database yet.
                  </div>
                )}
              </div>
            </div>

            {/* ATS Score Spread Area Chart */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-foreground mb-4 font-heading">
                ATS Score Spread
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={recruiterData.ats_distribution} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="range" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="count" name="Candidates" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recruitment Funnel */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm lg:col-span-2">
              <h3 className="text-base font-bold text-foreground mb-4 font-heading">
                Candidate Screening Distribution
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={recruiterData.candidate_distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="stage"
                      >
                        {recruiterData.candidate_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {recruiterData.candidate_distribution.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        <span className="text-xs font-semibold text-foreground">{entry.stage}</span>
                      </div>
                      <span className="text-xs font-bold text-foreground">{entry.count} Candidates</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
