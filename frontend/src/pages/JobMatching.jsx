import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  GitCompare, Briefcase, CheckCircle2, XCircle, Sparkles, 
  ArrowRight, AlertCircle, RefreshCw, BookOpen, Clock, FileText
} from 'lucide-react';
import { useToast } from '../components/Toast';

export default function JobMatching() {
  const [jobs, setJobs] = useState([]);
  const [pastMatches, setPastMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);

  // Form states
  const [selectedJobId, setSelectedJobId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customCompany, setCustomCompany] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customSkills, setCustomSkills] = useState('');
  const [customExp, setCustomExp] = useState(0);

  // Active match result
  const [matchResult, setMatchResult] = useState(null);

  const toast = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [jobsRes, matchesRes] = await Promise.all([
        axios.get('/jobs'),
        axios.get('/jobs/matches')
      ]);
      setJobs(jobsRes.data);
      setPastMatches(matchesRes.data);
      if (matchesRes.data.length > 0) {
        setMatchResult(matchesRes.data[0]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load job matching context.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectPredefinedJob = (jobId) => {
    setSelectedJobId(jobId);
    if (!jobId) {
      setCustomTitle('');
      setCustomCompany('');
      setCustomDescription('');
      setCustomSkills('');
      setCustomExp(0);
      return;
    }
    const found = jobs.find(j => j.id === Number(jobId));
    if (found) {
      setCustomTitle(found.title);
      setCustomCompany(found.company);
      setCustomDescription(found.description);
      setCustomSkills(found.required_skills || '');
      setCustomExp(found.experience_required || 0);
    }
  };

  const handleRunMatch = async (e) => {
    e.preventDefault();
    if (!customDescription.trim() || customDescription.trim().length < 20) {
      toast.error('Please provide a complete job description (at least 20 characters).');
      return;
    }

    setMatching(true);
    try {
      const payload = {
        job_id: selectedJobId ? Number(selectedJobId) : null,
        job_title: customTitle || 'Target Position',
        job_company: customCompany,
        job_description: customDescription,
        required_skills: customSkills,
        experience_required: Number(customExp) || 0
      };

      const res = await axios.post('/jobs/match', payload);
      setMatchResult(res.data);
      toast.success('Job match calculated successfully!');
      // Refresh match history
      const updatedMatches = await axios.get('/jobs/matches');
      setPastMatches(updatedMatches.data);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to match resume against job description.');
    } finally {
      setMatching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="text-xs font-semibold text-muted-foreground">Loading job profiles...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-up max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">
          Intelligent Job Matching
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compare your active resume against real job requirements to compute skill alignment and personalized gap analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Job Description Input */}
        <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <h3 className="text-base font-bold font-heading text-foreground flex items-center gap-2">
              <Briefcase size={18} className="text-primary" /> Target Job Profile
            </h3>
            {jobs.length > 0 && (
              <span className="text-[11px] font-semibold text-muted-foreground">
                {jobs.length} Available in Database
              </span>
            )}
          </div>

          <form onSubmit={handleRunMatch} className="space-y-4">
            {/* Select Predefined Job */}
            {jobs.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Choose from Open Job Listings
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => handleSelectPredefinedJob(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="">-- Or Paste Custom Job Description Below --</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.title} • {j.company}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Job Title & Company */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Python Developer"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Company (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TechCorp"
                  value={customCompany}
                  onChange={(e) => setCustomCompany(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Required Skills (Comma-separated) */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Required Skills (Comma separated)
              </label>
              <input
                type="text"
                placeholder="e.g. Python, FastAPI, Docker, AWS"
                value={customSkills}
                onChange={(e) => setCustomSkills(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Job Description Textarea */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Full Job Description
              </label>
              <textarea
                required
                rows={7}
                placeholder="Paste the full job requirements, responsibilities, and qualifications..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={matching}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md shadow-primary/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {matching ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  Calculating Semantic & Skill Alignment...
                </>
              ) : (
                <>
                  <GitCompare size={16} /> Run Job Match Analysis
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Panel: Match Outcomes & Skill Gap */}
        <div className="lg:col-span-7 space-y-6">
          {!matchResult ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <GitCompare size={40} className="mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-bold text-foreground">No Match Executed Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Select a job on the left or paste a description, then click "Run Job Match Analysis" to see your alignment score and gap roadmap.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Score Header Card */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Match Assessment Result
                  </span>
                  <h3 className="text-2xl font-bold font-heading text-foreground mt-0.5">
                    {matchResult.job_title}
                  </h3>
                  {matchResult.job_company && (
                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                      {matchResult.job_company}
                    </p>
                  )}
                </div>

                {/* Score Badge */}
                <div className="text-center sm:text-right bg-primary/10 border border-primary/20 px-5 py-3 rounded-2xl shrink-0">
                  <span className="block text-[10px] font-bold text-primary uppercase tracking-wider">
                    Overall Fit Score
                  </span>
                  <span className="text-3xl font-extrabold text-primary font-heading">
                    {matchResult.overall_match_score}%
                  </span>
                </div>
              </div>

              {/* Dimension Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-card border border-border p-4 rounded-xl text-center">
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Skill Match
                  </span>
                  <span className="text-xl font-bold text-emerald-500 mt-1 block">
                    {matchResult.skill_match_score}%
                  </span>
                </div>

                <div className="bg-card border border-border p-4 rounded-xl text-center">
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Semantic Fit
                  </span>
                  <span className="text-xl font-bold text-primary mt-1 block">
                    {matchResult.semantic_match_score}%
                  </span>
                </div>

                <div className="bg-card border border-border p-4 rounded-xl text-center">
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Experience
                  </span>
                  <span className="text-xl font-bold text-amber-500 mt-1 block">
                    {matchResult.experience_match_score}%
                  </span>
                </div>
              </div>

              {/* Matched vs Missing Skills Chips */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Matched Skills */}
                <div className="bg-card border border-emerald-500/20 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Matched Skills ({matchResult.matched_skills.length})
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {matchResult.matched_skills.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No direct skill matches detected.</span>
                    ) : (
                      matchResult.matched_skills.map((skill, idx) => (
                        <span key={idx} className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {skill}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Missing Skills */}
                <div className="bg-card border border-amber-500/20 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle size={16} className="text-amber-500" />
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Missing Skills ({matchResult.missing_skills.length})
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {matchResult.missing_skills.length === 0 ? (
                      <span className="text-xs text-emerald-500 font-semibold">All required skills are supported!</span>
                    ) : (
                      matchResult.missing_skills.map((skill, idx) => (
                        <span key={idx} className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {skill}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Skill Gap Roadmap */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen size={18} className="text-primary" />
                  <h4 className="text-sm font-bold font-heading text-foreground">
                    Tailored Upskilling Recommendations
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {(matchResult.skill_gap_analysis || []).map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3.5 bg-muted/30 border border-border rounded-xl text-xs text-foreground/90 font-medium">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
