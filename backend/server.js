
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const dns = require("dns");

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: "https://voiceintel.netlify.app",
}));
app.use(express.json());

// ── MAILER (Gmail SMTP) ──────────────────────────────────────
// SMTP_USER = your gmail address
// SMTP_PASS = a Gmail "App Password" (NOT your real gmail password)
// How to get an App Password:
//   1. Turn on 2-Step Verification on your Google account
//   2. Go to https://myaccount.google.com/apppasswords
//   3. Create one for "Mail" -> copy the 16-character password into .env
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  lookup: (hostname, options, callback) => {
    dns.lookup(hostname, { family: 4 }, callback);
  },
});

function otpEmailHtml(code, purpose) {
  const heading = purpose === "reset" ? "Reset your password" : "Verify your email";
  const subtext =
    purpose === "reset"
      ? "Use the code below to reset your VoiceIntel AI password."
      : "Use the code below to verify your VoiceIntel AI account.";

  return `
  <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 420px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
    <div style="text-align:center; margin-bottom: 24px;">
      <div style="display:inline-block; width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg,#6366f1,#0ea5e9);"></div>
      <p style="font-weight:700; font-size:16px; color:#1e293b; margin:10px 0 0;">VoiceIntel AI</p>
    </div>
    <h2 style="color:#1e293b; font-size:20px; text-align:center; margin-bottom:8px;">${heading}</h2>
    <p style="color:#64748b; font-size:14px; text-align:center; margin-bottom:28px;">${subtext}</p>
    <div style="background:#f1f5f9; border-radius:16px; padding:20px; text-align:center; margin-bottom:24px;">
      <span style="font-size:32px; font-weight:700; letter-spacing:8px; color:#4f46e5;">${code}</span>
    </div>
    <p style="color:#94a3b8; font-size:12px; text-align:center;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
  </div>`;
}

