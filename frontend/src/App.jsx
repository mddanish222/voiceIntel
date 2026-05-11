/*App.jsx*/
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Upload, Copy, Download, Trash2, Clock,
  CheckCheck, Zap, History,
  LayoutDashboard, Volume2, FileText,
  Activity, Cpu, LogOut, User, Mail,
  Lock, Eye, EyeOff, AlertCircle, Shield,
  LogIn, ArrowRight, X, ChevronLeft,
} from "lucide-react";
import jsPDF from "jspdf";

const API = "https://voiceintel-1uu9.onrender.com";

// -----------------------------------------------------------
// AI TEXT FORMATTER
// -----------------------------------------------------------
async function formatWithAI(raw) {
  if (!raw || raw.trim().length < 3) return raw;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content:
              "You are a professional transcript editor. Reformat the raw speech-to-text output below into clean, readable text.\n\n" +
              "Rules:\n" +
              "- Add correct punctuation: commas, full stops, question marks, exclamation marks\n" +
              "- Capitalise the start of every sentence and all proper nouns\n" +
              "- Remove filler words: uh, um, hmm, er, like, you know\n" +
              "- Group into logical paragraphs every 3-5 sentences\n" +
              "- Do NOT change the meaning or invent new words\n" +
              "- Do NOT add headings, bullets, or markdown\n" +
              "- Return ONLY the formatted text, nothing else\n\n" +
              "Raw transcript:\n" +
              raw,
          },
        ],
      }),
    });
    const data = await res.json();
    const formatted = data?.content?.[0]?.text?.trim();
    return formatted && formatted.length > 0 ? formatted : raw;
  } catch {
    let text = raw.trim();
    text = text.charAt(0).toUpperCase() + text.slice(1);
    text = text.replace(/\b(uh+|um+|hmm+|er+)\b,?\s*/gi, "");
    if (!/[.?!]$/.test(text)) text += ".";
    return text;
  }
}

function formatTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

// -----------------------------------------------------------
// PASSWORD STRENGTH
// -----------------------------------------------------------
function getPasswordStrength(password) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { label: "Weak", segments: 1, color: "bg-red-400", textColor: "text-red-500" };
  if (score <= 2) return { label: "Fair", segments: 2, color: "bg-yellow-400", textColor: "text-yellow-500" };
  if (score === 3) return { label: "Good", segments: 3, color: "bg-blue-400", textColor: "text-blue-500" };
  return { label: "Strong", segments: 4, color: "bg-emerald-400", textColor: "text-emerald-500" };
}

function PasswordStrengthBar({ password }) {
  const strength = getPasswordStrength(password);
  if (!password || !strength) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="px-1 mt-1">
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-slate-400" />
          <span className="text-xs text-slate-400">Password strength</span>
        </div>
        <motion.span key={strength.label} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} className={`text-xs font-bold ${strength.textColor}`}>
          {strength.label}
        </motion.span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((seg) => (
          <div key={seg} className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${strength.segments >= seg ? strength.color : "bg-transparent"}`}
              initial={{ width: 0 }}
              animate={{ width: strength.segments >= seg ? "100%" : "0%" }}
              transition={{ duration: 0.35, delay: seg * 0.07 }}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// -----------------------------------------------------------
// WAVEFORM BARS
// -----------------------------------------------------------
function WaveformBars({ active, count = 28, color = "from-indigo-500 to-sky-400" }) {
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 36 }}>
      {Array.from({ length: count }).map((_, i) => {
        const base = 3 + Math.sin(i * 0.6) * 2;
        return (
          <motion.div
            key={i}
            className={`w-[3px] rounded-full bg-gradient-to-t ${color}`}
            animate={active ? { height: [base, base + 8 + Math.abs(Math.sin(i)) * 16, base] } : { height: base }}
            transition={{ duration: 0.45 + (i % 5) * 0.07, repeat: Infinity, delay: i * 0.04, ease: "easeInOut" }}
          />
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------
// ORBIT LOADER
// -----------------------------------------------------------
function OrbitLoader() {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <motion.div className="absolute inset-0 rounded-full" style={{ border: "2px solid transparent", borderTopColor: "#4f46e5", borderRightColor: "rgba(79,70,229,0.2)" }} animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }} />
      <motion.div className="absolute inset-4 rounded-full" style={{ border: "2px solid transparent", borderBottomColor: "#0ea5e9", borderLeftColor: "rgba(14,165,233,0.2)" }} animate={{ rotate: -360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
      <motion.div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-400/30" animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
        <Cpu className="w-4 h-4 text-white" />
      </motion.div>
    </div>
  );
}

// -----------------------------------------------------------
// TYPEWRITER TEXT
// -----------------------------------------------------------
function TypewriterText({ text }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed(""); setDone(false);
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, 14);
    return () => clearInterval(id);
  }, [text]);
  return (
    <p className="text-slate-700 text-sm leading-8 whitespace-pre-wrap font-normal tracking-wide">
      {displayed}
      {!done && <motion.span className="inline-block w-[2px] h-4 bg-indigo-500 ml-0.5 align-middle" animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} />}
    </p>
  );
}

// -----------------------------------------------------------
// CARD
// -----------------------------------------------------------
function Card({ children, className = "", hover = true }) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, boxShadow: "0 16px 48px rgba(79,70,229,0.10), 0 4px 16px rgba(0,0,0,0.06)" } : {}}
      transition={{ duration: 0.2 }}
      className={`bg-white border border-slate-200 rounded-2xl shadow-sm relative overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  );
}

