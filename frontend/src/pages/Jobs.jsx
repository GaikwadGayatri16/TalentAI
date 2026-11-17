import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Briefcase, Calendar, Trash2, Plus, Sparkles, AlertCircle, 
  X, ChevronRight, Search, GitCompare, Users
} from 'lucide-react';
import { useAuth } from '../App';
import { useToast } from '../components/Toast';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
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
  const toast = useToast();
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
      
      setTitle('');
      setCompany('');
      setDescription('');
      setRequiredSkills('');
      setPreferredSkills('');
      setExperienceRequired(0);
      setShowDrawer(false);
      toast.success('Job posting created successfully!');
      fetchJobs();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to create job posting.');
      toast.error('Failed to create job posting.');
    } finally {
      setFormSubmitLoading(false);
    }
  };

  const handleDeleteJob = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this job posting?')) {
      return;
    }
    
    try {
      await axios.delete(`/jobs/${id}`);
      toast.success('Job posting deleted.');
      fetchJobs();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete job posting.');
    }
  };

  const filteredJobs = jobs.filter(j => {
    const q = searchQuery.toLowerCase();
    return (
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      (j.required_skills && j.required_skills.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 relative animate-slide-up bg-background text-foreground max-w-6xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">
            Job Listings & Screening
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse open positions, match your resume against requirements, or screen applicant batches.
          </p>
        </div>
        
        {/* Post Job Button (Always available for recruiters or admins) */}
        <button
          onClick={() => setShowDrawer(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl transition-all shadow-md shadow-primary/20 shrink-0 self-start md:self-auto cursor-pointer"
        >
          <Plus size={16} />
          Post New Job
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground pointer-events-none">
          <Search size={16} />
        </span>
        <input
          type="text"
          placeholder="Search jobs by title, company, or required skill (e.g. Python, React, AWS)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none shadow-sm"
        />
      </div>

      {error && !showDrawer && (
        <div className="p-3.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2.5">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center bg-background">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center p-12 bg-card border border-border rounded-2xl shadow-sm">
          <div className="bg-muted p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 border border-border animate-pulse">
            <Briefcase size={28} className="text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No Matching Jobs Found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery ? 'Try adjusting your search keywords.' : 'Create a job posting to begin screening resumes.'}
          </p>
          <button
            onClick={() => setShowDrawer(true)}
            className="mt-5 px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl cursor-pointer"
          >
            Create Job Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground font-heading">{job.title}</h3>
                    <p className="text-sm font-semibold text-primary mt-0.5">{job.company}</p>
                  </div>
                  {(user?.role === 'recruiter' || user?.role === 'admin') && (
                    <button
                      onClick={(e) => handleDeleteJob(job.id, e)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all shrink-0 cursor-pointer"
                      title="Delete job posting"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5 font-medium">
                  <Calendar size={13} />
                  Posted {new Date(job.created_at).toLocaleDateString()}
                  <span className="mx-1">•</span>
                  Min Exp: {job.experience_required}+ Yrs
                </p>

                <p className="text-xs text-muted-foreground mt-3 line-clamp-3 leading-relaxed">
                  {job.description}
                </p>
                
                {/* Skill Pills */}
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {job.required_skills.split(',').slice(0, 5).map((skill, i) => (
                    <span key={i} className="text-[11px] font-semibold bg-muted border border-border px-2 py-0.5 rounded-md text-foreground/80">
                      {skill.trim ? skill.trim() : skill}
                    </span>
                  ))}
                  {job.required_skills.split(',').length > 5 && (
                    <span className="text-[11px] font-semibold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md text-primary">
                      +{job.required_skills.split(',').length - 5} more
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-2">
                <button
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <Users size={14} className="text-primary" /> Screen Resumes
                </button>

                <button
                  onClick={() => navigate('/job-matching')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <GitCompare size={13} /> Match My Resume <ChevronRight size={13} />
                </button>
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

              <form onSubmit={handleCreateJob} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Job Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Machine Learning Engineer"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TechCorp AI Labs"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Required Skills (Comma separated)</label>
                  <input
                    type="text"
                    required
                    placeholder="Python, PyTorch, LangChain, FastAPI"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                    value={requiredSkills}
                    onChange={(e) => setRequiredSkills(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Preferred Skills (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="Docker, Kubernetes, AWS"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                    value={preferredSkills}
                    onChange={(e) => setPreferredSkills(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Experience Required (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    required
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                    value={experienceRequired}
                    onChange={(e) => setExperienceRequired(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Job Description</label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Describe responsibilities, daily work, and expectations..."
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={formSubmitLoading}
                    className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {formSubmitLoading ? 'Saving Job Posting...' : 'Publish Job Posting'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
