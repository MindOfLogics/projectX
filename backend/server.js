const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "data", "notes.json");

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, "../frontend")));

// Ensure data directory and file exist
function initDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]");
  }
}

// Read notes from file
function readNotes() {
  initDataFile();
  const data = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(data);
}

// Write notes to file
function writeNotes(notes) {
  initDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2));
}

// ============ API ROUTES ============

// GET all notes
app.get("/api/notes", (req, res) => {
  const notes = readNotes();
  res.json(notes);
});

// GET single note
app.get("/api/notes/:id", (req, res) => {
  const notes = readNotes();
  const note = notes.find(n => n.id === parseInt(req.params.id));
  if (!note) {
    return res.status(404).json({ error: "Note not found" });
  }
  res.json(note);
});

// POST create new note
app.post("/api/notes", (req, res) => {
  const notes = readNotes();
  const newNote = {
    id: Date.now(),
    title: req.body.title || "Untitled",
    text: req.body.text || "",
    category: req.body.category || "general",
    color: req.body.color || "#ffffff",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  notes.push(newNote);
  writeNotes(notes);
  res.status(201).json(newNote);
});

// PUT update note
app.put("/api/notes/:id", (req, res) => {
  const notes = readNotes();
  const index = notes.findIndex(n => n.id === parseInt(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: "Note not found" });
  }

  notes[index] = {
    ...notes[index],
    title: req.body.title ?? notes[index].title,
    text: req.body.text ?? notes[index].text,
    category: req.body.category ?? notes[index].category,
    color: req.body.color ?? notes[index].color,
    updatedAt: new Date().toISOString()
  };

  writeNotes(notes);
  res.json(notes[index]);
});

// DELETE note
app.delete("/api/notes/:id", (req, res) => {
  let notes = readNotes();
  const id = parseInt(req.params.id);
  const exists = notes.some(n => n.id === id);
  
  if (!exists) {
    return res.status(404).json({ error: "Note not found" });
  }

  notes = notes.filter(n => n.id !== id);
  writeNotes(notes);
  res.json({ message: "Note deleted successfully" });
});

// Search notes
app.get("/api/search", (req, res) => {
  const query = (req.query.q || "").toLowerCase();
  const notes = readNotes();
  const results = notes.filter(n => 
    n.title.toLowerCase().includes(query) || 
    n.text.toLowerCase().includes(query)
  );
  res.json(results);
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║     🚀 Neo Notes API Server           ║
  ║     Running on http://localhost:${PORT}  ║
  ╚═══════════════════════════════════════╝
  `);
});