// -----------------------------------------------------------
// BUTTON
// -----------------------------------------------------------
function Btn({ onClick, disabled, children, variant = "primary", className = "" }) {
  const base = "relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 overflow-hidden cursor-pointer";
  const variants = {
    primary: "bg-gradient-to-r from-indigo-600 to-sky-500 text-white shadow-md shadow-indigo-200 hover:shadow-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed",
    ghost: "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800",
    danger: "border border-red-200 bg-red-50 text-red-500 hover:bg-red-100",
  };
  return (
    <motion.button whileHover={{ scale: disabled ? 1 : 1.02 }} whileTap={{ scale: disabled ? 1 : 0.97 }} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </motion.button>
  );
}

// -----------------------------------------------------------
// APP LOGO
// -----------------------------------------------------------
function AppLogo({ size = "md" }) {
  const cfg = { sm: { total: 38, r: 18, sw: 1.8 }, md: { total: 56, r: 26, sw: 2.2 }, lg: { total: 76, r: 36, sw: 2.5 } };
  const c = cfg[size];
  const half = c.total / 2;
  const gid = `grad_${size}`;
  const cid = `clip_${size}`;
  const ratios = [0.40, 0.68, 0.30, 0.85, 0.55, 0.45];
  const totalBars = ratios.length;
  const diameter = c.r * 2;
  const barW = (diameter * 0.70) / (totalBars + (totalBars - 1) * 0.4);
  const gap = barW * 0.4;
  const groupW = totalBars * barW + (totalBars - 1) * gap;
  return (
    <div className="flex-shrink-0" style={{ width: c.total, height: c.total }}>
      <svg width={c.total} height={c.total} viewBox={`0 0 ${c.total} ${c.total}`} role="img" xmlns="http://www.w3.org/2000/svg">
        <title>VoiceIntel AI</title>
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
          <clipPath id={cid}><circle cx={half} cy={half} r={c.r - c.sw} /></clipPath>
        </defs>
        <circle cx={half} cy={half} r={c.r} fill={`url(#${gid})`} fillOpacity="0.10" stroke={`url(#${gid})`} strokeWidth={c.sw} />
        <g clipPath={`url(#${cid})`}>
          {ratios.map((ratio, i) => {
            const bh = diameter * ratio;
            const bx = half - groupW / 2 + i * (barW + gap);
            const by = half - bh / 2;
            return <rect key={i} x={bx} y={by} width={barW} height={bh} rx={barW / 2} fill={`url(#${gid})`} />;
          })}
        </g>
      </svg>
    </div>
  );
}

// -----------------------------------------------------------
// MAIN BACKGROUND
// -----------------------------------------------------------
function MainBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30" />
      <div className="absolute top-[-200px] right-[-100px] w-[600px] h-[600px] rounded-full bg-indigo-100/50 blur-[130px]" />
      <div className="absolute bottom-[-150px] left-[-80px] w-[500px] h-[500px] rounded-full bg-sky-100/50 blur-[110px]" />
      <div className="absolute inset-0 opacity-[0.25]" style={{ backgroundImage: "radial-gradient(circle, #c7d2fe 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #4f46e5 0px, #4f46e5 1px, transparent 1px, transparent 40px)" }} />
    </div>
  );
}

