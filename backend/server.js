const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "data", "notes.json");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const ALLOWED_CATEGORIES = new Set(["general", "personal", "work", "ideas"]);

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

function normalizeCategory(category) {
  if (!category) return "general";
  const value = String(category).toLowerCase();
  return ALLOWED_CATEGORIES.has(value) ? value : "general";
}

function normalizeColor(color) {
  if (!color) return "#ffffff";
  return String(color);
}

function buildNotePayload(payload = {}) {
  return {
    title: typeof payload.title === "string" && payload.title.trim()
      ? payload.title.trim()
      : "Untitled",
    text: typeof payload.text === "string" ? payload.text.trim() : "",
    category: normalizeCategory(payload.category),
    color: normalizeColor(payload.color)
  };
}

function addNote(payload) {
  const notes = readNotes();
  const basePayload = buildNotePayload(payload);
  const newNote = {
    id: Date.now(),
    ...basePayload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  notes.push(newNote);
  writeNotes(notes);
  return newNote;
}

function getNoteById(id) {
  const notes = readNotes();
  return notes.find(n => n.id === id);
}

function updateNoteById(id, updates = {}) {
  const notes = readNotes();
  const index = notes.findIndex(n => n.id === id);
  if (index === -1) return null;

  const next = { ...notes[index] };
  if (typeof updates.title === "string") {
    next.title = updates.title.trim() || next.title;
  }
  if (typeof updates.text === "string") {
    next.text = updates.text.trim();
  }
  if (typeof updates.category !== "undefined") {
    next.category = normalizeCategory(updates.category);
  }
  if (typeof updates.color !== "undefined") {
    next.color = normalizeColor(updates.color);
  }
  next.updatedAt = new Date().toISOString();

  notes[index] = next;
  writeNotes(notes);
  return next;
}

function deleteNoteById(id) {
  const notes = readNotes();
  const nextNotes = notes.filter(n => n.id !== id);
  if (nextNotes.length === notes.length) {
    return false;
  }
  writeNotes(nextNotes);
  return true;
}

function searchNotes(query) {
  const normalized = String(query || "").toLowerCase();
  const notes = readNotes();
  return notes.filter(note =>
    note.title.toLowerCase().includes(normalized) ||
    note.text.toLowerCase().includes(normalized)
  );
}

function truncateText(text, limit = 160) {
  if (!text) return "";
  const value = String(text);
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}...`;
}

const agentTools = [
  {
    type: "function",
    function: {
      name: "list_notes",
      description: "List all notes with id, title, category, and updatedAt.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_notes",
      description: "Search notes by a keyword in title or text.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query string."
          }
        },
        required: ["query"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_note",
      description: "Create a new note.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          text: { type: "string" },
          category: {
            type: "string",
            description: "general, personal, work, or ideas."
          },
          color: { type: "string" }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_note",
      description: "Update an existing note by id.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number" },
          title: { type: "string" },
          text: { type: "string" },
          category: { type: "string" },
          color: { type: "string" }
        },
        required: ["id"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_note",
      description: "Delete a note by id.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number" }
        },
        required: ["id"],
        additionalProperties: false
      }
    }
  }
];

const agentHandlers = {
  list_notes: () => {
    const notes = readNotes();
    return notes.map(note => ({
      id: note.id,
      title: note.title,
      category: note.category,
      updatedAt: note.updatedAt,
      preview: truncateText(note.text)
    }));
  },
  search_notes: ({ query }) => {
    const results = searchNotes(query);
    return results.map(note => ({
      id: note.id,
      title: note.title,
      category: note.category,
      updatedAt: note.updatedAt,
      preview: truncateText(note.text)
    }));
  },
  create_note: (payload) => addNote(payload),
  update_note: ({ id, ...updates }) => updateNoteById(Number(id), updates),
  delete_note: ({ id }) => deleteNoteById(Number(id))
};

async function runAgent(message, history = []) {
  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const messages = [
    {
      role: "system",
      content: [
        "You are an AI assistant for a notes app.",
        "Use tools to list, search, create, update, or delete notes.",
        "If a note id is required, ask for clarification or search first.",
        "When you complete an action, explain what changed.",
        "Keep responses concise."
      ].join(" ")
    },
    ...history,
    { role: "user", content: message }
  ];

  const actions = [];

  for (let step = 0; step < 3; step += 1) {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      tools: agentTools,
      tool_choice: "auto",
      temperature: 0.2
    });

    const choice = response.choices[0].message;
    if (!choice.tool_calls || choice.tool_calls.length === 0) {
      return {
        reply: choice.content || "Done.",
        actions
      };
    }

    messages.push(choice);

    for (const toolCall of choice.tool_calls) {
      const toolName = toolCall.function.name;
      const handler = agentHandlers[toolName];
      if (!handler) {
        const errorResult = { error: `Unknown tool: ${toolName}` };
        actions.push({ tool: toolName, input: {}, result: errorResult });
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(errorResult)
        });
        continue;
      }

      let args = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch (error) {
        args = {};
      }

      const result = handler(args);
      const normalizedResult = result ?? { error: "No result" };
      actions.push({ tool: toolName, input: args, result: normalizedResult });
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(normalizedResult)
      });
    }
  }

  return {
    reply: "I couldn't complete that request. Try again with more detail.",
    actions
  };
}

// ============ API ROUTES ============

// GET all notes
app.get("/api/notes", (req, res) => {
  const notes = readNotes();
  res.json(notes);
});

// GET single note
app.get("/api/notes/:id", (req, res) => {
  const note = getNoteById(parseInt(req.params.id));
  if (!note) {
    return res.status(404).json({ error: "Note not found" });
  }
  res.json(note);
});

// POST create new note
app.post("/api/notes", (req, res) => {
  const newNote = addNote(req.body || {});
  res.status(201).json(newNote);
});

// PUT update note
app.put("/api/notes/:id", (req, res) => {
  const updated = updateNoteById(parseInt(req.params.id), req.body || {});
  if (!updated) {
    return res.status(404).json({ error: "Note not found" });
  }
  res.json(updated);
});

// DELETE note
app.delete("/api/notes/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const deleted = deleteNoteById(id);
  if (!deleted) {
    return res.status(404).json({ error: "Note not found" });
  }
  res.json({ message: "Note deleted successfully" });
});

// Search notes
app.get("/api/search", (req, res) => {
  const results = searchNotes(req.query.q || "");
  res.json(results);
});

// AI agent endpoint
app.post("/api/agent", async (req, res) => {
  const message = req.body?.message;
  const history = Array.isArray(req.body?.history)
    ? req.body.history.filter(item =>
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string"
      )
    : [];

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const result = await runAgent(message, history);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "AI agent failed." });
  }
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
