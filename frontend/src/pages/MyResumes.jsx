import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  UploadCloud, FileText, CheckCircle2, Trash2, Star, AlertCircle, 
  ArrowRight, ShieldCheck, RefreshCw, Sparkles, ExternalLink
} from 'lucide-react';
import { useToast } from '../components/Toast';

export default function MyResumes() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchResumes = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/resumes');
      setResumes(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load your resumes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadResumeFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadResumeFile(e.target.files[0]);
    }
  };

  const uploadResumeFile = async (file) => {
    // Validate file type
    const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));
    if (!isValid) {
      toast.error('Unsupported file format. Please upload PDF, DOCX, or TXT.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds the 10MB limit.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`"${file.name}" uploaded and parsed successfully!`);
      await fetchResumes();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to upload and parse resume.');
    } finally {
      setUploading(false);
    }
  };

  const handleSetActive = async (resumeId) => {
    try {
      await axios.put(`/resumes/${resumeId}/activate`);
      toast.success('Active resume updated.');
      setResumes(prev => prev.map(r => ({
        ...r,
        is_active: r.id === resumeId ? 1 : 0
      })));
    } catch (err) {
      toast.error('Failed to set active resume.');
    }
  };

  const handleDelete = async (resumeId, fileName) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName || 'this resume'}"?`)) {
      return;
    }

    try {
      await axios.delete(`/resumes/${resumeId}`);
      toast.success('Resume deleted successfully.');
      setResumes(prev => prev.filter(r => r.id !== resumeId));
    } catch (err) {
      toast.error('Failed to delete resume.');
    }
  };

  return (
    <div className="space-y-8 animate-slide-up max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">
              My Resumes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload, manage, and configure your active resume for AI analysis, ATS scanning, and career coaching.
            </p>
          </div>
          <button
            onClick={() => document.getElementById('resume-file-input').click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer self-start sm:self-auto"
          >
            <UploadCloud size={16} />
            Upload New Resume
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('resume-file-input').click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
          dragActive
            ? 'border-primary bg-primary/10 ring-4 ring-primary/20 scale-[1.01]'
            : 'border-border bg-card/50 hover:bg-card hover:border-primary/50'
        }`}
      >
        <input
          id="resume-file-input"
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          className="hidden"
          onChange={handleFileInput}
        />
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            {uploading ? (
              <RefreshCw size={26} className="animate-spin" />
            ) : (
              <UploadCloud size={28} />
            )}
          </div>
          <p className="text-sm font-bold text-foreground">
            {uploading ? 'Parsing and extracting resume intelligence...' : 'Click to upload or drag & drop your resume'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports PDF (.pdf), Word (.docx, .doc), or plain text (.txt) up to 10MB
          </p>
          <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-500" /> Private & Secure
            </span>
            <span className="flex items-center gap-1">
              <Sparkles size={14} className="text-primary" /> Instant ATS Parse
            </span>
          </div>
        </div>
      </div>

      {/* Uploaded Resumes List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-heading text-foreground">
            Uploaded Documents ({resumes.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center bg-card rounded-2xl border border-border">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : resumes.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <FileText size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="text-base font-bold text-foreground">No Resumes Uploaded Yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
              Upload your first resume above to unlock deep AI analysis, ATS compatibility scoring, and personalized job matching.
            </p>
            <button
              onClick={() => document.getElementById('resume-file-input').click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary hover:text-white transition-all cursor-pointer"
            >
              <UploadCloud size={14} /> Upload Resume Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resumes.map((resume) => {
              const isActive = resume.is_active === 1;
              return (
                <div
                  key={resume.id}
                  className={`bg-card border rounded-2xl p-5 shadow-sm transition-all duration-200 flex flex-col justify-between ${
                    isActive
                      ? 'border-primary/50 ring-1 ring-primary/20 shadow-primary/5'
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2.5 rounded-xl border ${
                          isActive 
                            ? 'bg-primary/10 text-primary border-primary/20' 
                            : 'bg-muted text-muted-foreground border-border'
                        }`}>
                          <FileText size={20} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-foreground truncate" title={resume.file_name || 'Resume Document'}>
                            {resume.file_name || 'Resume Document'}
                          </h4>
                          <span className="text-[11px] text-muted-foreground">
                            Uploaded {resume.uploaded_at ? new Date(resume.uploaded_at).toLocaleDateString() : 'Recently'}
                          </span>
                        </div>
                      </div>

                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <Star size={10} className="fill-emerald-500" /> Active Resume
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetActive(resume.id)}
                          className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        >
                          Make Active
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate('/resume-analysis')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        Analysis <ArrowRight size={12} />
                      </button>
                      <button
                        onClick={() => navigate('/job-matching')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-all cursor-pointer"
                      >
                        Match Job
                      </button>
                    </div>

                    <button
                      onClick={() => handleDelete(resume.id, resume.file_name)}
                      className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Delete resume"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