// -----------------------------------------------------------
// LOGIN MODAL — updated flow (cursor + focus fixes)
// -----------------------------------------------------------
function LoginModal({ onClose, onAuth, reason }) {
  const [step, setStep] = useState("entry");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notRegistered, setNotRegistered] = useState(false);

  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

  const validateEmail = (val) => {
    const t = val.trim().toLowerCase();
    if (!t) return "Please enter your email.";
    if (!t.includes("@")) return 'Email must contain "@" (e.g. name@gmail.com).';
    const [, domain] = t.split("@");
    if (!domain || !domain.includes("."))
      return "Email must have a valid domain (e.g. gmail.com).";
    if (!emailRegex.test(t))
      return "Please enter a valid email (e.g. name@gmail.com).";
    return null;
  };

  const handleEmailNext = async () => {
    setError("");
    setNotRegistered(false);
    const err = validateEmail(email);
    if (err) { setError(err); return; }
    const trimmed = email.trim().toLowerCase();
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/check-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (data.exists) {
        setStep("login-pass");
      } else {
        setNotRegistered(true);
      }
    } catch {
      setStep("login-pass");
    } finally {
      setLoading(false);
    }
  };

  const handleGoRegister = () => {
    setNotRegistered(false);
    setError("");
    setPassword("");
    setConfirmPassword("");
    setStep("entry-register");
  };

  const handleCreateOne = () => {
    setNotRegistered(false);
    setError("");
    setPassword("");
    setConfirmPassword("");
    setStep("entry-register");
  };

  const handleLogin = async () => {
    setError("");
    if (!password) { setError("Please enter your password."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Authentication failed."); return; }
      localStorage.setItem("voiceintel_token", data.token);
      localStorage.setItem("voiceintel_user", JSON.stringify({ email: data.email, id: data.id }));
      onAuth({ email: data.email, id: data.id, token: data.token });
      onClose();
    } catch {
      setError("Cannot connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError("");
    const emailErr = validateEmail(email);
    if (emailErr) { setError(emailErr); return; }
    if (!password) { setError("Please enter a password."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed."); return; }
      localStorage.setItem("voiceintel_token", data.token);
      localStorage.setItem("voiceintel_user", JSON.stringify({ email: data.email, id: data.id }));
      onAuth({ email: data.email, id: data.id, token: data.token });
      onClose();
    } catch {
      setError("Cannot connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep("entry");
    setPassword(""); setConfirmPassword("");
    setError(""); setShowPass(false); setShowConfirm(false);
    setNotRegistered(false);
  };

  const handleClear = () => {
    if (step === "entry" || step === "entry-register") {
      setEmail(""); setPassword(""); setConfirmPassword(""); setError(""); setNotRegistered(false);
    } else {
      setPassword(""); setError("");
    }
  };

  const reasonText =
    reason === "history" ? "Login to view your transcript history" : "Login to analyze your audio";

  // shared spinner for inside gradient button
  const Spinner = () => (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white"
    />
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backdropFilter: "blur(12px)", backgroundColor: "rgba(15,23,42,0.45)" }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
          className="relative w-full max-w-sm"
        >
          {/* Glow */}
          <motion.div
            className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-400/30 via-blue-400/20 to-sky-400/30 blur-xl"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          <div className="relative bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-indigo-200/50 border border-white/80 overflow-hidden">
            {/* Top shimmer bar */}
            <div className="relative h-1 w-full bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-400 overflow-hidden">
              <motion.div
                className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-12"
                animate={{ x: ["-100px", "400px"] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              />
            </div>

            <div className="p-7">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {step !== "entry" && (
                    <motion.button
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={handleBack}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </motion.button>
                  )}
                  <div className="flex items-center gap-2.5">
                    <AppLogo size="sm" />
                    <div>
                      <p className="text-sm font-bold text-slate-800 leading-none">
                        Voice<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500">Intel</span>
                      </p>
                      <p className="text-[10px] text-slate-400 tracking-widest uppercase mt-0.5">AI Portal</p>
                    </div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Reason badge */}
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100 mb-5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                <p className="text-indigo-600 text-xs font-medium">{reasonText}</p>
              </motion.div>

              <AnimatePresence mode="wait">

                {/* ══════════════════════════════════════════════════════
                    STEP: entry
                ══════════════════════════════════════════════════════ */}
                {step === "entry" && (
                  <motion.div
                    key="entry"
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}
                    className="flex flex-col gap-3"
                  >
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 mb-1">Welcome</h2>
                      <p className="text-slate-400 text-sm mb-4">Enter your email to continue</p>
                    </div>

                    {/* ── Email input inlined ── */}
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setNotRegistered(false); setError(""); }}
                        placeholder="Email address"
                        onKeyDown={e => e.key === "Enter" && handleEmailNext()}
                        autoFocus
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 focus:bg-white transition-all"
                      />
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs"
                        >
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Not-registered inline message */}
                    <AnimatePresence>
                      {notRegistered && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="p-4 rounded-2xl bg-amber-50 border border-amber-200"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                            </div>
                            <div className="flex-1">
                              <p className="text-amber-700 text-xs font-semibold mb-0.5">Email not registered</p>
                              <p className="text-amber-600 text-xs leading-relaxed">
                                No account found for{" "}
                                <span className="font-semibold">{email.trim().toLowerCase()}</span>.
                                Would you like to create one?
                              </p>
                            </div>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            onClick={handleGoRegister}
                            className="mt-3 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold tracking-widest uppercase transition-all shadow-sm shadow-amber-200"
                          >
                            Create Account →
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex flex-col gap-2 mt-1">
                      {/* Gradient continue button */}
                      <motion.button
                        whileHover={{ scale: loading ? 1 : 1.02 }}
                        whileTap={{ scale: loading ? 1 : 0.97 }}
                        onClick={handleEmailNext}
                        disabled={loading}
                        className="relative w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-white text-xs font-bold tracking-widest uppercase shadow-lg shadow-indigo-300/50 flex items-center justify-center gap-2 overflow-hidden disabled:opacity-60"
                      >
                        <motion.div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent" initial={{ x: "-150%" }} animate={{ x: "250%" }} transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.5 }} />
                        {loading ? <><Spinner />Checking...</> : <><ArrowRight className="w-4 h-4" />Continue</>}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={handleClear}
                        className="w-full py-3 rounded-2xl bg-slate-100 text-slate-500 text-xs font-bold tracking-widest uppercase hover:bg-slate-200 transition-all"
                      >
                        Clear
                      </motion.button>
                    </div>

                    <p className="text-center text-slate-400 text-xs mt-2">
                      Don't have an account?{" "}
                      <button onClick={handleCreateOne} className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
                        Create one
                      </button>
                    </p>
                  </motion.div>
                )}

                {/* ══════════════════════════════════════════════════════
                    STEP: entry-register
                ══════════════════════════════════════════════════════ */}
                {step === "entry-register" && (
                  <motion.div
                    key="entry-register"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.22 }}
                    className="flex flex-col gap-3"
                  >
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 mb-1">Create Account</h2>
                      <p className="text-slate-400 text-sm mb-2">Fill in the details below to register</p>
                    </div>

                    {/* ── Email inlined with live validation ── */}
                    <div>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={e => { setEmail(e.target.value); setError(""); }}
                          placeholder="Email address"
                          onKeyDown={e => e.key === "Enter" && handleRegister()}
                          autoFocus
                          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 focus:bg-white transition-all"
                        />
                      </div>
                      <AnimatePresence>
                        {email && validateEmail(email) && (
                          <motion.p
                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex items-center gap-1.5 text-red-400 text-xs mt-1.5 px-1"
                          >
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            {validateEmail(email)}
                          </motion.p>
                        )}
                        {email && !validateEmail(email) && (
                          <motion.p
                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex items-center gap-1.5 text-emerald-500 text-xs mt-1.5 px-1"
                          >
                            <CheckCheck className="w-3 h-3" /> Valid email format
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* ── Password inlined ── */}
                    <div>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showPass ? "text" : "password"}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Password"
                          onKeyDown={e => e.key === "Enter" && handleRegister()}
                          className="w-full pl-11 pr-12 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 focus:bg-white transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(v => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <AnimatePresence>
                        {password && <PasswordStrengthBar password={password} />}
                      </AnimatePresence>
                    </div>

                    {/* ── Confirm password inlined ── */}
                    <div>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showConfirm ? "text" : "password"}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          onKeyDown={e => e.key === "Enter" && handleRegister()}
                          className="w-full pl-11 pr-12 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 focus:bg-white transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(v => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <AnimatePresence>
                        {confirmPassword && (
                          <motion.p
                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className={`flex items-center gap-1.5 text-xs mt-1.5 px-1 ${password === confirmPassword ? "text-emerald-500" : "text-red-400"}`}
                          >
                            {password === confirmPassword
                              ? <><CheckCheck className="w-3 h-3" />Passwords match</>
                              : <><AlertCircle className="w-3 h-3" />Passwords do not match</>}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs"
                        >
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex flex-col gap-2 mt-1">
                      <motion.button
                        whileHover={{ scale: loading ? 1 : 1.02 }}
                        whileTap={{ scale: loading ? 1 : 0.97 }}
                        onClick={handleRegister}
                        disabled={loading}
                        className="relative w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-white text-xs font-bold tracking-widest uppercase shadow-lg shadow-indigo-300/50 flex items-center justify-center gap-2 overflow-hidden disabled:opacity-60"
                      >
                        <motion.div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent" initial={{ x: "-150%" }} animate={{ x: "250%" }} transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.5 }} />
                        {loading ? <><Spinner />Creating account...</> : "Create Account"}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={handleClear}
                        className="w-full py-3 rounded-2xl bg-slate-100 text-slate-500 text-xs font-bold tracking-widest uppercase hover:bg-slate-200 transition-all"
                      >
                        Clear
                      </motion.button>
                    </div>

                    <p className="text-center text-slate-400 text-xs mt-2">
                      Already have an account?{" "}
                      <button onClick={handleBack} className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
                        Sign in
                      </button>
                    </p>
                  </motion.div>
                )}

                {/* ══════════════════════════════════════════════════════
                    STEP: login-pass
                ══════════════════════════════════════════════════════ */}
                {step === "login-pass" && (
                  <motion.div
                    key="login-pass"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.22 }}
                    className="flex flex-col gap-3"
                  >
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 mb-1">Welcome back</h2>
                      <p className="text-slate-400 text-sm mb-1">Enter your password to sign in</p>
                    </div>

                    {/* Email pill */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 w-fit mb-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-600 font-medium truncate max-w-[200px]">
                        {email.trim().toLowerCase()}
                      </span>
                    </div>

                    {/* ── Password inlined ── */}
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password"
                        onKeyDown={e => e.key === "Enter" && handleLogin()}
                        autoFocus
                        className="w-full pl-11 pr-12 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs"
                        >
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex flex-col gap-2 mt-1">
                      <motion.button
                        whileHover={{ scale: loading ? 1 : 1.02 }}
                        whileTap={{ scale: loading ? 1 : 0.97 }}
                        onClick={handleLogin}
                        disabled={loading}
                        className="relative w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-500 text-white text-xs font-bold tracking-widest uppercase shadow-lg shadow-indigo-300/50 flex items-center justify-center gap-2 overflow-hidden disabled:opacity-60"
                      >
                        <motion.div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent" initial={{ x: "-150%" }} animate={{ x: "250%" }} transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.5 }} />
                        {loading ? <><Spinner />Signing in...</> : <><LogIn className="w-4 h-4" />Sign In</>}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={handleClear}
                        className="w-full py-3 rounded-2xl bg-slate-100 text-slate-500 text-xs font-bold tracking-widest uppercase hover:bg-slate-200 transition-all"
                      >
                        Clear
                      </motion.button>
                    </div>

                    <p className="text-center text-slate-400 text-xs mt-2">
                      Don't have an account?{" "}
                      <button onClick={handleCreateOne} className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
                        Create one
                      </button>
                    </p>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// -----------------------------------------------------------
// HISTORY CARD
// -----------------------------------------------------------
function HistoryCard({ item, onDelete, index }) {
  const [expanded, setExpanded] = useState(false);
  const preview = item.transcription?.slice(0, 130);
  const hasMore = item.transcription?.length > 130;
  const wc = item.transcription?.split(/\s+/).filter(Boolean).length || 0;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: index * 0.06, duration: 0.3 }} whileHover={{ y: -3, boxShadow: "0 12px 40px rgba(79,70,229,0.10)" }}>
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden group shadow-sm">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-500 to-sky-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-600 text-sm leading-relaxed">{expanded ? item.transcription : preview}{hasMore && !expanded && "..."}</p>
            {hasMore && <button onClick={() => setExpanded(v => !v)} className="text-indigo-500 hover:text-indigo-600 text-xs mt-1.5 font-medium transition-colors">{expanded ? "Show less" : "Read more"}</button>}
          </div>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-all flex-shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </motion.button>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs"><Clock className="w-3 h-3" />{formatTime(item.createdAt || item.timestamp)}</div>
          <div className="text-slate-400 text-xs">{wc} words</div>
        </div>
      </div>
    </motion.div>
  );
}

// -----------------------------------------------------------
// MAIN APP
// -----------------------------------------------------------
function MainApp({ user, onLogout, onShowLogin }) {
  const [view, setView] = useState("studio");
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);

  const STEPS = ["Uploading audio...", "Analyzing speech patterns...", "Running AI transcription...", "Formatting with AI editor...", "Finalizing output..."];

  const authHeaders = user ? { Authorization: `Bearer ${user.token}`, "Content-Type": "application/json" } : {};

  const fetchHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API}/history`, { headers: { Authorization: `Bearer ${user.token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setHistory(data);
    } catch {}
    setHistoryLoading(false);
  };

  useEffect(() => { if (user) fetchHistory(); }, [user]);

  useEffect(() => {
    if (recording) {
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [recording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      alert("Microphone permission denied.");
    }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false); };

  const handleFileUpload = (file) => {
    if (!file) return;
    setAudioBlob(file);
    setAudioUrl(URL.createObjectURL(file));
    setTranscript("");
  };

  const handleReset = () => {
    setAudioBlob(null); setAudioUrl(null); setTranscript(""); setWordCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!audioBlob) return;
    // Gate: require login
    if (!user) { onShowLogin("analyze"); return; }

    setProcessing(true); setTranscript(""); setWordCount(0);
    let step = 0; setProcessingStep(0);
    const stepTimer = setInterval(() => { step = Math.min(step + 1, STEPS.length - 1); setProcessingStep(step); }, 1000);

    try {
      const form = new FormData();
      const mimeType = audioBlob.type || "audio/webm";
      const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : mimeType.includes("wav") ? "wav" : mimeType.includes("mp3") ? "mp3" : "webm";
      form.append("audio", audioBlob, `audio.${ext}`);

      const res = await fetch(`${API}/upload`, { method: "POST", headers: { Authorization: `Bearer ${user.token}` }, body: form });
      if (!res.ok) { const err = await res.text(); setTranscript(`Server error ${res.status}: ${err}`); return; }

      const data = await res.json();
      const raw = data.transcription || data.text || data.result || "";
      if (!raw) { setTranscript("No speech detected. Please try clearer audio."); return; }

      setProcessingStep(3);
      const formatted = await formatWithAI(raw);
      setTranscript(formatted);
      const wc = formatted.split(/\s+/).filter(Boolean).length;
      setWordCount(wc);

      await fetch(`${API}/history/save`, {
        method: "POST",
        headers: { ...authHeaders },
        body: JSON.stringify({ transcription: formatted, filename: audioBlob.name || "recording" }),
      });
      fetchHistory();
    } catch (err) {
      setTranscript(`Connection error: ${err.message}`);
    } finally {
      clearInterval(stepTimer);
      setProcessing(false);
    }
  };

  const handleViewHistory = () => {
    if (!user) { onShowLogin("history"); return; }
    setView("history");
    fetchHistory();
  };

  const handleDeleteHistory = async (id) => {
    try {
      await fetch(`${API}/delete/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${user.token}` } });
      setHistory(h => h.filter(x => x._id !== id));
    } catch {}
  };

  const handleClearAll = async () => {
    try {
      await fetch(`${API}/history/clear`, { method: "DELETE", headers: { Authorization: `Bearer ${user.token}` } });
      setHistory([]);
    } catch {}
  };

  const handleCopy = () => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPDF = () => {
    if (!transcript) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 595, 58, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("VoiceIntel AI - Transcript", 40, 36);
    doc.setTextColor(110, 110, 140);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}  |  Words: ${wordCount}`, 40, 72);
    doc.setDrawColor(200, 200, 220);
    doc.setLineWidth(0.5);
    doc.line(40, 80, 555, 80);
    doc.setTextColor(28, 28, 48);
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(transcript, 515);
    doc.text(lines, 40, 98);
    const total = doc.internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 200);
      doc.text(`VoiceIntel AI  |  Page ${i} of ${total}`, 40, 820);
    }
    doc.save("voiceintel-transcript.pdf");
  };

  const fmtSecs = s => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="min-h-screen text-slate-800 relative overflow-x-hidden" style={{ fontFamily: "'DM Sans', 'Nunito', system-ui, sans-serif" }}>
      <MainBackground />

      <nav className="relative z-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 shadow-sm">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 gap-2">
    
    {/* LOGO */}
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 flex-shrink-0">
      <AppLogo size="sm" />
      <div className="leading-none">
        <span className="text-slate-800 font-bold text-lg tracking-tight">Voice</span>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500 font-bold text-lg">Intel</span>
        <span className="hidden md:inline text-slate-400 font-medium text-xs ml-1.5 tracking-widest uppercase">AI</span>
      </div>
    </motion.div>

    {/* NAV TABS */}
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1">
      {[
        { id: "studio", icon: LayoutDashboard, label: "Studio", action: () => setView("studio") },
        { id: "history", icon: History, label: "History", action: handleViewHistory },
      ].map(({ id, icon: Icon, label, action }) => (
        <motion.button
          key={id}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={action}
          className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${view === id && user ? "text-white" : "text-slate-500 hover:text-slate-700"}`}
        >
          {view === id && user && (
            <motion.div layoutId="navpill" className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-600 to-sky-500" transition={{ type: "spring", bounce: 0.25, duration: 0.4 }} />
          )}
          <Icon className="w-4 h-4 relative z-10" />
          <span className="relative z-10 hidden sm:inline">{label}</span>
        </motion.button>
      ))}
    </motion.div>

    {/* RIGHT SIDE */}
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="flex items-center gap-2 flex-shrink-0">
      {user ? (
        <>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 text-xs font-medium">
            <motion.div className="w-1.5 h-1.5 rounded-full bg-emerald-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            Online
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 text-xs">
            <User className="w-3.5 h-3.5" />
            <span className="hidden md:inline max-w-[100px] truncate">{user.email}</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onLogout}
            className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </motion.button>
        </>
      ) : (
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => onShowLogin("analyze")}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 text-white text-sm font-semibold shadow-md shadow-indigo-200 hover:shadow-indigo-300 transition-all"
        >
          <LogIn className="w-4 h-4" />
          <span>Login</span>
        </motion.button>
      )}
    </motion.div>

  </div>
