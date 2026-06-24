import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Briefcase, Users, Award, AlertCircle, TrendingUp } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 dark:bg-slate-950/95 border border-slate-200 dark:border-slate-800 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-xl text-xs">
        {label && <p className="font-bold text-foreground mb-1 font-heading">{label}</p>}
        {payload.map((p, idx) => (
          <p key={idx} className="text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.fill || 'hsl(var(--primary))' }} />
            <span className="capitalize">{p.name || 'Count'}:</span>{' '}
            <span className="text-foreground font-bold">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await axios.get('/analytics');
        setData(response.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-3">
        <AlertCircle size={20} />
        <span>{error || 'No dashboard data available.'}</span>
      </div>
    );
  }

  // Color scheme matching our design system
  const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444'];

  const stats = [
    { 
      name: 'Total Job Profiles', 
      value: data.total_jobs, 
      icon: Briefcase, 
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/30 glow-primary' 
    },
    { 
      name: 'Total Resumes Screened', 
      value: data.total_candidates, 
      icon: Users, 
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/30 glow-success' 
    },
    { 
      name: 'Average ATS Score', 
      value: `${data.average_ats_score}%`, 
      icon: Award, 
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/30 shadow-sm' 
    },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">Recruiting Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time candidate metrics, skill distributions, and ATS rankings.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5 card-hover">
              <div className={`p-4 rounded-xl border ${stat.color} shrink-0`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.name}</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Skill distribution bar chart */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-4 font-heading font-semibold">Top Candidate Skills</h3>
          <div className="h-80">
            {data.top_skills.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.top_skills} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.65}/>
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis dataKey="skill_name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Candidates" fill="url(#colorCount)" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No skills database entries found.</div>
            )}
          </div>
        </div>

        {/* ATS distribution area chart */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-foreground mb-4 font-heading font-semibold">ATS Score Spread</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.ats_distribution} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" name="Candidates" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorAts)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hiring Recommendation Pie Chart */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-foreground font-heading font-semibold">Recruitment Funnel Distribution</h3>
              <p className="text-xs text-muted-foreground">Gemini-powered candidate hiring status groupings</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.candidate_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="stage"
                  >
                    {data.candidate_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* List breakdown style representation */}
            <div className="space-y-4">
              {data.candidate_distribution.map((entry, index) => {
                const total = data.total_candidates || 1;
                const percentage = ((entry.count / total) * 100).toFixed(0);
                return (
                  <div key={index} className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-xl card-hover">
                    <div className="flex items-center gap-3">
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      <span className="text-sm font-semibold text-foreground/80">{entry.stage}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-foreground">{entry.count}</span>
                      <span className="text-xs font-semibold text-muted-foreground bg-card border border-border px-2.5 py-0.5 rounded-md">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
