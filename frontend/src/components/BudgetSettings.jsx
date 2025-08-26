import { useState, useEffect } from 'react';
import { FaPencilAlt } from 'react-icons/fa';


export default function BudgetSettings({ budget, setBudget }) {
  const API_URL = import.meta.env.VITE_BACKEND_URL;
  const [input, setInput] = useState(budget);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch budget from backend on mount
  useEffect(() => {
    async function fetchBudget() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/api/user/budget`, {
  // const res = await fetch(`/api/user/budget`, {

          headers: { 'Authorization': token ? `Bearer ${token}` : undefined }
        });
        if (!res.ok) throw new Error('Failed to fetch budget');
        const data = await res.json();
        setBudget(data.budget);
        setInput(data.budget);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchBudget();
    // eslint-disable-next-line
  }, []);

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/api/user/budget`, {
  // const res = await fetch(`/api/user/budget`, {

        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : undefined
        },
        body: JSON.stringify({ budget: Number(input) || 0 })
      });
      if (!res.ok) throw new Error('Failed to update budget');
      setBudget(Number(input) || 0);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full flex flex-col items-center mb-6">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-700">Monthly Budget:</span>
        {editing ? (
          <>
            <input
              type="number"
              className="border rounded px-2 py-1 w-24 text-right"
              value={input}
              onChange={e => setInput(e.target.value)}
              min={0}
              disabled={loading}
              autoFocus
            />
            <button className="ml-2 px-2 py-1 bg-blue-500 text-white rounded" onClick={handleSave} disabled={loading}>Save</button>
            <button className="ml-1 px-2 py-1 bg-gray-200 rounded" onClick={() => setEditing(false)} disabled={loading}>Cancel</button>
          </>
        ) : (
          <>
            <span className="text-blue-700">₹{budget}</span>
            <button
              className="ml-1 p-1 text-blue-500 hover:text-blue-700 focus:outline-none"
              onClick={() => setEditing(true)}
              disabled={loading}
              title="Edit budget"
              style={{ background: 'none', border: 'none' }}
            >
              <FaPencilAlt />
            </button>
          </>
        )}
      </div>
      {loading && <div className="text-xs text-gray-400 mt-1">Loading...</div>}
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
    </div>
  );
}
