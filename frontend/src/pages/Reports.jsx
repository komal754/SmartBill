import { useEffect, useState } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement
} from 'chart.js';
import { exportToCSV } from '../utils/exportCSV';
import { exportToPDF } from '../utils/exportPDF';
import toast from 'react-hot-toast';
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

export default function Reports() {
  // --- State declarations (must be at the top) ---
  const [expensesData, setExpensesData] = useState([]);
  const [paymentsData, setPaymentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: 'all', category: 'all', start: '', end: '' });
  const [stats, setStats] = useState({});

  // --- Savings, Trends, and Tips logic (must be after state) ---
  const budget = 10000;
  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 1 ? 12 : thisMonth - 1;
  const lastMonthYear = thisMonth === 1 ? thisYear - 1 : thisYear;

  let thisMonthExpenses = [];
  let lastMonthExpenses = [];
  let thisMonthTotal = 0;
  let lastMonthTotal = 0;
  let savings = 0;
  let trendDiff = 0;
  let trendText = '';
  let randomTip = '';
  if (Array.isArray(expensesData)) {
    thisMonthExpenses = expensesData.filter(e => {
      if (!e.date) return false;
      const [y, m] = e.date.split('-');
      return Number(y) === thisYear && Number(m) === thisMonth;
    });
    lastMonthExpenses = expensesData.filter(e => {
      if (!e.date) return false;
      const [y, m] = e.date.split('-');
      return Number(y) === lastMonthYear && Number(m) === lastMonth;
    });
    thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    savings = budget - thisMonthTotal;
    trendDiff = thisMonthTotal - lastMonthTotal;
    trendText = trendDiff > 0 ? `increased by ₹${trendDiff}` : (trendDiff < 0 ? `decreased by ₹${Math.abs(trendDiff)}` : 'remained the same');
    const tips = [
      "Track your expenses regularly to avoid overspending.",
      "Set a monthly budget and try to save at least 20% of your income.",
      "Review your subscriptions and cancel those you don't use.",
      "Plan for emergencies by building an emergency fund.",
      "Use digital tools to automate bill payments and savings."
    ];
    randomTip = tips[Math.floor(Math.random() * tips.length)];
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const token = localStorage.getItem('token');
  const API_URL = import.meta.env.VITE_BACKEND_URL;
      const [expRes, payRes] = await Promise.all([
        fetch(`${API_URL}/api/expenses`, { headers: { 'Authorization': token ? `Bearer ${token}` : undefined } }),
        fetch(`${API_URL}/api/payments`, { headers: { 'Authorization': token ? `Bearer ${token}` : undefined } })
      ]);
      const expArr = await expRes.json();
      const payArr = await payRes.json();
      setExpensesData(expArr);
      setPaymentsData(payArr);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Filtering helpers
  const filterData = (arr) => {
    let filtered = arr;
    if (filters.category !== 'all') filtered = filtered.filter(e => e.category === filters.category);
    if (filters.start) filtered = filtered.filter(e => (e.date || e.payment_date) >= filters.start);
    if (filters.end) filtered = filtered.filter(e => (e.date || e.payment_date) <= filters.end);
    return filtered;
  };

  // Category breakdown for expenses/payments
  const getCategoryData = (arr) => {
    const catMap = {};
    arr.forEach(e => {
      const cat = e.category || 'Other';
      catMap[cat] = (catMap[cat] || 0) + (Number(e.amount) || 0);
    });
    return {
      labels: Object.keys(catMap),
      data: Object.values(catMap),
    };
  };

  // Monthly trend data
  const getMonthLabel = (dateStr) => {
    const [y, m] = (dateStr || '').split('-');
    return y && m ? `${y}-${m}` : '';
  };
  const getMonthlyTrend = (arr) => {
    const monthMap = {};
    arr.forEach(e => {
      const d = e.date || e.payment_date;
      if (!d) return;
      const month = getMonthLabel(d);
      if (!month) return;
      monthMap[month] = (monthMap[month] || 0) + (Number(e.amount) || 0);
    });
    const months = Object.keys(monthMap).sort();
    return {
      labels: months,
      data: months.map(m => monthMap[m]),
    };
  };

  // Statistics
  useEffect(() => {
    if (!expensesData.length && !paymentsData.length) return;
    const expTotal = expensesData.reduce((a, b) => a + (Number(b.amount) || 0), 0);
    const payTotal = paymentsData.reduce((a, b) => a + (Number(b.amount) || 0), 0);
    const expAvg = expensesData.length ? expTotal / expensesData.length : 0;
    const payAvg = paymentsData.length ? payTotal / paymentsData.length : 0;
    const expMax = Math.max(...expensesData.map(e => Number(e.amount) || 0), 0);
    const payMax = Math.max(...paymentsData.map(e => Number(e.amount) || 0), 0);
    const expMin = Math.min(...expensesData.map(e => Number(e.amount) || 0).filter(Boolean), 0);
    const payMin = Math.min(...paymentsData.map(e => Number(e.amount) || 0).filter(Boolean), 0);
    setStats({ expTotal, payTotal, expAvg, payAvg, expMax, payMax, expMin, payMin });
  }, [expensesData, paymentsData]);

  // Chart data
  const expCat = getCategoryData(filterData(expensesData));
  const payCat = getCategoryData(filterData(paymentsData));
  const expTrend = getMonthlyTrend(filterData(expensesData));
  const payTrend = getMonthlyTrend(filterData(paymentsData));

  // All categories for filter dropdown
  const allCategories = Array.from(new Set([...expensesData, ...paymentsData].map(e => e.category).filter(Boolean)));

  return (
    <div className="w-full max-w-5xl mx-auto mt-10 px-2">
      <h1 className="text-3xl font-bold mb-6 text-blue-700 text-center">Reports & Analytics</h1>
      {/* Savings, Trends, and Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
          <div className="text-xs text-yellow-700 mb-1">Estimated Savings (This Month)</div>
          <div className="text-xl font-bold text-yellow-900">₹{savings.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">(Budget: ₹{budget.toLocaleString()}, Expenses: ₹{thisMonthTotal.toLocaleString()})</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
          <div className="text-xs text-blue-700 mb-1">Spending Trend</div>
          <div className="text-xl font-bold text-blue-900">Your spending has {trendText} vs last month.</div>
          <div className="text-xs text-gray-500 mt-1">(This month: ₹{thisMonthTotal.toLocaleString()}, Last month: ₹{lastMonthTotal.toLocaleString()})</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
          <div className="text-xs text-green-700 mb-1">Financial Health Tip</div>
          <div className="text-base font-medium text-green-900">{randomTip}</div>
        </div>
      </div>
      {/* Export Buttons */}
      <div className="flex flex-wrap gap-4 mb-4 justify-center items-center">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => {
            const filtered = filterData(paymentsData);
            if (!filtered.length) {
              toast.error('No payments to export!');
              return;
            }
            // Only export relevant fields
            const exportData = filtered.map(({ id, payment_date, amount, category, description }) => ({ id, payment_date, amount, category, description }));
            exportToCSV(exportData, 'payments_report.csv');
          }}
        >
          Export Payments as CSV
        </button>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          onClick={() => {
            const filtered = filterData(paymentsData);
            if (!filtered.length) {
              toast.error('No payments to export!');
              return;
            }
            const exportData = filtered.map(({ id, payment_date, amount, category, description }) => ({ id, payment_date, amount, category, description }));
            exportToPDF(exportData, 'payments_report.pdf');
          }}
        >
          Export Payments as PDF
        </button>
      </div>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8 justify-center items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Category</label>
          <select className="border rounded px-2 py-1" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
            <option value="all">All</option>
            {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Start Date</label>
          <input type="date" className="border rounded px-2 py-1" value={filters.start} onChange={e => setFilters(f => ({ ...f, start: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">End Date</label>
          <input type="date" className="border rounded px-2 py-1" value={filters.end} onChange={e => setFilters(f => ({ ...f, end: e.target.value }))} />
        </div>
      </div>
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-xs text-blue-700 mb-1">Total Expenses</div>
          <div className="text-xl font-bold text-blue-900">₹{stats.expTotal?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-xs text-green-700 mb-1">Total Payments</div>
          <div className="text-xl font-bold text-green-900">₹{stats.payTotal?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-xs text-blue-700 mb-1">Avg Expense</div>
          <div className="text-xl font-bold text-blue-900">₹{stats.expAvg?.toFixed(0) || 0}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-xs text-green-700 mb-1">Avg Payment</div>
          <div className="text-xl font-bold text-green-900">₹{stats.payAvg?.toFixed(0) || 0}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-xs text-blue-700 mb-1">Max Expense</div>
          <div className="text-xl font-bold text-blue-900">₹{stats.expMax?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-xs text-green-700 mb-1">Max Payment</div>
          <div className="text-xl font-bold text-green-900">₹{stats.payMax?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-xs text-blue-700 mb-1">Min Expense</div>
          <div className="text-xl font-bold text-blue-900">₹{stats.expMin?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-xs text-green-700 mb-1">Min Payment</div>
          <div className="text-xl font-bold text-green-900">₹{stats.payMin?.toLocaleString() || 0}</div>
        </div>
      </div>
      {/* Charts */}
      <div className="flex flex-col md:flex-row gap-8 mb-10 justify-center items-start">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 w-full max-w-xs flex flex-col items-center">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Expenses by Category</h2>
          <div className="w-full h-64" style={{height: '260px'}}>
            <Doughnut
              data={{ labels: expCat.labels, datasets: [{ data: expCat.data, backgroundColor: [ '#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#f87171', '#facc15', '#38bdf8', '#818cf8', '#f472b6', '#fcd34d', '#6ee7b7', '#fca5a5', '#c4b5fd', '#f9a8d4', '#fde68a', '#bbf7d0', '#fda4af', '#ddd6fe', '#fbcfe8', '#fef08a', '#a7f3d0', '#fca5a5', '#c7d2fe', '#f3e8ff', '#fef3c7', '#d1fae5', '#fee2e2', '#e0e7ff', '#fce7f3', '#fef9c3' ], borderWidth: 1 }] }}
              options={{ plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 16, font: { size: 12 } } } }, cutout: '70%', responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 w-full max-w-xs flex flex-col items-center">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Payments by Category</h2>
          <div className="w-full h-64" style={{height: '260px'}}>
            <Doughnut
              data={{ labels: payCat.labels, datasets: [{ data: payCat.data, backgroundColor: [ '#34d399', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa', '#f87171', '#facc15', '#38bdf8', '#818cf8', '#f472b6', '#fcd34d', '#6ee7b7', '#fca5a5', '#c4b5fd', '#f9a8d4', '#fde68a', '#bbf7d0', '#fda4af', '#ddd6fe', '#fbcfe8', '#fef08a', '#a7f3d0', '#fca5a5', '#c7d2fe', '#f3e8ff', '#fef3c7', '#d1fae5', '#fee2e2', '#e0e7ff', '#fce7f3', '#fef9c3' ], borderWidth: 1 }] }}
              options={{ plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 16, font: { size: 12 } } } }, cutout: '70%', responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </div>
      </div>
      {/* Trend/Comparison Chart */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 w-full max-w-2xl mx-auto mb-10">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Expenses vs Payments Over Time</h2>
        <div className="w-full h-72" style={{height: '320px'}}>
          <Line
            data={{
              labels: Array.from(new Set([...expTrend.labels, ...payTrend.labels])).sort(),
              datasets: [
                { label: 'Expenses', data: expTrend.data, borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.2)', tension: 0.4, fill: true },
                { label: 'Payments', data: payTrend.data, borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.2)', tension: 0.4, fill: true },
              ]
            }}
            options={{ responsive: true, plugins: { legend: { position: 'top' } }, maintainAspectRatio: false }}
          />
        </div>
      </div>
    </div>
  );
}
