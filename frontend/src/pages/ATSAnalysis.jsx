import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  CheckCircle2, XCircle, AlertTriangle, ShieldCheck, ArrowRight, 
  UploadCloud, FileCheck, Info, Sparkles, RefreshCw
} from 'lucide-react';
import { useToast } from '../components/Toast';

export default function ATSAnalysis() {
  const [analysis, setAnalysis] = useState(null);
  const [activeResume, setActiveResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchATSData = async () => {
    try {
      setLoading(true);
      const resList = await axios.get('/resumes');
      if (resList.data.length === 0) {
        setLoading(false);
        return;
      }

      const active = resList.data.find(r => r.is_active === 1) || resList.data[0];
      setActiveResume(active);

      if (active) {
        const res = await axios.get(`/resumes/${active.id}/analysis`);
        setAnalysis(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load ATS compatibility metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchATSData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="text-xs font-semibold text-muted-foreground">Running ATS compatibility scans...</span>
        </div>
      </div>
    );
  }

  if (!activeResume || !analysis) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-card border border-border rounded-2xl p-12 text-center">
        <ShieldCheck size={44} className="mx-auto text-primary mb-4" />
        <h2 className="text-xl font-bold font-heading text-foreground">No Active Resume Found</h2>
        <p className="text-xs text-muted-foreground mt-1 mb-6 max-w-md mx-auto">
          Upload your resume in PDF or DOCX format to run our ATS compatibility scan and view parsing diagnostics.
        </p>
        <button
          onClick={() => navigate('/resumes')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-md shadow-primary/25 hover:bg-primary/90 transition-all cursor-pointer"
        >
          <UploadCloud size={16} /> Upload Resume to My Resumes
        </button>
      </div>
    );
  }

  const atsScore = analysis.ats_score || 0;
  const atsDetails = analysis.ats_details || {};
  const warnings = atsDetails.warnings || [];

  return (
    <div className="space-y-8 animate-slide-up max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">
          ATS Compatibility Scanner
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estimated Applicant Tracking System readiness score, formatting diagnostics, and section checklist.
        </p>
      </div>

      {/* Main Score & Diagnostic Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* ATS Score Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-500" /> Estimated ATS Score
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Screening Benchmark
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-5xl font-heading font-extrabold text-foreground tracking-tight">
                {atsScore}%
              </span>
            </div>

            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              {atsScore >= 80
                ? 'High ATS Readiness. Standard section headers detected and document text extracts cleanly without parsing bottlenecks.'
                : atsScore >= 60
                ? 'Moderate ATS Readiness. Document is readable, but resolving formatting flags will prevent automated filtering.'
                : 'Action Required. Crucial contact details or standard headings are missing, risking rejection by parsers.'}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">Document:</span>
            <span className="text-foreground truncate max-w-[150px]">{activeResume.file_name}</span>
          </div>
        </div>

        {/* Diagnostic Checkpoints */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold font-heading text-foreground mb-4 flex items-center gap-2">
              <FileCheck size={18} className="text-primary" /> Core Parsing Parameters
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Check 1: Headings */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-start gap-3">
                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                  atsDetails.standard_headings === 'Passed' 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {atsDetails.standard_headings === 'Passed' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Standard Section Headings</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {atsDetails.standard_headings === 'Passed'
                      ? 'Experience, Skills, and Education sections are clearly designated.'
                      : 'Some standard headings (e.g. Experience, Education) could not be resolved.'}
                  </p>
                </div>
              </div>

              {/* Check 2: Contact Info */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-start gap-3">
                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                  atsDetails.contact_info_complete 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {atsDetails.contact_info_complete ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Contact Header Coordinates</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {atsDetails.contact_info_complete
                      ? 'Verified email address and phone number are present.'
                      : 'Missing email or telephone number in primary header.'}
                  </p>
                </div>
              </div>

              {/* Check 3: Text Readability */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0 mt-0.5">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Text Layer Extraction</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Document contains machine-readable selectable text with standard UTF-8 characters.
                  </p>
                </div>
              </div>

              {/* Check 4: Keyword Density */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Technical Keyword Density</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {atsDetails.keyword_density || 'Recognized industry technical keywords'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Looking to compare against a specific Job Opening?</span>
            <Link
              to="/job-matching"
              className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
            >
              Run Target Job Match <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Warnings & Parsing Diagnostics */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold font-heading text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-500" /> ATS Parsing Diagnostics & Warnings
        </h3>

        {warnings.length === 0 ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>Zero critical parsing warnings detected. Your resume structure follows recommended ATS guidelines!</span>
          </div>
        ) : (
          <div className="space-y-3">
            {warnings.map((warn, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium flex items-start gap-2.5">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{warn}</span>
              </div>
            ))}
          </div>
        )}

        {/* Informational Disclaimer */}
        <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border text-muted-foreground text-xs leading-relaxed flex items-start gap-2.5">
          <Info size={16} className="text-primary shrink-0 mt-0.5" />
          <span>
            <strong>Note on ATS Assessment:</strong> This report provides an estimated compatibility assessment based on standard optical parsing, heading detection, and keyword algorithms. Different companies use diverse ATS platforms (Workday, Greenhouse, Lever, Taleo) which may apply customized scoring filters.
          </span>
        </div>
      </div>
    </div>
  );
}
