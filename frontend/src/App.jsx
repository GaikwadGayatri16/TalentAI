import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import { ToastProvider } from './components/Toast';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import MyResumes from './pages/MyResumes';
import ResumeAnalysis from './pages/ResumeAnalysis';
import ATSAnalysis from './pages/ATSAnalysis';
import JobMatching from './pages/JobMatching';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import CandidateAnalysis from './pages/CandidateAnalysis';
import AIChatbot from './pages/AIChatbot';
import InterviewPrep from './pages/InterviewPrep';
import ResumeOptimizer from './pages/ResumeOptimizer';
import ProfileSettings from './pages/ProfileSettings';

// Create Auth Context
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Create Theme Context
const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

// Configure Axios Defaults
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Request Interceptor to add JWT
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Main App Layout
const MainLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 relative">
        {children}
      </main>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');
      const name = localStorage.getItem('name');

      if (token && role && name) {
        setUser({ token, role, name });
        try {
          await axios.get('/auth/me');
        } catch (err) {
          console.error("Token verification failed, logging out", err);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const login = (token, role, name) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('name', name);
    setUser({ token, role, name });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    setUser(null);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <AuthContext.Provider value={{ user, login, logout, loading }}>
        <ToastProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected App Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <MainLayout>
                    <Dashboard />
                  </MainLayout>
                </ProtectedRoute>
              } />

              <Route path="/resumes" element={
                <ProtectedRoute>
                  <MainLayout>
                    <MyResumes />
                  </MainLayout>
                </ProtectedRoute>
              } />

              <Route path="/resume-analysis" element={
                <ProtectedRoute>
                  <MainLayout>
                    <ResumeAnalysis />
                  </MainLayout>
                </ProtectedRoute>
              } />

              <Route path="/ats-analysis" element={
                <ProtectedRoute>
                  <MainLayout>
                    <ATSAnalysis />
                  </MainLayout>
                </ProtectedRoute>
              } />

              <Route path="/job-matching" element={
                <ProtectedRoute>
                  <MainLayout>
                    <JobMatching />
                  </MainLayout>
                </ProtectedRoute>
              } />

              <Route path="/jobs" element={
                <ProtectedRoute>
                  <MainLayout>
                    <Jobs />
                  </MainLayout>
                </ProtectedRoute>
              } />

              <Route path="/jobs/:id" element={
                <ProtectedRoute>
                  <MainLayout>
                    <JobDetail />
                  </MainLayout>
                </ProtectedRoute>
              } />

              <Route path="/candidates/:candidateId/analysis/:jobId" element={
                <ProtectedRoute>
                  <MainLayout>
                    <CandidateAnalysis />
                  </MainLayout>
                </ProtectedRoute>
              } />

              <Route path="/chat" element={
                <ProtectedRoute>
                  <MainLayout>
                    <AIChatbot />
                  </MainLayout>
                </ProtectedRoute>
              } />

              <Route path="/career-assistant" element={
                <ProtectedRoute>
                  <MainLayout>
                    <AIChatbot />
                  </MainLayout>
                </ProtectedRoute>
              } />

              <Route path="/interview-prep" element={
                <ProtectedRoute>
                  <MainLayout>
                    <InterviewPrep />
                  </MainLayout>
                </ProtectedRoute>
              } />

              <Route path="/resume-optimizer" element={
                <ProtectedRoute>
                  <MainLayout>
                    <ResumeOptimizer />
                  </MainLayout>
                </ProtectedRoute>
              } />

              <Route path="/profile" element={
                <ProtectedRoute>
                  <MainLayout>
                    <ProfileSettings />
                  </MainLayout>
                </ProtectedRoute>
              } />

              {/* Fallback Catch-All */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </ToastProvider>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}
