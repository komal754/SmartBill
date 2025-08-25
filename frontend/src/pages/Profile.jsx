
import { UserIcon, EnvelopeIcon, CurrencyRupeeIcon } from '@heroicons/react/24/solid';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', budget: '' });
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [budgetLoading, setBudgetLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not logged in');
      setLoading(false);
      return;
    }
    Promise.all([
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user/budget`, { headers: { 'Authorization': `Bearer ${token}` } })
    ])
      .then(async ([userRes, budgetRes]) => {
        if (!userRes.ok) throw new Error('Failed to fetch user info');
        if (!budgetRes.ok) throw new Error('Failed to fetch budget');
        const userData = await userRes.json();
        const budgetData = await budgetRes.json();
        setUser({ ...userData, budget: budgetData.budget });
        setForm({ username: userData.username, email: userData.email, password: '', confirmPassword: '', budget: budgetData.budget });
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch user info');
        setLoading(false);
      });
  }, []);

  function handleChange(e) {
        const API_URL = import.meta.env.VITE_BACKEND_URL;
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not logged in');
      return;
    }
    // Password confirmation check
    if (form.password && form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      // Update username/email/password
      const body = {};
      if (form.username !== user.username) body.username = form.username;
      if (form.email !== user.email) body.email = form.email;
      if (form.password) body.password = form.password;
      if (Object.keys(body).length > 0) {
  const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/me`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      }
      // Update budget if changed
      if (form.budget !== user.budget) {
        setBudgetLoading(true);
  const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user/budget`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ budget: parseFloat(form.budget) })
        });
        const data = await res.json();
        setBudgetLoading(false);
        if (!res.ok) throw new Error(data.error || 'Failed to update budget');
      }
      setUser({ ...user, username: form.username, email: form.email, budget: form.budget });
      setSuccess('Profile updated successfully!');
      setEditMode(false);
      setForm(f => ({ ...f, password: '', confirmPassword: '' }));
    } catch (err) {
      setError(err.message || 'Update failed');
    } finally {
      setLoading(false);
      setBudgetLoading(false);
    }
  }

  if (loading) return <div className="mt-8 text-gray-600">Loading profile...</div>;
  if (error) return <div className="mt-8 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 py-12 px-2">
      <div className="w-full max-w-2xl bg-white/70 backdrop-blur-lg shadow-2xl rounded-3xl p-12 flex flex-col items-center animate-fade-in relative border border-blue-100">
        {/* Decorative background accent */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-44 h-44 bg-gradient-to-br from-blue-400/30 via-purple-300/20 to-pink-300/20 rounded-full blur-2xl z-0" />
        <div className="relative z-10 flex flex-col items-center w-full">
          {/* Avatar with accent ring */}
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-6xl font-extrabold shadow-2xl border-8 border-white mb-4 ring-4 ring-blue-300/40">
            {user.username?.[0]?.toUpperCase() || <UserIcon className="w-16 h-16" />}
          </div>
          <h2 className="text-4xl font-extrabold mb-2 text-blue-900 tracking-tight drop-shadow-lg">{user.username}</h2>
          <div className="flex items-center gap-2 text-gray-700 mb-1 text-lg">
            <EnvelopeIcon className="w-6 h-6 text-blue-400" />
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700 mb-6 text-lg">
            <CurrencyRupeeIcon className="w-6 h-6 text-green-500" />
            <span className="font-medium">Monthly Budget: <span className="font-bold text-green-700">₹{user.budget}</span></span>
          </div>
          <div className="w-full border-b border-blue-200 my-6" />
          {success && <div className="mb-4 text-green-600 font-semibold">{success}</div>}
          {!editMode ? (
            <button
              className="mt-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:from-blue-700 hover:to-purple-700 transition text-lg"
              onClick={() => setEditMode(true)}
            >
              Edit Profile
            </button>
          ) : (
            <form className="w-full mt-2" onSubmit={handleSave}>
              <div className="mb-6">
                <label className="block mb-1 text-gray-700 font-semibold">Username</label>
                <input
                  type="text"
                  name="username"
                  className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg"
                  value={form.username}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block mb-1 text-gray-700 font-semibold">Email</label>
                <input
                  type="email"
                  name="email"
                  className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block mb-1 text-gray-700 font-semibold">New Password</label>
                <input
                  type="password"
                  name="password"
                  className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current password"
                />
              </div>
              <div className="mb-6">
                <label className="block mb-1 text-gray-700 font-semibold">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter new password"
                />
              </div>
              <div className="mb-8">
                <label className="block mb-1 text-gray-700 font-semibold">Monthly Budget (₹)</label>
                <input
                  type="number"
                  name="budget"
                  className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg"
                  value={form.budget}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              {error && <div className="text-red-600 mb-4 text-center text-lg">{error}</div>}
              <div className="flex gap-6 justify-center">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:from-blue-700 hover:to-purple-700 transition text-lg disabled:opacity-60"
                  disabled={loading || budgetLoading}
                >
                  {loading || budgetLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="bg-gray-200 text-blue-700 px-8 py-3 rounded-xl font-bold shadow hover:bg-gray-300 transition text-lg"
                  onClick={() => { setEditMode(false); setForm({ ...form, username: user.username, email: user.email, budget: user.budget, password: '', confirmPassword: '' }); setError(''); setSuccess(''); }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
