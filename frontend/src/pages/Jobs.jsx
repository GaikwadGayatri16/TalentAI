import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Briefcase, Calendar, Trash2, Plus, Sparkles, AlertCircle, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../App';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [showDrawer, setShowDrawer] = useState(false);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [preferredSkills, setPreferredSkills] = useState('');
  const [experienceRequired, setExperienceRequired] = useState(0);
  
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchJobs = async () => {
    try {
      const response = await axios.get('/jobs');
      setJobs(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch job postings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setFormSubmitLoading(true);
    setError('');

    try {
      await axios.post('/jobs', {
        title,
        company,
        description,
        required_skills: requiredSkills,
        preferred_skills: preferredSkills,
        experience_required: parseInt(experienceRequired) || 0
      });
      
      // Reset form
      setTitle('');
      setCompany('');
      setDescription('');
      setRequiredSkills('');
      setPreferredSkills('');
      setExperienceRequired(0);
      setShowDrawer(false);
      
      // Refetch
      fetchJobs();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to create job posting.');
    } finally {
      setFormSubmitLoading(false);
    }
  };

  const handleDeleteJob = async (id, e) => {
    e.stopPropagation(); // Avoid navigating card click
    if (!window.confirm('Are you sure you want to delete this job and all associated candidate resumes?')) {
      return;
    }
    
    try {
      await axios.delete(`/jobs/${id}`);
      fetchJobs();
    } catch (err) {
      console.error(err);
      alert('Failed to delete job posting.');
    }
  };

  return (
    <div className="space-y-6 relative animate-slide-up bg-background text-foreground">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">Jobs & Resume Screening</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage job postings, upload batches of resumes, and review calculated ATS rankings.</p>
        </div>
        <button
          onClick={() => setShowDrawer(true)}
          className="flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-xl transition-all duration-200 shadow-lg shadow-primary/20 shrink-0 self-start md:self-auto cursor-pointer"
        >
          <Plus size={18} />
          Create Job Posting
        </button>
      </div>

      {error && !showDrawer && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2.5">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center bg-background">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center p-12 bg-card border border-border rounded-2xl shadow-sm">
          <div className="bg-muted p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 border border-border animate-pulse">
            <Briefcase size={28} className="text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No Job Postings Yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Create a job posting to begin uploading resumes and getting rankings.</p>
          <button
            onClick={() => setShowDrawer(true)}
            className="mt-5 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl cursor-pointer"
          >
            Create Job Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => navigate(`/jobs/${job.id}`)}
              className="bg-card border border-border rounded-2xl p-6 shadow-sm cursor-pointer card-hover flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground font-heading">{job.title}</h3>
                    <p className="text-sm font-semibold text-primary mt-0.5">{job.company}</p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteJob(job.id, e)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-200 shrink-0 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5 font-medium">
                  <Calendar size={13} />
                  Created {new Date(job.created_at).toLocaleDateString()}
                </p>

                <p className="text-sm text-muted-foreground mt-3 line-clamp-3 leading-relaxed">{job.description}</p>
                
                {/* Skill Pills */}
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {job.required_skills.split(',').slice(0, 4).map((skill, i) => (
                    <span key={i} className="text-[11px] font-semibold bg-muted border border-border px-2 py-0.5 rounded-md text-foreground/80">
                      {skill.trim ? skill.trim() : skill}
                    </span>
                  ))}
                  {job.required_skills.split(',').length > 4 && (
                    <span className="text-[11px] font-semibold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md text-primary">
                      +{job.required_skills.split(',').length - 4} more
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Exp: {job.experience_required}+ Yrs Required</span>
                <span className="text-primary hover:text-primary/80 flex items-center gap-0.5 font-bold">
                  Screen Candidates <ChevronRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-out Drawer / Form Modal */}
      {showDrawer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-lg bg-card border-l border-border h-full shadow-2xl p-8 flex flex-col justify-between overflow-y-auto animate-slide-up">
            <div>
              <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-primary animate-pulse" size={20} />
                  <h2 className="text-xl font-bold font-heading text-foreground">Create Job Description</h2>
                </div>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCreateJob} className="space-y-4" id="job-form">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Job Title</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 bg-card border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm placeholder-muted-foreground"
                    placeholder="e.g. Senior Python Developer"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Company Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 bg-card border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm placeholder-muted-foreground"
                    placeholder="e.g. Google"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Min Experience (Years)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      className="w-full px-4 py-2.5 bg-card border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                      value={experienceRequired}
                      onChange={(e) => setExperienceRequired(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Required Skills (Comma separated)</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 bg-card border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm placeholder-muted-foreground"
                    placeholder="e.g. Python, FastAPI, Docker, SQL"
                    value={requiredSkills}
                    onChange={(e) => setRequiredSkills(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Preferred Skills (Comma separated)</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-card border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm placeholder-muted-foreground"
                    placeholder="e.g. Kubernetes, AWS, Redis"
                    value={preferredSkills}
                    onChange={(e) => setPreferredSkills(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Full Job Description</label>
                  <textarea
                    rows="6"
                    required
                    className="w-full px-4 py-2.5 bg-card border border-border text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm placeholder-muted-foreground resize-none leading-relaxed"
                    placeholder="Describe the role responsibilities and requirements..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </form>
            </div>

            <div className="border-t border-border pt-4 flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="flex-1 py-3 bg-muted hover:bg-muted/70 text-foreground/80 font-semibold text-sm rounded-xl transition-all duration-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="job-form"
                disabled={formSubmitLoading}
                className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-xl transition-all duration-200 shadow-lg shadow-primary/20 flex items-center justify-center cursor-pointer"
              >
                {formSubmitLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                ) : (
                  'Create Job'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
