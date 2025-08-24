import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { UserIcon, ReceiptPercentIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/solid';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './ProtectedRoute';
import { RefreshProvider } from './context/RefreshContext';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Expenses from './pages/Expenses';
import Payments from './pages/Payments';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import ChatbotWidget from './components/ChatbotWidget';

import React, { useState } from 'react';
function Navbar() {
  const location = useLocation();
  const isLoggedIn = Boolean(localStorage.getItem('token'));
  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/expenses', label: 'Expenses' },
    { to: '/payments', label: 'Payments' },
    { to: '/reports', label: 'Reports' },
    { to: '/profile', label: 'Profile' },
  ];
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-5xl bg-white/90 backdrop-blur-lg shadow-xl rounded-2xl px-4 md:px-8 py-3 flex items-center justify-between border border-blue-100">
      <Link to="/" className="flex items-center gap-2 font-extrabold text-blue-700 text-2xl tracking-tight select-none animate-fade-in-smooth">
        <span className="inline-block animate-bounce-slow icon-pulse"><ReceiptPercentIcon className="w-8 h-8 text-blue-600 drop-shadow" /></span>
        <span>SmartBill</span>
      </Link>
      {/* Hamburger for mobile */}
      <button className="md:hidden ml-2 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" onClick={() => setMenuOpen(m => !m)} aria-label="Open menu">
        {menuOpen ? <XMarkIcon className="w-7 h-7 text-blue-700" /> : <Bars3Icon className="w-7 h-7 text-blue-700" />}
      </button>
      {/* Desktop nav */}
      <div className="hidden md:flex gap-2 md:gap-4 items-center">
        {navLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`px-4 py-2 rounded-full font-semibold transition text-base md:text-lg ${location.pathname === link.to
              ? 'text-blue-700 bg-blue-100 border border-blue-300 shadow-sm'
              : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}
          >
            {link.label}
          </Link>
        ))}
        {!isLoggedIn && (
          <>
            <Link to="/login" className={`px-4 py-2 rounded-full font-semibold transition text-base md:text-lg ${location.pathname === '/login' ? 'text-blue-700 bg-blue-100 border border-blue-300 shadow-sm' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}>Login</Link>
            <Link to="/signup" className={`px-4 py-2 rounded-full font-semibold transition text-base md:text-lg ${location.pathname === '/signup' ? 'text-blue-700 bg-blue-100 border border-blue-300 shadow-sm' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}>Sign Up</Link>
          </>
        )}
        {isLoggedIn && (
          <>
            <Link to="/profile" className="ml-2">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold shadow border-2 border-white">
                <UserIcon className="w-6 h-6" />
              </div>
            </Link>
            <button onClick={handleLogout} className="ml-2 px-4 py-2 rounded-full font-semibold transition text-base md:text-lg text-gray-700 hover:bg-red-100 hover:text-red-600">Logout</button>
          </>
        )}
      </div>
      {/* Mobile nav menu */}
      {menuOpen && (
        <div className="absolute top-full left-0 w-full bg-white/95 shadow-xl rounded-b-2xl flex flex-col items-center py-4 gap-2 border-t border-blue-100 md:hidden animate-fade-in-smooth">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`w-11/12 text-center px-4 py-3 rounded-xl font-semibold transition text-lg ${location.pathname === link.to
                ? 'text-blue-700 bg-blue-100 border border-blue-300 shadow-sm'
                : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {!isLoggedIn && (
            <>
              <Link to="/login" className={`w-11/12 text-center px-4 py-3 rounded-xl font-semibold transition text-lg ${location.pathname === '/login' ? 'text-blue-700 bg-blue-100 border border-blue-300 shadow-sm' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`} onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/signup" className={`w-11/12 text-center px-4 py-3 rounded-xl font-semibold transition text-lg ${location.pathname === '/signup' ? 'text-blue-700 bg-blue-100 border border-blue-300 shadow-sm' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`} onClick={() => setMenuOpen(false)}>Sign Up</Link>
            </>
          )}
          {isLoggedIn && (
            <>
              <Link to="/profile" className="w-11/12 flex justify-center mb-2" onClick={() => setMenuOpen(false)}>
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold shadow border-2 border-white">
                  <UserIcon className="w-6 h-6" />
                </div>
              </Link>
              <button onClick={() => { setMenuOpen(false); handleLogout(); }} className="w-11/12 px-4 py-3 rounded-xl font-semibold transition text-lg text-gray-700 hover:bg-red-100 hover:text-red-600">Logout</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <Toaster position="top-right" />
      <main className="flex flex-col items-center justify-center mt-[88px] md:mt-[88px]">
        {children}
      </main>
      <ChatbotWidget />
    </div>
  );
}

function App() {
  return (
    <RefreshProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<RedirectToLoginOrDashboard />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          </Routes>
        </Layout>
      </Router>
    </RefreshProvider>
  );
}

import { Navigate } from 'react-router-dom';
function RedirectToLoginOrDashboard() {
  const isLoggedIn = Boolean(localStorage.getItem('token'));
  return isLoggedIn ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

export default App;
