# voiceIntel

VoiceIntel is an AI-powered speech-to-text web application that allows users to record or upload audio, convert speech into text, format transcripts with AI, and manage transcript history securely.

## 🚀 Features

- 🎤 Record audio directly from microphone
- 📁 Upload audio files (MP3, WAV, OGG, M4A, WEBM)
- 🧠 AI speech-to-text transcription using Deepgram
- ✨ AI transcript formatting and cleanup
- 🔐 User authentication (Register / Login)
- 🕒 Personal transcript history
- 🗑 Delete individual transcripts
- 🧹 Clear all history
- 📋 Copy transcript to clipboard
- 📄 Download transcript as PDF
- 📱 Responsive modern UI
- ☁️ Deployable on Netlify + Render

---

## 🛠 Tech Stack

### Frontend
- React.js
- Vite
- Tailwind CSS
- Framer Motion
- Lucide React
- jsPDF

### Backend
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT Authentication
- bcryptjs
- Multer
- Axios
- CORS

### APIs
- Deepgram API (Speech Recognition)

---

## 📂 Project Structure

```bash
voiceIntel/
│
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
