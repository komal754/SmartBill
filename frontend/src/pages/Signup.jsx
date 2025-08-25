import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const API_URL = import.meta.env.VITE_BACKEND_URL;
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOTP] = useState("");
  const [otpError, setOTPError] = useState("");
  const [otpLoading, setOTPLoading] = useState(false);
  const [otpSuccess, setOTPSuccess] = useState("");
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
      } else {
        setShowOTP(true);
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleOTPSubmit(e) {
    e.preventDefault();
    setOTPError("");
    setOTPLoading(true);
    setOTPSuccess("");
    try {
      const res = await fetch(`${API_URL}/api/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOTPError(data.error || "OTP verification failed");
      } else {
        setOTPSuccess("Email verified! You can now log in.");
        setTimeout(() => navigate("/login"), 1500);
      }
    } catch (err) {
      setOTPError("Network error");
    } finally {
      setOTPLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">Sign Up for SmartBill</h2>
        {!showOTP ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block mb-1 text-gray-600">Username</label>
              <input
                type="text"
                name="username"
                className="w-full border rounded px-3 py-2"
                placeholder="Your Username"
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 text-gray-600">Email</label>
              <input
                type="email"
                name="email"
                className="w-full border rounded px-3 py-2"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-6">
              <label className="block mb-1 text-gray-600">Password</label>
              <input
                type="password"
                name="password"
                className="w-full border rounded px-3 py-2"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
            {error && <div className="text-red-600 mb-4 text-center">{error}</div>}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Signing Up..." : "Sign Up"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOTPSubmit}>
            <div className="mb-4">
              <label className="block mb-1 text-gray-600">Enter OTP sent to your email</label>
              <input
                type="text"
                name="otp"
                className="w-full border rounded px-3 py-2"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={e => setOTP(e.target.value)}
                required
              />
            </div>
            {otpError && <div className="text-red-600 mb-4 text-center">{otpError}</div>}
            {otpSuccess && <div className="text-green-600 mb-4 text-center">{otpSuccess}</div>}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-60"
              disabled={otpLoading}
            >
              {otpLoading ? "Verifying..." : "Verify OTP"}
            </button>
            <button
              type="button"
              className="w-full mt-2 bg-gray-200 text-blue-700 py-2 rounded font-semibold hover:bg-blue-100 disabled:opacity-60"
              disabled={otpLoading}
              onClick={async () => {
                setOTPError("");
                setOTPSuccess("");
                setOTPLoading(true);
                try {
                  const res = await fetch(`${API_URL}/api/resend-otp`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: form.email }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setOTPError(data.error || "Failed to resend OTP");
                  } else {
                    setOTPSuccess("OTP resent! Please check your email.");
                  }
                } catch (err) {
                  setOTPError("Network error");
                } finally {
                  setOTPLoading(false);
                }
              }}
            >
              Resend OTP
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
