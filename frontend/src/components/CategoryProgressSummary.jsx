import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function CategoryProgressSummary() {
  const API_URL = import.meta.env.VITE_BACKEND_URL;
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExpenses() {
      const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/api/expenses`, {
  // const res = await fetch(`/api/expenses`, {

        headers: { 'Authorization': token ? `Bearer ${token}` : undefined }
      });
      const arr = await res.json();
      // Category breakdown
      const catMap = {};
      arr.forEach(e => {
        if (!e.category) return;
        catMap[e.category] = (catMap[e.category] || 0) + (Number(e.amount) || 0);
      });
      // Sort by amount descending, take top 5
      const sorted = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, amount]) => ({ category, amount }));
      const total = sorted.reduce((sum, c) => sum + c.amount, 0) || 1;
      setCategoryData(sorted.map(c => ({ ...c, percent: Math.round((c.amount / total) * 100) })));
      setLoading(false);
    }
    fetchExpenses();
  }, []);

  if (loading || categoryData.length === 0) {
    return <div className="text-gray-400 text-center">No data</div>;
  }

  // Fun gradients and emojis/icons for categories
  // Simple blue gradient for all bars
  const gradient = 'from-blue-500 to-blue-300';
  const emojis = ['🏆', '💸', '🍔', '🚗', '🛒', '🎉', '🏠', '📚', '🧾', '💡'];



  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 w-full max-w-md flex flex-col items-center mx-auto">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Top Categories</h2>
      <div className="w-full space-y-4">
        {categoryData.map((cat) => (
          <div key={cat.category} className="w-full">
            <div className="flex justify-between mb-1">
              <span className="font-medium text-gray-700">{cat.category}</span>
              <span className="text-sm text-gray-500">₹{cat.amount} ({cat.percent}%)</span>
            </div>
            <motion.div
              className={`h-3 rounded-full bg-gradient-to-r ${gradient}`}
              initial={{ width: 0 }}
              animate={{ width: `${cat.percent}%` }}
              transition={{ duration: 1 }}
              style={{ maxWidth: '100%' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
