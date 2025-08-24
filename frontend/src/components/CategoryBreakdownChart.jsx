import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
ChartJS.register(ArcElement, Tooltip, Legend);

export default function CategoryBreakdownChart() {
  const [categoryChart, setCategoryChart] = useState({ labels: [], data: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExpenses() {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/expenses', {
        headers: { 'Authorization': token ? `Bearer ${token}` : undefined }
      });
      const arr = await res.json();
      // Category breakdown
      const catMap = {};
      arr.forEach(e => {
        if (!e.category) return;
        catMap[e.category] = (catMap[e.category] || 0) + (Number(e.amount) || 0);
      });
      setCategoryChart({ labels: Object.keys(catMap), data: Object.values(catMap) });
      setLoading(false);
    }
    fetchExpenses();
  }, []);

  if (loading || categoryChart.labels.length === 0) {
    return <div className="text-gray-400 text-center">No data</div>;
  }

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 w-full max-w-xs flex flex-col items-center mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
    >
      <h2 className="text-lg font-semibold text-gray-700 mb-2">Category Breakdown</h2>
      <div className="w-full h-64" style={{height: '260px'}}>
        <Doughnut
          data={{
            labels: categoryChart.labels,
            datasets: [
              {
                data: categoryChart.data,
                backgroundColor: [
                  '#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#f87171', '#facc15', '#38bdf8', '#818cf8', '#f472b6', '#fcd34d', '#6ee7b7', '#fca5a5', '#c4b5fd', '#f9a8d4', '#fde68a', '#bbf7d0', '#fda4af', '#ddd6fe', '#fbcfe8', '#fef08a', '#a7f3d0', '#fca5a5', '#c7d2fe', '#f3e8ff', '#fef3c7', '#d1fae5', '#fee2e2', '#e0e7ff', '#fce7f3', '#fef9c3'
                ],
                borderWidth: 1,
              },
            ],
          }}
          options={{
            plugins: {
              legend: {
                display: true,
                position: 'bottom',
                labels: { boxWidth: 16, font: { size: 12 } }
              },
            },
            cutout: '70%',
            responsive: true,
            maintainAspectRatio: false,
          }}
        />
      </div>
    </motion.div>
  );
}
