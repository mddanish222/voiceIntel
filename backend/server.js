/*server.js*/
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: "https://voiceintel.netlify.app",
}));
app.use(express.json());

// ── MongoDB ─────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("Mongo error:", err));

// ── Schemas ─────────────────────────────────────────────────

// User
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model("User", userSchema);

// Audio (now with userId reference)
const audioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  filename: { type: String, default: "recording" },
  transcription: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Audio = mongoose.model("Audio", audioSchema);

// ── JWT helpers ─────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "voxintel_super_secret_change_this";

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

// ── Multer ──────────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage() });

// ── Health check ────────────────────────────────────────────
app.get("/", (req, res) => res.send("VoxIntel backend running"));

// ── AUTH ROUTES ─────────────────────────────────────────────

// Register
app.post("/auth/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "An account with this email already exists" });

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ email, password: hashed });

    const token = signToken(user._id);
    res.status(201).json({ token, email: user.email, id: user._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

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
