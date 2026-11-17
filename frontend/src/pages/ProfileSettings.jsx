import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Mail, Lock, Shield, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../App';
import { useToast } from '../components/Toast';

export default function ProfileSettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const toast = useToast();

  useEffect(() => {
    const fetchMe = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/auth/me');
        setProfile(res.data);
        setName(res.data.name);
        setEmail(res.data.email);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name,
        email: email
      };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      const res = await axios.put('/auth/profile', payload);
      setProfile(res.data);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[75vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-up max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-heading font-extrabold text-foreground tracking-tight">
          Profile & Account Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your personal details, credentials, and role configuration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* User Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 text-primary font-bold text-2xl mx-auto flex items-center justify-center mb-4 uppercase">
            {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'TA'}
          </div>
          <h3 className="text-base font-bold text-foreground font-heading">{profile?.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{profile?.email}</p>

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-center gap-2">
            <span className="px-3 py-1 text-xs font-bold uppercase rounded-full bg-primary/10 text-primary border border-primary/20">
              Role: {profile?.role || 'candidate'}
            </span>
          </div>
        </div>

        {/* Update Form */}
        <div className="md:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold font-heading text-foreground border-b border-border pb-3 uppercase tracking-wider text-muted-foreground">
            Edit Information
          </h3>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <span className="block text-xs font-bold text-foreground font-heading">
                Change Password (Leave blank to keep existing)
              </span>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md shadow-primary/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
