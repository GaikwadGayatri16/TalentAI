import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Upload, FileText, CheckCircle2, AlertCircle, 
  ChevronRight, Award, Trophy, Users, BadgeHelp 
} from 'lucide-react';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const fetchJobData = async () => {
    try {
      const jobResponse = await axios.get(`/jobs/${id}`);
      setJob(jobResponse.data);
      
      const candidatesResponse = await axios.get(`/jobs/${id}/candidates`);
      setCandidates(candidatesResponse.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load job profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobData();
  }, [id]);

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadFiles(e.target.files);
    }
  };

  const uploadFiles = async (fileList) => {
    setUploading(true);
    setError('');
    setUploadResults(null);
    
    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i]);
    }
    
    try {
      const response = await axios.post(`/jobs/${id}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploadResults(response.data.results);
      // Refresh candidates list
      const candResponse = await axios.get(`/jobs/${id}/candidates`);
      setCandidates(candResponse.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to upload resumes.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="space-y-4 animate-slide-up bg-background">
        <Link to="/jobs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-all font-semibold">
          <ArrowLeft size={16} /> Back to Jobs
        </Link>
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up bg-background">
      {/* Back button & Breadcrumbs */}
      <div>
        <Link to="/jobs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-all font-semibold mb-2">
          <ArrowLeft size={16} /> Back to Jobs
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">{job.title}</h1>
            <p className="text-sm text-primary font-bold mt-0.5">{job.company}</p>
          </div>
          <span className="self-start md:self-auto text-xs font-bold bg-muted border border-border px-3.5 py-1.5 rounded-full text-foreground/80">
            Min Exp: {job.experience_required}+ Years
          </span>
        </div>
      </div>

      {/* Grid: Job Description Card vs Resume Upload Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Job info card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm lg:col-span-1 h-fit">
          <h3 className="text-lg font-bold text-foreground border-b border-border pb-3 font-heading flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            Job Profile Details
          </h3>
          <div className="mt-4 space-y-4">
            <div>
              <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Required Skills</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {job.required_skills.split(',').map((skill, i) => (
                  <span key={i} className="text-xs font-semibold bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-md">
                    {skill.trim()}
                  </span>
                ))}
              </div>
            </div>

            {job.preferred_skills && (
              <div>
                <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Preferred Skills</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {job.preferred_skills.split(',').map((skill, i) => (
                    <span key={i} className="text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-md">
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Job Description</span>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1.5 whitespace-pre-line line-clamp-6 hover:line-clamp-none transition-all duration-300">
                {job.description}
              </p>
            </div>
          </div>
        </div>

        {/* Resume drag-and-drop upload zone */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground border-b border-border pb-3 font-heading flex items-center gap-2">
              <Upload size={18} className="text-primary animate-pulse" />
              Upload Candidate Resumes
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Screen multiple candidate resumes simultaneously (PDF or DOCX).</p>
            
            {/* Drag drop zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`mt-4 border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                dragActive 
                  ? 'border-primary bg-primary/10 ring-4 ring-primary/20 glow-primary scale-[1.01]' 
                  : 'border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40'
              }`}
              onClick={() => document.getElementById('file-input').click()}
            >
              <input
                id="file-input"
                type="file"
                multiple
                accept=".pdf,.docx,.doc"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <div className="p-3 bg-muted border border-border rounded-full text-muted-foreground mb-3">
                <Upload size={24} />
              </div>
              <p className="text-sm font-semibold text-foreground">Drag & drop files here, or <span className="text-primary hover:underline">browse</span></p>
              <p className="text-xs text-muted-foreground mt-1">Supports PDF, DOCX (Max 10 files at once)</p>
            </div>
          </div>

          {/* Upload Status / Outcomes */}
          <div className="mt-4">
            {uploading && (
              <div className="flex items-center gap-3 p-4 bg-muted border border-border rounded-xl">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span className="text-sm text-muted-foreground font-semibold">Parsing resumes and running AI evaluations. Please wait...</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {uploadResults && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto mt-2 p-3 bg-muted border border-border rounded-xl">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Upload Results:</h4>
                {uploadResults.map((res, i) => (
                  <div key={i} className="flex items-center justify-between text-xs font-medium">
                    <span className="text-muted-foreground truncate max-w-[75%]">{res.filename}</span>
                    {res.status === 'Success' ? (
                      <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={12} /> Parsed ({res.candidate_name})</span>
                    ) : (
                      <span className="text-destructive flex items-center gap-1"><AlertCircle size={12} /> Failed</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Candidate Rankings List Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Trophy className="text-amber-500" size={20} />
            <h3 className="text-lg font-bold text-foreground font-heading">ATS & Semantic Matching Rankings</h3>
          </div>
          <span className="text-xs font-semibold text-muted-foreground bg-muted border border-border px-3 py-1 rounded-full">
            {candidates.length} Candidate{candidates.length !== 1 && 's'} Screened
          </span>
        </div>

        {candidates.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            <Users size={32} className="mx-auto mb-3 text-muted-foreground/60" />
            <span>No resumes processed for this job. Upload candidates to view comparative scores.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-4 px-6 text-center">Rank</th>
                  <th className="py-4 px-6">Candidate Name</th>
                  <th className="py-4 px-6 text-center">Experience</th>
                  <th className="py-4 px-6 text-center">ATS Score</th>
                  <th className="py-4 px-6 text-center">Semantic Score</th>
                  <th className="py-4 px-6 text-center">Final Score</th>
                  <th className="py-4 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {candidates.map((cand, index) => {
                  // Style based on score metrics
                  let atsBadgeColor = 'bg-destructive/10 text-destructive border-destructive/20';
                  if (cand.ats_score >= 80) atsBadgeColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
                  else if (cand.ats_score >= 60) atsBadgeColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';

                  let finalBadgeColor = 'bg-primary/10 border-primary/20 text-primary';
                  let rowBg = 'hover:bg-muted/20';

                  if (cand.rank === 1) {
                    finalBadgeColor = 'bg-amber-500/20 border-amber-500/35 text-amber-700 dark:text-amber-400';
                    rowBg = 'bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10 dark:hover:bg-amber-500/15';
                  } else if (cand.rank === 2) {
                    finalBadgeColor = 'bg-slate-400/20 border-slate-400/35 text-slate-700 dark:text-slate-300';
                    rowBg = 'bg-slate-400/5 dark:bg-slate-400/10 hover:bg-slate-400/10 dark:hover:bg-slate-400/15';
                  } else if (cand.rank === 3) {
                    finalBadgeColor = 'bg-orange-500/20 border-orange-500/35 text-orange-700 dark:text-orange-400';
                    rowBg = 'bg-orange-500/5 dark:bg-orange-500/10 hover:bg-orange-500/10 dark:hover:bg-orange-500/15';
                  }
                  
                  return (
                    <tr key={cand.candidate_id} className={`${rowBg} transition-colors`}>
                      <td className="py-4 px-6 text-center font-bold">
                        {cand.rank === 1 ? (
                          <div className="flex justify-center items-center gap-1 text-amber-600 dark:text-amber-400">
                            <Trophy size={18} className="text-amber-500 animate-bounce" />
                            <span className="text-xs">1st</span>
                          </div>
                        ) : cand.rank === 2 ? (
                          <div className="flex justify-center items-center gap-1 text-slate-500 dark:text-slate-300">
                            <Award size={18} className="text-slate-400" />
                            <span className="text-xs">2nd</span>
                          </div>
                        ) : cand.rank === 3 ? (
                          <div className="flex justify-center items-center gap-1 text-orange-600 dark:text-orange-400">
                            <Award size={18} className="text-orange-500" />
                            <span className="text-xs">3rd</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{cand.rank}</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-semibold text-foreground">{cand.candidate_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{cand.candidate_email}</p>
                      </td>
                      <td className="py-4 px-6 text-center text-muted-foreground font-medium">
                        {cand.candidate_experience} Yr{cand.candidate_experience !== 1 && 's'}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-block px-2.5 py-1 text-xs font-bold border rounded-lg ${atsBadgeColor}`}>
                          {cand.ats_score}%
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center font-medium text-muted-foreground">
                        {cand.similarity_score}%
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-block px-3 py-1 text-xs font-extrabold border rounded-lg ${finalBadgeColor}`}>
                          {cand.final_score}%
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => navigate(`/candidates/${cand.candidate_id}/analysis/${id}`)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-white bg-primary/5 hover:bg-primary border border-primary/10 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          Analyze <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