</nav>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-24">

        {/* HERO */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center pt-14 pb-10">
          <h1 className="text-4xl sm:text-5xl lg:text-[60px] font-bold tracking-tight leading-[1.1] mb-5">
            <span className="text-slate-800">AI Speech </span>
            <span className="relative inline-block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-400">Intelligence</span>
              <motion.div className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-400" initial={{ scaleX: 0, originX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.8, duration: 0.7 }} />
            </span>
            <br />
            <span className="text-slate-400 font-semibold text-3xl sm:text-4xl lg:text-[44px]">&amp; Transcription</span>
          </h1>
          <p className="text-slate-500 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
            Convert spoken audio into accurate, AI-formatted text with proper punctuation and paragraphs.
          </p>
          {!user && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-indigo-400 text-sm mt-3 font-medium">
              Upload or record freely — login required only to analyze
            </motion.p>
          )}
          <div className="flex items-center justify-center gap-8 mt-7">
            {[{ label: "Accuracy", value: "98.5%" }, { label: "Languages", value: "50+" }, { label: "Real-time", value: "Yes" }].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500">{value}</div>
                <div className="text-slate-400 text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {view === "studio" || !user ? (
            <motion.div key="studio" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* LEFT — Input */}
                <Card className="p-7">
                  <div className="flex items-center justify-between mb-7">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                        <Mic className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Audio Input</p>
                        <p className="text-xs text-slate-400 mt-0.5">Record or upload your source audio</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Activity className="w-3 h-3" />
                      {audioBlob ? "Ready" : "Idle"}
                    </div>
                  </div>

                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files[0]); }}
                    className="grid grid-cols-2 gap-4 mb-5"
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`group flex flex-col items-center gap-4 p-7 rounded-2xl border transition-all duration-300 ${dragOver ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300"}`}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center group-hover:border-blue-400 transition-colors">
                        <Upload className="w-6 h-6 text-blue-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-700">Upload File</p>
                        <p className="text-xs text-slate-400 mt-1">MP3, WAV, OGG, M4A</p>
                      </div>
                    </motion.button>
                    <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={e => handleFileUpload(e.target.files?.[0])} />

                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={recording ? stopRecording : startRecording}
                      className={`group flex flex-col items-center gap-4 p-7 rounded-2xl border transition-all duration-300 ${recording ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-300"}`}
                    >
                      <div className="relative flex items-center justify-center">
                        {recording && [1.4, 2, 2.6].map((s, i) => (
                          <motion.div key={i} className="absolute rounded-full bg-red-400/15" style={{ inset: -4 * i }}
                            animate={{ scale: [1, s], opacity: [0.5, 0] }}
                            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.4 }}
                          />
                        ))}
                        <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${recording ? "bg-gradient-to-br from-red-500 to-pink-500 shadow-lg shadow-red-200" : "bg-indigo-50 border border-indigo-200 group-hover:border-indigo-400"}`}>
                          {recording ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-indigo-500" />}
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-700">{recording ? "Stop" : "Record Audio"}</p>
                        {recording ? <p className="text-xs text-red-500 mt-1 font-mono">{fmtSecs(recordSeconds)}</p> : <p className="text-xs text-slate-400 mt-1">Use microphone</p>}
                      </div>
                    </motion.button>
                  </div>

                  <AnimatePresence>
                    {recording && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-5 overflow-hidden">
                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-4">
                          <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500" />
                          <WaveformBars active={true} count={30} color="from-red-500 to-pink-400" />
                          <div className="ml-auto text-right flex-shrink-0">
                            <p className="text-red-500 text-xs font-bold tracking-widest">LIVE</p>
                            <p className="text-red-400 text-xs font-mono">{fmtSecs(recordSeconds)}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {audioUrl && !recording && (
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="mb-5">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="flex items-center gap-2 mb-3">
                            <motion.div className="w-1.5 h-1.5 rounded-full bg-emerald-500" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs text-slate-500 font-medium">
                              {user ? "Audio Ready — Click Analyze to transcribe" : "Audio Ready — Login to analyze"}
                            </span>
                          </div>
                          <audio src={audioUrl} controls className="w-full rounded-lg" style={{ height: 40 }} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {audioUrl && !recording && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                        <Btn variant="ghost" onClick={handleReset} className="flex-1">Reset</Btn>
                        <Btn onClick={handleAnalyze} disabled={processing} className="flex-1">
                          {processing
                            ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white" />Analyzing</>
                            : !user
                              ? <><LogIn className="w-4 h-4" />Login to Analyze</>
                              : <><Zap className="w-4 h-4" />Analyze Audio</>}
                        </Btn>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!audioUrl && !recording && (
                    <div className="flex flex-col items-center gap-3 py-5 text-center">
                      <WaveformBars active={false} count={22} />
                      <p className="text-slate-400 text-sm">Upload a file or record to begin</p>
                    </div>
                  )}
                </Card>

                {/* RIGHT — Output */}
                <Card className="p-7 flex flex-col">
                  <div className="flex items-center justify-between mb-7">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-sky-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Studio Output</p>
                        <p className="text-xs text-slate-400 mt-0.5">{wordCount > 0 ? `${wordCount} words transcribed` : "AI transcription result"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={handleCopy} disabled={!transcript || processing} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                        <AnimatePresence mode="wait">
                          {copied
                            ? <motion.div key="ck" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><CheckCheck className="w-4 h-4 text-emerald-500" /></motion.div>
                            : <motion.div key="cp" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Copy className="w-4 h-4 text-slate-400" /></motion.div>}
                        </AnimatePresence>
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={handleDownloadPDF} disabled={!transcript || processing} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                        <Download className="w-4 h-4 text-slate-400" />
                      </motion.button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-[300px] flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      {processing ? (
                        <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6 w-full">
                          <OrbitLoader />
                          <div className="text-center">
                            <motion.p key={processingStep} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-slate-600 text-sm font-medium">{STEPS[processingStep]}</motion.p>
                            <p className="text-slate-400 text-xs mt-1.5">Please wait...</p>
                          </div>
                          <div className="w-full max-w-xs bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full" animate={{ width: `${((processingStep + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.5 }} />
                          </div>
                        </motion.div>
                      ) : transcript ? (
                        <motion.div key="tx" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full">
                          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
                              <motion.div className="w-1.5 h-1.5 rounded-full bg-emerald-500" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                              <span className="text-emerald-600 text-xs font-medium">Transcription Complete</span>
                            </div>
                            <div className="ml-auto text-xs text-slate-400 flex items-center gap-1.5">
                              <FileText className="w-3 h-3" />{wordCount} words
                            </div>
                          </div>
                          <div className="max-h-[340px] overflow-y-auto pr-1 custom-scroll">
                            <TypewriterText text={transcript} />
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5">
                          <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                            <WaveformBars active={false} count={16} />
                          </div>
                          <div className="text-center">
                            <p className="text-slate-400 text-sm font-semibold">Awaiting Signal</p>
                            <p className="text-slate-300 text-xs mt-1.5 max-w-[200px]">Transcription will appear here after analysis</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Card>
              </div>
            </motion.div>

          ) : (
            /* HISTORY VIEW — only reachable when logged in */
            <motion.div key="histview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <div className="flex items-center justify-between mb-7">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Transcript History</h2>
                  <p className="text-slate-400 text-sm mt-1">{history.length} transcript{history.length !== 1 ? "s" : ""} stored in MongoDB</p>
                </div>
                {history.length > 0 && (
                  <Btn variant="danger" onClick={handleClearAll}>
                    <Trash2 className="w-4 h-4" /> Clear All
                  </Btn>
                )}
              </div>

              {historyLoading ? (
                <div className="flex items-center justify-center py-20"><OrbitLoader /></div>
              ) : history.length === 0 ? (
                <Card className="p-20 text-center" hover={false}>
                  <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: 3, repeat: Infinity }} className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-5">
                    <History className="w-7 h-7 text-slate-300" />
                  </motion.div>
                  <p className="text-slate-500 font-semibold">No transcripts yet</p>
                  <p className="text-slate-400 text-sm mt-2">Go to Studio and analyze audio to create transcripts</p>
                  <Btn onClick={() => setView("studio")} className="mt-6 mx-auto">
                    <Zap className="w-4 h-4" /> Open Studio
                  </Btn>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  <AnimatePresence>
                    {history.map((item, i) => (
                      <HistoryCard key={item._id} item={item} index={i} onDelete={() => handleDeleteHistory(item._id)} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.5); }
      `}</style>
    </div>
  );
}

// -----------------------------------------------------------
// ROOT
// -----------------------------------------------------------
export default function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("voiceintel_token");
    const stored = localStorage.getItem("voiceintel_user");
    if (token && stored) {
      try { return { ...JSON.parse(stored), token }; } catch {}
    }
    return null;
  });

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginReason, setLoginReason] = useState("analyze");

  const handleShowLogin = (reason = "analyze") => {
    setLoginReason(reason);
    setShowLoginModal(true);
  };

  const handleAuth = (userData) => {
    setUser(userData);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("voiceintel_token");
    localStorage.removeItem("voiceintel_user");
    setUser(null);
  };

  return (
    <>
      <MainApp user={user} onLogout={handleLogout} onShowLogin={handleShowLogin} />
      <AnimatePresence>
        {showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            onAuth={handleAuth}
            reason={loginReason}
          />
        )}
      </AnimatePresence>
    </>
  );
}