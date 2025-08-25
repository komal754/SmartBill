// Advanced animated modal with icon and color cues
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useRefresh } from '../context/RefreshContext';
import { Pie } from 'react-chartjs-2';
import { useCustomCategories } from '../hooks/useCustomCategories';
function ConfirmModal({ open, onConfirm, onCancel, message }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 min-w-[340px] max-w-[90vw] animate-modal-pop relative">
        <div className="flex flex-col items-center">
          <div className="bg-red-100 rounded-full p-4 mb-4 animate-pulse">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
          </div>
          <div className="mb-4 text-lg text-gray-800 font-semibold text-center">{message}</div>
          <div className="flex justify-center gap-4 w-full mt-2">
            <button onClick={onCancel} className="px-5 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-medium transition">Cancel</button>
            <button onClick={onConfirm} className="px-5 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold shadow transition">Delete</button>
          </div>
        </div>
        <style>{`
          .animate-fade-in { animation: fadeIn 0.2s; }
          .animate-modal-pop { animation: modalPop 0.25s cubic-bezier(.4,2,.6,1); }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes modalPop { 0% { transform: scale(0.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        `}</style>
      </div>
    </div>
  );
// ...existing code...



// Razorpay script loader
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
function Expenses() {
  // ...existing state...
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  function handleSort(field) {
    setSortBy(field);
    setSortDir(d => (sortBy === field ? (d === 'asc' ? 'desc' : 'asc') : 'asc'));
  }
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ date: '', category: '', amount: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState('');
  const [descTypingTimeout, setDescTypingTimeout] = useState(null);
  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  // Search/filter state
  const [search, setSearch] = useState('');
  // Summary state
  const [summary, setSummary] = useState({ total: 0, topCategory: '', topCategoryAmount: 0 });
  const { refresh, refreshKey } = useRefresh();
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  // AI suggestion state
  const [suggestionConfidence, setSuggestionConfidence] = useState();
  function handleAISuggestionFeedback(type) {
    toast.success(type === 'upvote' ? 'Thanks for your feedback!' : 'Sorry for the bad suggestion.');
    // Optionally send feedback to backend here
  }

  // Custom categories logic
  const defaultCategories = [
    'Food', 'Transport', 'Groceries', 'Entertainment', 'Utilities', 'Shopping', 'Health', 'Education', 'Travel', 'Bills', 'Subscriptions', 'Gifts', 'Insurance', 'Rent', 'Salary', 'Investment', 'Charity', 'Pets', 'Kids', 'Personal Care', 'Beauty', 'Clothing', 'Recharge', 'Petrol', 'Home Items', 'Stationary', 'Phone Accessory', 'Laptop and Computer Accessory', 'Other'
  ];
  const [categories, addCategory] = useCustomCategories('expenseCategories', defaultCategories);
  const [newCategory, setNewCategory] = useState('');
  function handleAddCategory(e) {
    e.preventDefault();
    const cat = newCategory.trim();
    if (!cat) return;
    if (categories.includes(cat)) {
      toast.error('Category already exists!');
      return;
    }
    addCategory(cat);
    toast.success('Category added!');
    setNewCategory('');
    // Optionally auto-select
    setForm(f => ({ ...f, category: cat }));
  }

  const API_URL = import.meta.env.VITE_BACKEND_URL;
  const FASTAPI_URL = import.meta.env.VITE_API_URL;
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/expenses`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : undefined
      }
    })
      .then(res => {
        if (res.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          return Promise.reject('Unauthorized');
        }
        if (!res.ok) throw new Error('Failed to fetch expenses');
        return res.json();
      })
      .then(arr => {
        setExpenses(Array.isArray(arr) ? arr : []);
        // Calculate summary for current month
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const thisMonth = arr.filter(e => {
          if (!e.date) return false;
          const [y, m] = e.date.split('-');
          return Number(y) === year && Number(m) === month;
        });
        const total = thisMonth.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const catMap = {};
        thisMonth.forEach(e => {
          if (!e.category) return;
          catMap[e.category] = (catMap[e.category] || 0) + (Number(e.amount) || 0);
        });
        let topCategory = '';
        let topCategoryAmount = 0;
        Object.entries(catMap).forEach(([cat, amt]) => {
          if (amt > topCategoryAmount) {
            topCategory = cat;
            topCategoryAmount = amt;
          }
        });
        setSummary({ total, topCategory, topCategoryAmount });
        setLoading(false);
      })
      .catch(err => {
        toast.error(err.message);
        setLoading(false);
      });
  }, [refreshKey]);


  // Handle change for all fields, but add AI suggestion for description
  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    if (name === 'description') {
      if (descTypingTimeout) clearTimeout(descTypingTimeout);
      if (value.length > 2) {
        const timeout = setTimeout(async () => {
          try {
            const res = await fetch(`${FASTAPI_URL}/api/ai/categorize`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ description: value })
            });
            if (res.ok) {
              const data = await res.json();
              setSuggestedCategory(data.category);
              setSuggestionConfidence(data.confidence);
              setForm(prev => prev.category ? prev : { ...prev, category: data.category });
            } else {
              setSuggestedCategory('');
            }
          } catch {
            setSuggestedCategory('');
          }
        }, 400);
        setDescTypingTimeout(timeout);
      } else {
        setSuggestedCategory('');
      }
    }
  }

    e.preventDefault();
    if (!form.date || !form.category || !form.amount) return;
    setSubmitting(true);
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : undefined
      },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to add expense');
        return res.json();
      })
      .then(newExpense => {
        setExpenses(prev => [...prev, newExpense]);
        setForm({ date: '', category: '', amount: '', description: '' });
        toast.success('Expense added successfully!');
      })
      .catch(err => toast.error(err.message))
      .finally(() => setSubmitting(false));
  }

  // Clear error/success after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
  // No-op: handled by toast
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Edit and Delete handlers (only one of each, before return)
  function handleDelete(id) {
    setDeleteId(id);
    setShowDeleteModal(true);
  }

  function confirmDelete() {
    if (!deleteId) return;
    const token = localStorage.getItem('token');
  fetch(`${API_URL}/api/expenses/${deleteId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : undefined
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete expense');
        setExpenses(prev => prev.filter(e => e.id !== deleteId));
        setShowDeleteModal(false);
        setDeleteId(null);
      })
      .catch(err => toast.error(err.message));
  }

  function startEdit(exp) {
    setEditingId(exp.id);
    setEditDate(exp.date);
    setEditCategory(exp.category || '');
    setEditAmount(exp.amount);
    setEditDescription(exp.description || '');
  }

  function handleEditSave(id) {
    const token = localStorage.getItem('token');
    // Robust validation
    if (!editDate || !editCategory || !editAmount || isNaN(editAmount)) {
  toast.error('All fields are required and amount must be a number.');
      return;
    }
    // Extra: prevent whitespace-only or empty category/description
    if (editCategory.trim() === '' || editDate.trim() === '') {
  toast.error('Date and category cannot be empty.');
      return;
    }
    setEditSaving(true);
    // Convert date to ISO format if needed
    let isoDate = editDate;
    if (/^\d{4}-\d{2}-\d{2}$/.test(editDate)) {
      isoDate = editDate + 'T00:00:00Z';
    }
    const body = {
      date: isoDate,
      category: editCategory,
      amount: parseFloat(editAmount),
      description: editDescription
    };
  fetch(`${API_URL}/api/expenses/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : undefined
      },
      body: JSON.stringify(body)
    })
      .then(async res => {
        if (!res.ok) {
          // Try to log backend error for debugging
          let msg = 'Failed to update expense';
          try {
            const errData = await res.json();
            msg += errData.error ? ': ' + errData.error : '';
          } catch {}
          // Also log request body for developer
          // eslint-disable-next-line no-console
          console.error('PUT /api/expenses/', id, body);
          throw new Error(msg);
        }
        return res.json();
      })
      .then(newExp => {
        setExpenses(prev => prev.map(e => e.id === id ? newExp : e));
        setEditingId(null);
        setEditSaving(false);
        toast.success('Expense updated successfully!');
      })
  .catch(err => { toast.error(err.message); setEditSaving(false); });
  }

  function handleEditCancel() {
    setEditingId(null);
  }

  // Razorpay payment for a specific expense
  async function handlePayExpense(exp) {
    const token = localStorage.getItem('token');
    await loadRazorpayScript();

    // Create order on backend
  const res = await fetch(`${API_URL}/api/razorpay/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : undefined
      },
      body: JSON.stringify({ amount: parseInt(exp.amount) * 100, currency: 'INR' }) // amount in paise
    });
    if (!res.ok) {
  toast.error('Failed to create order');
      return;
    }
    const order = await res.json();

    // Open Razorpay Checkout
    const options = {
      key: 'rzp_test_R5ZEYHFFHdm7dx', // Your Razorpay test key
      amount: order.amount,
      currency: order.currency,
      order_id: order.id,
      name: 'SmartBill',
      description: exp.description || exp.category,
      handler: function (response) {
  toast.success('Payment successful! Payment ID: ' + response.razorpay_payment_id);
        // Record payment in backend
  fetch(`${API_URL}/api/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : undefined
          },
          body: JSON.stringify({
            payment_date: new Date().toISOString().slice(0, 10),
            amount: exp.amount,
            expense_id: exp.id
          })
        })
          .then(res => {
            if (!res.ok) throw new Error('Failed to record payment');
            return res.json();
          })
          .then(() => {
            setExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, paid: true } : e));
            toast.success('Payment recorded!');
          })
          .catch(err => toast.error('Payment succeeded but failed to record: ' + err.message));
      },
      prefill: {
        email: '',
      },
      theme: { color: '#3399cc' }
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  }

  // Manual mark as paid
  function handleMarkAsPaid(exp) {
    if (!window.confirm('Mark this expense as paid (manual/external payment)?')) return;
    const token = localStorage.getItem('token');
  fetch(`${API_URL}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : undefined
      },
      body: JSON.stringify({
  payment_date: new Date().toISOString().slice(0, 10),
  amount: exp.amount,
  expense_id: exp.id
      })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to record manual payment');
        return res.json();
      })
      .then(() => {
        setExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, paid: true } : e));
  toast.success('Marked as paid!');
      })
  .catch(err => toast.error(err.message));
  }

  // Personalized Budgeting Advice & Anomaly Detection
  const [budgetAdvice, setBudgetAdvice] = useState("");
  const [anomalyAlert, setAnomalyAlert] = useState("");

  // Track which anomalies have already been notified to avoid duplicate toasts
  const anomalyNotifiedRef = React.useRef(new Set());

  useEffect(() => {
    if (!expenses || expenses.length === 0) return;
    // Analyze spending by category for this and previous month
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const thisMonth = expenses.filter(e => {
      if (!e.date) return false;
      const [y, m] = e.date.split('-');
      return Number(y) === year && Number(m) === month;
    });
    const lastMonth = expenses.filter(e => {
      if (!e.date) return false;
      const [y, m] = e.date.split('-');
      return Number(y) === prevYear && Number(m) === prevMonth;
    });
    // Category breakdowns
    const catMap = {}, lastCatMap = {};
    thisMonth.forEach(e => { if (!e.category) return; catMap[e.category] = (catMap[e.category] || 0) + (Number(e.amount) || 0); });
    lastMonth.forEach(e => { if (!e.category) return; lastCatMap[e.category] = (lastCatMap[e.category] || 0) + (Number(e.amount) || 0); });
    // Find top category
    let topCat = '', topAmt = 0;
    Object.entries(catMap).forEach(([cat, amt]) => { if (amt > topAmt) { topCat = cat; topAmt = amt; } });
    // Compare to previous month
    let advice = "";
    if (topCat && topAmt > 0) {
      const lastAmt = lastCatMap[topCat] || 0;
      if (topAmt > lastAmt) {
        advice = `You’re spending more on ${topCat} this month (₹${topAmt.toLocaleString()}) vs last month (₹${lastAmt.toLocaleString()}). Consider reviewing your expenses in this category.`;
      } else if (topAmt < lastAmt && lastAmt > 0) {
        advice = `Good job! You reduced your ${topCat} spending this month (₹${topAmt.toLocaleString()}) vs last month (₹${lastAmt.toLocaleString()}).`;
      } else {
        advice = `Your top category this month is ${topCat} (₹${topAmt.toLocaleString()}).`;
      }
    }
    setBudgetAdvice(advice);
    // Anomaly detection: at least 5 expenses, use 3×std and median
    const amounts = thisMonth.map(e => Number(e.amount) || 0);
    if (amounts.length >= 5) {
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const std = Math.sqrt(amounts.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / amounts.length);
      const sorted = [...amounts].sort((a, b) => a - b);
      const median = sorted.length % 2 === 0 ? (sorted[sorted.length/2-1] + sorted[sorted.length/2])/2 : sorted[Math.floor(sorted.length/2)];
  // Flag any transaction > avg + 3*std or > median*2
  const spike = thisMonth.find(e => Number(e.amount) > avg + 3 * std || Number(e.amount) > median * 2);
      // Also flag drops: if this month total < last month by 30%+
      const thisTotal = amounts.reduce((a, b) => a + b, 0);
      const lastTotal = lastMonth.map(e => Number(e.amount) || 0).reduce((a, b) => a + b, 0);
      let anomaly = "";
      if (spike) {
        const anomalyKey = `${spike.amount}|${spike.date}|${spike.category}`;
        anomaly = `Unusual transaction detected: ₹${spike.amount} on ${spike.date} (${spike.category}). This is much higher than your typical spending (avg: ₹${Math.round(avg)}, median: ₹${Math.round(median)}, std: ₹${Math.round(std)}).`;
        if (!anomalyNotifiedRef.current.has(anomalyKey)) {
          toast.error(`Unusual transaction: ₹${spike.amount} (${spike.category})`);
          anomalyNotifiedRef.current.add(anomalyKey);
        }
      } else if (lastTotal > 0 && thisTotal < lastTotal * 0.7) {
        anomalyNotifiedRef.current.clear(); // Reset anomaly notifications for new month/normal state
        anomaly = `Notice: Your total spending this month (₹${thisTotal.toLocaleString()}) is much lower than last month (₹${lastTotal.toLocaleString()}). Great job controlling expenses!`;
        toast.success('Spending drop detected: Good job!');
      } else {
        anomaly = "";
      }
      setAnomalyAlert(anomaly);
    } else {
      setAnomalyAlert("");
    }
  }, [expenses]);

  return (
    <>
      <ConfirmModal
        open={showDeleteModal}
        onConfirm={confirmDelete}
        onCancel={() => { setShowDeleteModal(false); setDeleteId(null); }}
        message="Are you sure you want to delete this expense? This action cannot be undone."
      />
      <div className="w-full mt-10 px-0">
        <h1 className="text-3xl font-bold mb-6 text-blue-700 text-center" aria-label="Expenses Page Heading">Expenses</h1>
        {/* Modern summary card */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 justify-center" role="region" aria-label="Summary Cards">
          <div className="flex-1 bg-gradient-to-br from-blue-200/60 to-blue-50 rounded-xl shadow p-4 flex flex-col items-start border border-blue-300 min-w-[180px] max-w-xs relative overflow-hidden">
            <div className="absolute right-2 top-2 opacity-20 text-4xl select-none pointer-events-none">💸</div>
            <span className="text-sm text-blue-700 font-semibold mb-1 flex items-center gap-1">
              <svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4 text-blue-500' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 0V4m0 16v-4m8-4h-4m-8 0H4' /></svg>
              Total Spent (This Month)
            </span>
            <span className="text-2xl md:text-3xl font-extrabold text-blue-800 mb-1 tracking-tight">₹{summary.total.toLocaleString()}</span>
          </div>
          <div className="flex-1 bg-gradient-to-br from-green-200/60 to-green-50 rounded-xl shadow p-4 flex flex-col items-start border border-green-300 min-w-[180px] max-w-xs relative overflow-hidden">
            <div className="absolute right-2 top-2 opacity-20 text-4xl select-none pointer-events-none">🏆</div>
            <span className="text-sm text-green-700 font-semibold mb-1 flex items-center gap-1">
              <svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4 text-green-500' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 21h8M12 17v4m-6-4V7a2 2 0 012-2h8a2 2 0 012 2v10' /></svg>
              Top Category
            </span>
            <span className="text-lg md:text-xl font-bold text-green-800 mb-1 tracking-tight">{summary.topCategory || '—'}</span>
            {summary.topCategory && (
              <span className="text-base text-green-700 font-semibold">₹{summary.topCategoryAmount.toLocaleString()}</span>
            )}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="mb-8 grid grid-cols-1 md:grid-cols-5 gap-6 items-end bg-white shadow rounded-lg p-6" aria-label="Add Expense Form">
          <div>
            <label className="block text-sm text-gray-600">Date</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} className="border rounded px-2 py-1 w-full" required />
          </div>
          <div>
            <label className="block text-sm text-gray-600" htmlFor="category-select">Category</label>
            <select id="category-select" name="category" value={form.category} onChange={handleChange} className="border rounded px-2 py-1 w-full focus:ring-2 focus:ring-blue-500" required aria-label="Category">
              <option value="">Select</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {suggestedCategory && (
              <div className="text-xs text-gray-700 mt-1 flex items-center gap-2" aria-live="polite">
                <span>Suggested: <span className="font-semibold text-blue-800">{suggestedCategory}</span></span>
                {suggestionConfidence !== undefined && (
                  <span className="ml-2 text-green-700" aria-label={`Confidence score: ${Math.round(suggestionConfidence * 100)}%`}>
                    ({Math.round(suggestionConfidence * 100)}% confidence)
                  </span>
                )}
                <button type="button" className="ml-2 underline text-blue-700 focus:outline focus:ring-2 focus:ring-blue-500" onClick={() => setForm(f => ({ ...f, category: suggestedCategory }))} aria-label="Apply suggested category">Apply</button>
                <button type="button" className="ml-2 underline text-gray-700 focus:outline focus:ring-2 focus:ring-gray-500" onClick={() => handleAISuggestionFeedback('downvote')} aria-label="Dislike suggestion" title="Dislike">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10 14l2-2 2 2m-2-2v6" /></svg>
                </button>
                <button type="button" className="ml-2 underline text-gray-700 focus:outline focus:ring-2 focus:ring-gray-500" onClick={() => handleAISuggestionFeedback('upvote')} aria-label="Like suggestion" title="Like">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 10l-2 2-2-2m2 2V6" /></svg>
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-600">Add Category</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="border rounded px-2 py-1 w-full"
                placeholder="New category"
              />
              <button type="button" onClick={handleAddCategory} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Add</button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600">Amount</label>
            <input type="number" name="amount" value={form.amount} onChange={handleChange} className="border rounded px-2 py-1 w-full" placeholder="e.g. 100" required />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Description</label>
            <input type="text" name="description" value={form.description} onChange={handleChange} className="border rounded px-2 py-1 w-full" placeholder="Optional" />
          </div>
          <button type="submit" disabled={submitting} className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 focus:outline focus:ring-2 focus:ring-blue-500 disabled:opacity-60" aria-label="Add Expense">{submitting ? 'Adding...' : 'Add'}</button>
        </form>
        <div className="bg-white shadow rounded-lg p-6 overflow-x-auto" role="region" aria-label="Expenses Table">
          <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by description or category..."
              className="border rounded px-2 py-1 w-full md:w-64"
            />
          </div>
          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : (
            <>
              {error && <div className="text-red-500 mb-2">{error}</div>}
              {success && <div className="text-green-600 mb-2">{success}</div>}
              <table className="w-full min-w-[1000px] text-left" aria-label="Expenses Table">
                <thead>
                  <tr className="border-b bg-blue-50 text-blue-900">
                    <th className="py-2 px-4 cursor-pointer select-none" tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleSort('date')} onClick={() => handleSort('date')} aria-label="Sort by Date">Date {sortBy === 'date' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                    <th className="py-2 px-4 cursor-pointer select-none" tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleSort('category')} onClick={() => handleSort('category')} aria-label="Sort by Category">Category {sortBy === 'category' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                    <th className="py-2 px-4 cursor-pointer select-none" tabIndex={0} onKeyDown={e => e.key === 'Enter' && handleSort('amount')} onClick={() => handleSort('amount')} aria-label="Sort by Amount">Amount {sortBy === 'amount' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                    <th className="py-2 px-6">Description</th>
                    <th className="py-2 px-4">Status</th>
                    <th className="py-2 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses
                    .filter(exp =>
                      exp.description?.toLowerCase().includes(search.toLowerCase()) ||
                      exp.category?.toLowerCase().includes(search.toLowerCase())
                    )
                    .sort((a, b) => {
                      let v1 = a[sortBy], v2 = b[sortBy];
                      if (sortBy === 'amount') { v1 = Number(v1); v2 = Number(v2); }
                      if (sortBy === 'date') { v1 = new Date(v1); v2 = new Date(v2); }
                      if (v1 < v2) return sortDir === 'asc' ? -1 : 1;
                      if (v1 > v2) return sortDir === 'asc' ? 1 : -1;
                      return 0;
                    })
                    .map(exp => (
                      <tr key={exp.id} className="border-b hover:bg-gray-50 transition rounded-lg" style={{ borderRadius: '0.5rem' }}>
                        {editingId === exp.id ? (
                          <>
                            <td className="py-3 px-4">
                              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="border rounded px-2 py-1 w-full" required />
                            </td>
                            <td className="py-3 px-4">
                              <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className="border rounded px-2 py-1 w-full" required>
                                <option value="">Select</option>
                                {categories.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="border rounded px-2 py-1 w-full" required />
                            </td>
                            <td className="py-3 px-6">
                              <input type="text" value={editDescription} onChange={e => setEditDescription(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="Optional" />
                            </td>
                            <td className="py-3 px-4">
                              <span className={exp.paid ? 'text-green-600 font-semibold' : 'text-yellow-600 font-semibold'}>
                                {exp.paid ? 'Paid' : 'Unpaid'}
                              </span>
                            </td>
                            <td className="py-3 px-6">
                              <div className="flex flex-row gap-3 items-center justify-start w-full">
                                <button onClick={() => handleEditSave(exp.id)} className="bg-blue-500 text-white px-2 py-1 rounded" disabled={editSaving}>{editSaving ? 'Saving...' : 'Save'}</button>
                                <button onClick={handleEditCancel} className="bg-gray-300 px-2 py-1 rounded" disabled={editSaving}>Cancel</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4">{exp.date}</td>
                            <td className="py-3 px-4">
                              {exp.category && (
                                <span className={
                                  `inline-block px-3 py-1 rounded-full text-xs font-semibold mr-1 ` +
                                  (exp.category.toLowerCase() === 'food' ? 'bg-green-100 text-green-700 border border-green-200' :
                                  exp.category.toLowerCase() === 'entertainment' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                  exp.category.toLowerCase() === 'utilities' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                  exp.category.toLowerCase() === 'recharge' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                  exp.category.toLowerCase() === 'travel' ? 'bg-pink-100 text-pink-700 border border-pink-200' :
                                  exp.category.toLowerCase() === 'phone accessory' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                                  exp.category.toLowerCase() === 'stationary' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                  'bg-gray-100 text-gray-700 border border-gray-200')
                                }>
                                  {exp.category.charAt(0).toUpperCase() + exp.category.slice(1)}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">₹{exp.amount}</td>
                            <td className="py-3 px-6">{exp.description}</td>
                            <td className="py-3 px-4">
                              <span className={exp.paid ? 'text-green-600 font-semibold' : 'text-yellow-600 font-semibold'}>
                                {exp.paid ? 'Paid' : 'Unpaid'}
                              </span>
                            </td>
                            <td className="py-3 px-6">
                              <div className="flex flex-row gap-3 items-center justify-start w-full">
                                <button onClick={() => startEdit(exp)} className="flex items-center gap-1 px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 transition min-w-[70px] justify-center" title="Edit">Edit</button>
                                <button onClick={() => handleDelete(exp.id)} className="flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 transition min-w-[70px] justify-center" title="Delete">Delete</button>
                                <button onClick={() => handlePayExpense(exp)} className={`flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 border border-green-200 transition min-w-[70px] justify-center ${exp.paid ? 'hidden' : ''}`} title="Pay" style={{ display: exp.paid ? 'none' : 'flex' }}>Pay</button>
                                <button onClick={() => handleMarkAsPaid(exp)} className={`flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition min-w-[110px] justify-center ${exp.paid ? 'hidden' : ''}`} title="Mark as Paid (Manual)" style={{ display: exp.paid ? 'none' : 'flex' }}>Mark as Paid</button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
              {!loading && !error && expenses.length === 0 && <p className="text-gray-500 mt-4">No expenses yet. Add your first expense!</p>}
            </>
          )}
        </div>
        <div className="w-full max-w-2xl mx-auto mb-6">
          {budgetAdvice && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 mb-2 rounded flex items-center" role="alert" aria-live="polite">
              <svg className="w-6 h-6 mr-2 text-yellow-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20.5C6.201 20.5 1 15.299 1 9.5S6.201-1.5 12-1.5 23 4.701 23 10.5 17.799 20.5 12 20.5z" /></svg>
              <span>{budgetAdvice}</span>
            </div>
          )}
          {anomalyAlert && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-900 p-4 rounded flex items-center" role="alert" aria-live="assertive">
              <svg className="w-6 h-6 mr-2 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-1.414 1.414A9 9 0 103 12h2a7 7 0 117 7v2a9 9 0 109-9h-2a7 7 0 11-7-7V3a9 9 0 109 9h2a9 9 0 10-9-9z" /></svg>
              <span>{anomalyAlert}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Expenses;
