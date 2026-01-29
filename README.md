# Neo Notes 📝

A beautiful, modern notes application with separate frontend and backend architecture.

## 📁 Project Structure

```
projectX/
├── backend/              ← Server-side code
│   ├── server.js         ← Express API server
│   ├── package.json      ← Backend dependencies
│   └── data/
│       └── notes.json    ← Data storage
│
├── frontend/             ← Client-side code
│   ├── index.html        ← Main HTML page
│   ├── css/
│   │   └── style.css     ← Styles
│   └── js/
│       └── app.js        ← Frontend JavaScript
│
└── README.md
```

## ✨ Features

- ✅ **Create** notes with title and content
- ✅ **Edit** existing notes
- ✅ **Delete** notes
- ✅ **Search** notes by title or content
- ✅ **Categories** - Personal, Work, Ideas, General
- ✅ **Color coding** for notes
- ✅ **Timestamps** - see when notes were created/updated
- ✅ **Responsive** design for mobile
- ✅ **Keyboard shortcuts** (Ctrl+N for new note, Esc to close)
- ✅ **AI assistant** to add/update/delete notes (optional)

## 🚀 How to Run

### Step 1: Start the Backend

```bash
cd backend
npm install
npm start
```

Server runs at: http://localhost:3000

### Optional: Enable the AI Agent

1. Add your OpenAI key to `.env` (at the repo root):

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

2. Restart the backend server.
3. Use the **AI Assistant** box in the sidebar, or call the API directly.

### Step 2: Open the Frontend

Simply open `frontend/index.html` in your browser, OR use Live Server extension in VS Code.

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | Get all notes |
| GET | `/api/notes/:id` | Get single note |
| POST | `/api/notes` | Create new note |
| PUT | `/api/notes/:id` | Update note |
| DELETE | `/api/notes/:id` | Delete note |
| GET | `/api/search?q=term` | Search notes |
| POST | `/api/agent` | AI command interface |

## 🛠 Tech Stack

**Backend:**
- Node.js
- Express.js
- File-based JSON storage

**Frontend:**
- HTML5
- CSS3 (Modern, Dark theme)
- Vanilla JavaScript (No frameworks)