async function sendOtpEmail(email, code, purpose = "verify") {
  const subject =
    purpose === "reset"
      ? "Your VoiceIntel AI password reset code"
      : "Your VoiceIntel AI verification code";

  await transporter.sendMail({
    from: `"VoiceIntel AI" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    html: otpEmailHtml(code, purpose),
  });
}

// ── MongoDB ─────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("Mongo error:", err));

// ── Schemas ─────────────────────────────────────────────────

// How long an UNVERIFIED account is allowed to exist before it's wiped.
// Matches the OTP expiry window (10 minutes) per product decision.
const UNVERIFIED_TTL_SECONDS = 10 * 60; // 10 minutes

// User
// NOTE: isVerified defaults to true so that any users created BEFORE this
// change are automatically grandfathered in and don't get locked out.
// Only the /auth/register route explicitly sets isVerified: false on creation.
//
// unverifiedExpiresAt is ONLY set on unverified accounts (register route).
// A Mongo TTL index watches this field and auto-deletes the document once
// it's in the past — so an account that never completes OTP verification
// within 10 minutes is wiped automatically, no cron job needed. Verified
// accounts never have this field set, so they're never touched by the TTL.
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: true },
  unverifiedExpiresAt: { type: Date, default: undefined },
  createdAt: { type: Date, default: Date.now },
});
// expireAfterSeconds: 0 means "delete exactly at the timestamp stored in
// the field" (the field itself already encodes the future expiry time).
userSchema.index({ unverifiedExpiresAt: 1 }, { expireAfterSeconds: 0 });
const User = mongoose.model("User", userSchema);

// Audio (now with userId reference)
const audioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  filename: { type: String, default: "recording" },
  transcription: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Audio = mongoose.model("Audio", audioSchema);

// OTP — used for both email verification and password reset
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  codeHash: { type: String, required: true },
  purpose: { type: String, enum: ["verify", "reset"], required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  lastSentAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});
const Otp = mongoose.model("Otp", otpSchema);

// ── JWT helpers ─────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "voiceintel_super_secret_change_this";

function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
}

// Auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorised" });
  }
  try {
    const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ── OTP helpers ─────────────────────────────────────────────
const OTP_TTL_MS = 10 * 60 * 1000;       // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 45 * 1000; // 45 seconds between resends
const OTP_MAX_ATTEMPTS = 5;

function generateOtpCode() {
  // 6-digit numeric code, zero-padded
  return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
}

function hashOtp(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// Creates (or replaces) an OTP for an email+purpose, emails it, returns nothing sensitive.
async function issueOtp(email, purpose) {
  const normalized = email.toLowerCase().trim();

  // Enforce resend cooldown if a recent unexpired OTP exists for this purpose
  const existing = await Otp.findOne({ email: normalized, purpose });
  if (existing && Date.now() - existing.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - existing.lastSentAt.getTime())) / 1000);
    const err = new Error("cooldown");
    err.code = "COOLDOWN";
    err.waitSec = waitSec;
    throw err;
  }

  const code = generateOtpCode();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await Otp.findOneAndUpdate(
    { email: normalized, purpose },
    { codeHash, expiresAt, attempts: 0, lastSentAt: new Date() },
    { upsert: true, new: true }
  );

  await sendOtpEmail(normalized, code, purpose);
}

// Verifies a code for email+purpose. Throws with a `.code` on failure.
// On success, deletes the OTP (single-use) and returns true.
async function verifyOtp(email, purpose, code) {
  const normalized = email.toLowerCase().trim();
  const record = await Otp.findOne({ email: normalized, purpose });

  if (!record) {
    const err = new Error("No OTP requested for this email");
    err.code = "NOT_FOUND";
    throw err;
  }
  if (record.expiresAt.getTime() < Date.now()) {
    await record.deleteOne();
    const err = new Error("Code expired, please request a new one");
    err.code = "EXPIRED";
    throw err;
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await record.deleteOne();
    const err = new Error("Too many incorrect attempts, please request a new code");
    err.code = "LOCKED";
    throw err;
  }

  const isMatch = record.codeHash === hashOtp(String(code).trim());
  if (!isMatch) {
    record.attempts += 1;
    await record.save();
    const err = new Error("Incorrect code");
    err.code = "INVALID";
    err.attemptsLeft = OTP_MAX_ATTEMPTS - record.attempts;
    throw err;
  }

  await record.deleteOne();
  return true;
}

// ── Multer ──────────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage() });

// ── Health check ────────────────────────────────────────────
app.get("/", (req, res) => res.send("VoiceIntel backend running"));

// ── AUTH ROUTES ─────────────────────────────────────────────

// Register — creates an UNVERIFIED user and emails an OTP. No token yet.
//
// If an unverified record already exists for this email (e.g. they started
// signing up before but never finished, and the TTL hasn't swept it yet),
// we silently delete the stale record + its OTP and start fresh, per
// product decision. A VERIFIED existing account still blocks registration.
app.post("/auth/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  const normalized = email.toLowerCase().trim();

  try {
    const existing = await User.findOne({ email: normalized });
    if (existing) {
      if (existing.isVerified) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }
      // Stale/incomplete unverified signup — wipe it and any pending OTP,
      // then fall through to create a brand new one below.
      await User.deleteOne({ _id: existing._id });
      await Otp.deleteMany({ email: normalized, purpose: "verify" });
    }

    const hashed = await bcrypt.hash(password, 12);
    await User.create({
      email: normalized,
      password: hashed,
      isVerified: false,
      unverifiedExpiresAt: new Date(Date.now() + UNVERIFIED_TTL_SECONDS * 1000),
    });

    await issueOtp(normalized, "verify");

    res.status(201).json({ message: "Verification code sent to your email", email: normalized });
  } catch (err) {
    if (err.code === "COOLDOWN") {
      return res.status(429).json({ error: `Please wait ${err.waitSec}s before requesting another code` });
    }
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Verify OTP after registration -> marks verified, returns token
app.post("/auth/verify-otp", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: "Email and code required" });

  const normalized = email.toLowerCase().trim();

  try {
    await verifyOtp(normalized, "verify", code);

    // Mark verified AND clear the TTL field so the account is no longer
    // subject to auto-expiry — it's a permanent account from here on.
    const user = await User.findOneAndUpdate(
      { email: normalized },
      { isVerified: true, $unset: { unverifiedExpiresAt: "" } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "Account not found" });

    const token = signToken(user._id);
    res.json({ token, email: user.email, id: user._id });
  } catch (err) {
    if (["NOT_FOUND", "EXPIRED", "LOCKED", "INVALID"].includes(err.code)) {
      return res.status(400).json({ error: err.message, attemptsLeft: err.attemptsLeft });
    }
    console.error(err);
    res.status(500).json({ error: "Verification failed" });
  }
});

// Resend OTP (works for both "verify" and "reset" purposes)
app.post("/auth/resend-otp", async (req, res) => {
  const { email, purpose } = req.body;
  if (!email || !purpose) return res.status(400).json({ error: "Email and purpose required" });
  if (!["verify", "reset"].includes(purpose)) return res.status(400).json({ error: "Invalid purpose" });

  const normalized = email.toLowerCase().trim();

  try {
    // For "reset" we don't want to reveal whether the account exists,
    // but for "verify" the account must exist (it was just created).
    if (purpose === "verify") {
      const user = await User.findOne({ email: normalized });
      if (!user) return res.status(404).json({ error: "Account not found" });
      if (user.isVerified) return res.status(400).json({ error: "Account already verified" });
    }

    await issueOtp(normalized, purpose);
    res.json({ message: "Code resent" });
  } catch (err) {
    if (err.code === "COOLDOWN") {
      return res.status(429).json({ error: `Please wait ${err.waitSec}s before requesting another code` });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to resend code" });
  }
});

// Login
//
// Verified users: straight in with email + password, no OTP, ever.
// Unverified users (still inside the 10-min TTL window): blocked. We do
// NOT auto re-send an OTP here anymore — the account is mid-signup, still
// ticking down, and will either get verified or get wiped by the TTL. The
// only way to (re)trigger an OTP is back through registration.
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const normalized = email.toLowerCase().trim();

  try {
    const user = await User.findOne({ email: normalized });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    if (!user.isVerified) {
      // Mid-signup account that hasn't been swept by the TTL yet.
      // Don't resend an OTP automatically — send them back to finish signup.
      return res.status(403).json({
        error: "This account hasn't finished signing up yet. Please complete registration again.",
        needsRegistration: true,
        email: normalized,
      });
    }

    const token = signToken(user._id);
    res.json({ token, email: user.email, id: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/auth/check-email", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    res.json({ exists: !!existing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Check failed" });
  }
});

// ── FORGOT / RESET PASSWORD ─────────────────────────────────

// Step 1: request a reset code. Always responds the same way whether or
// not the account exists, so we don't leak which emails are registered.
app.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const normalized = email.toLowerCase().trim();
  const genericResponse = { message: "If an account exists for this email, a reset code has been sent." };

  try {
    const user = await User.findOne({ email: normalized });
    // Only send a reset code for verified accounts. An unverified account
    // has no usable password flow yet (it should finish registration), so
    // we deliberately skip issuing here too — response stays generic either way.
    if (user && user.isVerified) {
      await issueOtp(normalized, "reset");
    }
    res.json(genericResponse);
  } catch (err) {
    if (err.code === "COOLDOWN") {
      // Still avoid leaking existence; just ask them to wait.
      return res.status(429).json({ error: `Please wait ${err.waitSec}s before requesting another code` });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// Step 2: verify reset code + set new password -> auto-login (unchanged)
app.post("/auth/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.status(400).json({ error: "Email, code, and new password required" });
  if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  const normalized = email.toLowerCase().trim();

  try {
    await verifyOtp(normalized, "reset", code);

    const hashed = await bcrypt.hash(newPassword, 12);
    const user = await User.findOneAndUpdate(
      { email: normalized },
      { password: hashed },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "Account not found" });

    const token = signToken(user._id);
    res.json({ token, email: user.email, id: user._id, message: "Password updated" });
  } catch (err) {
    if (["NOT_FOUND", "EXPIRED", "LOCKED", "INVALID"].includes(err.code)) {
      return res.status(400).json({ error: err.message, attemptsLeft: err.attemptsLeft });
    }
    console.error(err);
    res.status(500).json({ error: "Password reset failed" });
  }
});

// ── TRANSCRIPTION ROUTE ─────────────────────────────────────

app.post("/upload", auth, upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file received" });

    const response = await axios.post(
      "https://api.deepgram.com/v1/listen",
      req.file.buffer,
      {
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          "Content-Type": req.file.mimetype,
        },
      }
    );

    const transcriptionText =
      response.data.results.channels[0].alternatives[0].transcript;

    res.json({ transcription: transcriptionText });
  } catch (error) {
    console.error(error?.response?.data || error.message);
    res.status(500).json({ error: "Speech recognition failed" });
  }
});

// ── HISTORY ROUTES ──────────────────────────────────────────

// Save transcript (called after AI formatting in frontend)
app.post("/history/save", auth, async (req, res) => {
  const { transcription, filename } = req.body;
  if (!transcription) return res.status(400).json({ error: "No transcription provided" });

  try {
    const entry = await Audio.create({
      userId: req.userId,
      transcription,
      filename: filename || "recording",
    });
    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save transcript" });
  }
});

// Get history for the logged-in user
app.get("/history", auth, async (req, res) => {
  try {
    const history = await Audio.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// Delete one transcript
app.delete("/delete/:id", auth, async (req, res) => {
  try {
    const entry = await Audio.findOne({ _id: req.params.id, userId: req.userId });
    if (!entry) return res.status(404).json({ error: "Not found" });
    await entry.deleteOne();
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// Clear all transcripts for user
app.delete("/history/clear", auth, async (req, res) => {
  try {
    await Audio.deleteMany({ userId: req.userId });
    res.json({ message: "All transcripts cleared" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Clear failed" });
  }
});

// ── Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
