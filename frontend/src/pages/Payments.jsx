

// Advanced animated modal with icon and color cues
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
}
// Razorpay script loader
async function loadRazorpayScript() {
  if (window.Razorpay) return true;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useRefresh } from '../context/RefreshContext';
import { useCustomCategories } from '../hooks/useCustomCategories';

export default function Payments() {
  const { refreshKey } = useRefresh();
  const [payments, setPayments] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [summary, setSummary] = useState({ total: 0, topCategory: '', topCategoryAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('payment_date');
  const [sortDir, setSortDir] = useState('desc');
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', category: '', description: '' });
  const [suggestedCategory, setSuggestedCategory] = useState('');
  const [descTypingTimeout, setDescTypingTimeout] = useState(null);
  const defaultCategories = [
    'Food', 'Transport', 'Groceries', 'Entertainment', 'Utilities', 'Shopping', 'Health', 'Education', 'Travel', 'Bills',
    'Subscriptions', 'Gifts', 'Insurance', 'Rent', 'Salary', 'Investment', 'Charity', 'Pets', 'Kids', 'Personal Care',
    'Beauty', 'Clothing', 'Recharge', 'Petrol', 'Home Items', 'Stationary', 'Phone Accessory', 'Laptop and Computer Accessory', 'Other'
  ];
  const [categories, addCategory, removeCategory] = useCustomCategories('payments', defaultCategories);
  const [newCategory, setNewCategory] = useState('');

  function normalizePayment(pay) {
    return {
      id: pay.id,
      user_id: pay.user_id,
      payment_date: pay.payment_date || pay.PaymentDate,
      amount: pay.amount,
      expense_id: pay.expense_id || pay.ExpenseID,
      category: pay.category,
      description: pay.description
    };
  }

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const FASTAPI_URL = import.meta.env.VITE_API_URL;
  useEffect(() => {
    const token = localStorage.getItem('token');
    setLoading(true);
    fetch(`${BACKEND_URL}/api/payments`, {
    // fetch(`/api/payments`, {

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
        if (!res.ok) throw new Error('Failed to fetch payments');
        return res.json();
      })
      .then(data => {
        const normalized = Array.isArray(data) ? data.map(normalizePayment) : [];
        setPayments(normalized);
        // Calculate summary for current month
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const thisMonth = normalized.filter(p => {
          if (!p.payment_date) return false;
          const [y, m] = p.payment_date.split('-');
          return Number(y) === year && Number(m) === month;
        });
        const total = thisMonth.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const catMap = {};
        thisMonth.forEach(p => {
          if (!p.category) return;
          catMap[p.category] = (catMap[p.category] || 0) + (Number(p.amount) || 0);
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
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  function refetchPayments() {
    const token = localStorage.getItem('token');
    setLoading(true);
  fetch(`${BACKEND_URL}/api/payments`, {
  // fetch(`/api/payments`, {

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
        if (!res.ok) throw new Error('Failed to fetch payments');
        return res.json();
      })
      .then(data => {
        setPayments(Array.isArray(data) ? data.map(normalizePayment) : []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  function handleEditSave(id) {
    const token = localStorage.getItem('token');
    const payment = payments.find(pay => pay.id === id);
    if (!payment) return;
    const amountNum = Number(editAmount);
    const categoryVal = editCategory !== undefined && editCategory !== null && editCategory !== '' ? editCategory : payment.category;
    const descriptionVal = editDescription !== undefined && editDescription !== null ? editDescription : (payment.description || '');
    if (isNaN(amountNum) || !categoryVal) {
      toast.error('Amount must be a number and category is required.');
      return;
    }
    setEditSaving(true);
  fetch(`${BACKEND_URL}/api/payments/${id}`, {
  // fetch(`/api/payments/${id}`, {

      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : undefined
      },
      body: JSON.stringify({
        amount: amountNum,
        category: categoryVal,
        description: descriptionVal
      })
    })
      .then(() => refetchPayments())
      .then(() => {
        setEditingId(null);
        setEditSaving(false);
      })
      .catch(err => {
        toast.error('Update failed: ' + err.message);
        setEditSaving(false);
      });
  }

  function handleEditCancel() {
    setEditingId(null);
    setEditAmount('');
    setEditCategory('');
    setEditDescription('');
  }

  function startEdit(pay) {
    setEditingId(pay.id);
    setEditAmount(pay.amount);
    setEditCategory(pay.category);
    setEditDescription(pay.description || '');
  }

  function handleDelete(id) {
    setDeleteId(id);
    setShowDeleteModal(true);
  }

  function confirmDelete() {
    if (!deleteId) return;
    setActionLoading(true);
    const token = localStorage.getItem('token');
  fetch(`${BACKEND_URL}/api/payments/${deleteId}`, {
  // fetch(`/api/payments/${deleteId}`, {

      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : undefined
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Delete failed');
        setShowDeleteModal(false);
        setDeleteId(null);
        refetchPayments();
      })
      .catch(err => toast.error('Delete failed: ' + (err.message || err)))
      .finally(() => setActionLoading(false));
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));

    if (name === 'description') {
      // Debounce API call for AI suggestion
      if (descTypingTimeout) clearTimeout(descTypingTimeout);
      if (value.length > 2) {
        const timeout = setTimeout(async () => {
          try {
            const res = await fetch(`${FASTAPI_URL}/api/ai/categorize`, {
            // const res = await fetch(`/api/ai/categorize`, {

              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ description: value })
            });
            if (res.ok) {
              const data = await res.json();
              setSuggestedCategory(data.category);
              // Auto-fill category if user hasn't typed it
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

  function handleFormSubmit(e) {
    e.preventDefault();
    const payment_date = new Date().toISOString().slice(0, 10);
    if (!form.amount || isNaN(form.amount)) {
      toast.error('Please enter a valid amount.');
      return;
    }
    setCreating(true);
    const token = localStorage.getItem('token');
  fetch(`${BACKEND_URL}/api/payments`, {
  // fetch(`/api/payments`, {

      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : undefined
      },
      body: JSON.stringify({ payment_date, amount: parseFloat(form.amount), category: form.category, description: form.description })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to create payment');
        return res.json();
      })
      .then(() => {
        setForm({ amount: '', category: '', description: '' });
        setShowForm(false);
        refetchPayments();
      })
      .catch(err => toast.error('Failed to create payment: ' + (err.message || err)))
      .finally(() => setCreating(false));
  }

  function handleNewPayment() {
    setShowForm(true);
    setForm({ amount: '', category: '', description: '' });
  }

  function handleAddCategory(e) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    addCategory(newCategory.trim());
    setNewCategory('');
  }

  function handleSort(field) {
    if (sortBy === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  }

  async function handleRazorpayPayment() {
    const amount = window.prompt('Enter payment amount (in ₹):');
    if (!amount || isNaN(amount)) return;
    const token = localStorage.getItem('token');
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      toast.error('Failed to load Razorpay. Please try again.');
      return;
    }
  const res = await fetch(`${BACKEND_URL}/api/razorpay/order`, {
  // const res = await fetch(`/api/razorpay/order`, {

      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : undefined
      },
      body: JSON.stringify({ amount: parseInt(amount) * 100, currency: 'INR' })
    });
    if (!res.ok) {
      toast.error('Failed to create order');
      return;
    }
    const order = await res.json();
    const options = {
      key: 'rzp_test_R5ZEYHFFHdm7dx',
      amount: order.amount,
      currency: order.currency,
      order_id: order.id,
      name: 'SmartBill',
      description: 'Payment',
      handler: function (response) {
        toast.success('Payment successful! Payment ID: ' + response.razorpay_payment_id);
  // fetch(`${BACKEND_URL}/api/payments`, {
  fetch(`/api/payments`, {

          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : undefined
          },
          body: JSON.stringify({
            payment_date: new Date().toISOString().slice(0, 10),
            amount: order.amount / 100,
            razorpay_payment_id: response.razorpay_payment_id
          })
        })
          .then(res => {
            if (!res.ok) throw new Error('Failed to record payment');
            return res.json();
          })
          .then(() => refetchPayments())
          .catch(err => toast.error('Payment succeeded but failed to record: ' + err.message));
      },
      prefill: { email: '' },
      theme: { color: '#3399cc' }
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  }

  return (
    <div className="w-full mt-10 px-0">
      <h1 className="text-3xl font-bold mb-6 text-blue-700 text-center">Payments</h1>
      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-center">
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
      <button onClick={handleNewPayment} disabled={creating} className="mb-6 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-60">{creating ? 'Creating...' : 'New Payment'}</button>
      {showForm && (
        <form onSubmit={handleFormSubmit} className="mb-6 p-4 bg-gray-50 rounded shadow flex flex-col md:flex-row gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-600">Amount</label>
            <input type="number" name="amount" value={form.amount} onChange={handleFormChange} className="border rounded px-2 py-1 w-full" placeholder="e.g. 100" required />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Category</label>
            <select name="category" value={form.category} onChange={handleFormChange} className="border rounded px-2 py-1 w-full" required>
              <option value="">Select</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {suggestedCategory && (
              <div className="text-xs text-blue-600 mt-1">Suggested: <b>{suggestedCategory}</b> <button type="button" className="ml-2 underline text-blue-700" onClick={() => setForm(f => ({ ...f, category: suggestedCategory }))}>Use</button></div>
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
          <div className="relative">
            <label className="block text-sm text-gray-600">Description</label>
            <input type="text" name="description" value={form.description} onChange={handleFormChange} className="border rounded px-2 py-1 w-full" placeholder="Optional" />
            {suggestedCategory && form.category !== suggestedCategory && (
              <div className="flex items-center gap-2 mt-2 animate-fade-in">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300 shadow-sm">
                  <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20.5C6.201 20.5 1 15.299 1 9.5S6.201-1.5 12-1.5 23 4.701 23 10.5 17.799 20.5 12 20.5z" /></svg>
                  Suggested: {suggestedCategory}
                </span>
                <button type="button" className="ml-2 px-2 py-1 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition" onClick={() => setForm(f => ({ ...f, category: suggestedCategory }))}>
                  Apply
                </button>
              </div>
            )}
          </div>
          <button type="submit" disabled={creating} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
            {creating && <span className="w-4 h-4 border-2 border-white border-t-blue-500 rounded-full animate-spin"></span>}
            Add
          </button>
          <button type="button" onClick={() => { setShowForm(false); setForm({ amount: '', category: '', description: '' }); }} className="ml-2 bg-gray-300 px-4 py-2 rounded">Cancel</button>
        </form>
      )}
      <button onClick={handleRazorpayPayment} className="mb-6 ml-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2">
        {actionLoading && <span className="w-4 h-4 border-2 border-white border-t-blue-500 rounded-full animate-spin"></span>}
        Pay with Razorpay
      </button>
  <ConfirmModal open={showDeleteModal} onConfirm={confirmDelete} onCancel={() => { setShowDeleteModal(false); setDeleteId(null); }} message="Are you sure you want to delete this payment? This action cannot be undone." />
  <div className="bg-white shadow rounded-lg p-4 overflow-x-auto">
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
          <div className="flex items-center gap-2 text-gray-500"><span className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></span> Loading payments...</div>
        ) : error ? (
          <div className="text-red-600 font-semibold">{error}</div>
        ) : (
          <>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="py-2 cursor-pointer select-none" onClick={() => handleSort('payment_date')}>Date {sortBy === 'payment_date' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th className="py-2 cursor-pointer select-none" onClick={() => handleSort('amount')}>Amount {sortBy === 'amount' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th className="py-2 cursor-pointer select-none" onClick={() => handleSort('category')}>Category {sortBy === 'category' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th className="py-2">Description</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(payments || [])
                  .filter(pay =>
                    pay.description?.toLowerCase().includes(search.toLowerCase()) ||
                    pay.category?.toLowerCase().includes(search.toLowerCase())
                  )
                  .sort((a, b) => {
                    let v1 = a[sortBy], v2 = b[sortBy];
                    if (sortBy === 'amount') { v1 = Number(v1); v2 = Number(v2); }
                    if (sortBy === 'payment_date') { v1 = new Date(v1); v2 = new Date(v2); }
                    if (v1 < v2) return sortDir === 'asc' ? -1 : 1;
                    if (v1 > v2) return sortDir === 'asc' ? 1 : -1;
                    return 0;
                  })
                  .map(pay => (
                    <tr key={pay.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">{pay.payment_date}</td>
                      <td className="py-2">
                        {editingId === pay.id ? (
                          <input
                            type="number"
                            value={editAmount}
                            onChange={e => setEditAmount(e.target.value)}
                            className="border px-2 py-1 w-24"
                          />
                        ) : (
                          <>₹{pay.amount}</>
                        )}
                      </td>
                      <td className="py-2">
                        {editingId === pay.id ? (
                          <select
                            value={editCategory}
                            onChange={e => setEditCategory(e.target.value)}
                            className="border rounded px-2 py-1"
                            required
                          >
                            <option value="">Select</option>
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        ) : (
                          pay.category || ''
                        )}
                      </td>
                      <td className="py-2">
                        {editingId === pay.id ? (
                          <input
                            type="text"
                            value={editDescription}
                            onChange={e => setEditDescription(e.target.value)}
                            className="border rounded px-2 py-1"
                            placeholder="Optional"
                          />
                        ) : (
                          pay.description || ''
                        )}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-row gap-3 items-center justify-start w-full">
                          {editingId === pay.id ? (
                            <>
                              <button onClick={() => handleEditSave(pay.id)} className="flex items-center gap-1 px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 transition min-w-[70px] justify-center" disabled={editSaving}>{editSaving ? 'Saving...' : 'Save'}</button>
                              <button onClick={handleEditCancel} className="flex items-center gap-1 px-2 py-1 rounded bg-gray-300 text-gray-700 hover:bg-gray-200 border border-gray-200 transition min-w-[70px] justify-center" disabled={editSaving}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(pay)} className="flex items-center gap-1 px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 transition min-w-[70px] justify-center" title="Edit">Edit</button>
                              <button onClick={() => handleDelete(pay.id)} className="flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 transition min-w-[70px] justify-center" title="Delete">Delete</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}