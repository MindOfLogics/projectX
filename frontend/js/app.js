// API Base URL
const API_URL = "http://localhost:3000/api";

// State
let notes = [];
let currentCategory = "all";
let selectedColor = "#ffffff";

// DOM Elements
const notesGrid = document.getElementById("notesGrid");
const emptyState = document.getElementById("emptyState");
const modalOverlay = document.getElementById("modalOverlay");
const noteForm = document.getElementById("noteForm");
const searchInput = document.getElementById("searchInput");
const noteCount = document.getElementById("noteCount");
const currentCategoryTitle = document.getElementById("currentCategory");
const aiInput = document.getElementById("aiInput");
const aiSubmit = document.getElementById("aiSubmit");
const aiResponse = document.getElementById("aiResponse");

// ============ FETCH NOTES ============
async function fetchNotes() {
  try {
    const res = await fetch(`${API_URL}/notes`);
    notes = await res.json();
    renderNotes();
    updateStats();
  } catch (error) {
    console.error("Error fetching notes:", error);
  }
}

// ============ RENDER NOTES ============
function renderNotes() {
  let filteredNotes = notes;

  // Filter by category
  if (currentCategory !== "all") {
    filteredNotes = filteredNotes.filter(n => n.category === currentCategory);
  }

  // Filter by search
  const searchTerm = searchInput.value.toLowerCase();
  if (searchTerm) {
    filteredNotes = filteredNotes.filter(n =>
      n.title.toLowerCase().includes(searchTerm) ||
      n.text.toLowerCase().includes(searchTerm)
    );
  }

  // Show/hide empty state
  if (filteredNotes.length === 0) {
    notesGrid.innerHTML = "";
    emptyState.classList.add("show");
  } else {
    emptyState.classList.remove("show");
    notesGrid.innerHTML = filteredNotes.map(note => createNoteCard(note)).join("");
  }
}

// ============ CREATE NOTE CARD ============
function createNoteCard(note) {
  const date = new Date(note.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  const categoryEmoji = {
    general: "📌",
    personal: "💜",
    work: "💼",
    ideas: "💡"
  };

  return `
    <div class="note-card" style="background: ${note.color === '#ffffff' ? 'var(--bg-card)' : note.color}20">
      <div class="note-header">
        <h3 class="note-title">${escapeHtml(note.title)}</h3>
        <div class="note-actions">
          <button class="btn-edit" onclick="editNote(${note.id})" title="Edit">✏️</button>
          <button class="btn-delete" onclick="deleteNote(${note.id})" title="Delete">🗑️</button>
        </div>
      </div>
      <p class="note-text">${escapeHtml(note.text)}</p>
      <div class="note-footer">
        <span class="note-category">${categoryEmoji[note.category] || "📌"} ${note.category}</span>
        <span class="note-date">${date}</span>
      </div>
    </div>
  `;
}

// ============ ESCAPE HTML ============
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ============ CREATE NOTE ============
async function createNote(data) {
  try {
    const res = await fetch(`${API_URL}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const newNote = await res.json();
    notes.push(newNote);
    renderNotes();
    updateStats();
  } catch (error) {
    console.error("Error creating note:", error);
  }
}

// ============ UPDATE NOTE ============
async function updateNote(id, data) {
  try {
    const res = await fetch(`${API_URL}/notes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const updatedNote = await res.json();
    const index = notes.findIndex(n => n.id === id);
    if (index !== -1) {
      notes[index] = updatedNote;
    }
    renderNotes();
  } catch (error) {
    console.error("Error updating note:", error);
  }
}

// ============ DELETE NOTE ============
async function deleteNote(id) {
  if (!confirm("Are you sure you want to delete this note?")) return;

  try {
    await fetch(`${API_URL}/notes/${id}`, { method: "DELETE" });
    notes = notes.filter(n => n.id !== id);
    renderNotes();
    updateStats();
  } catch (error) {
    console.error("Error deleting note:", error);
  }
}

// ============ EDIT NOTE ============
function editNote(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;

  document.getElementById("noteId").value = note.id;
  document.getElementById("titleInput").value = note.title;
  document.getElementById("textInput").value = note.text;
  document.getElementById("categoryInput").value = note.category;
  document.getElementById("modalTitle").textContent = "Edit Note";

  // Set color
  selectedColor = note.color;
  document.querySelectorAll(".color-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.color === selectedColor);
  });

  openModal();
}

// ============ MODAL FUNCTIONS ============
function openModal() {
  modalOverlay.classList.add("show");
}

function closeModal() {
  modalOverlay.classList.remove("show");
  resetForm();
}

function resetForm() {
  noteForm.reset();
  document.getElementById("noteId").value = "";
  document.getElementById("modalTitle").textContent = "New Note";
  selectedColor = "#ffffff";
  document.querySelectorAll(".color-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.color === "#ffffff");
  });
}

// ============ UPDATE STATS ============
function updateStats() {
  const count = notes.length;
  noteCount.textContent = `${count} note${count !== 1 ? "s" : ""}`;
}

// ============ AI COMMAND ============
function setAiStatus(message, isError = false) {
  if (!aiResponse) return;
  aiResponse.textContent = message;
  aiResponse.classList.toggle("error", isError);
}

async function runAiCommand() {
  if (!aiInput || !aiSubmit) return;
  const message = aiInput.value.trim();
  if (!message) return;

  aiSubmit.disabled = true;
  setAiStatus("Working...");

  try {
    const res = await fetch(`${API_URL}/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "AI request failed.");
    }
    setAiStatus(data.reply || "Done.");
    aiInput.value = "";
    await fetchNotes();
  } catch (error) {
    setAiStatus(error.message || "AI request failed.", true);
  } finally {
    aiSubmit.disabled = false;
  }
}

// ============ EVENT LISTENERS ============

// Form submit
noteForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("noteId").value;
  const data = {
    title: document.getElementById("titleInput").value.trim(),
    text: document.getElementById("textInput").value.trim(),
    category: document.getElementById("categoryInput").value,
    color: selectedColor
  };

  if (id) {
    await updateNote(parseInt(id), data);
  } else {
    await createNote(data);
  }

  closeModal();
});

// Category buttons
document.querySelectorAll(".cat-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentCategory = btn.dataset.category;
    currentCategoryTitle.textContent = btn.textContent;
    renderNotes();
  });
});

// Color picker
document.querySelectorAll(".color-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedColor = btn.dataset.color;
  });
});

// Search
searchInput.addEventListener("input", () => {
  renderNotes();
});

// AI command
if (aiSubmit && aiInput) {
  aiSubmit.addEventListener("click", () => {
    runAiCommand();
  });

  aiInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runAiCommand();
    }
  });
}

// Close modal on outside click
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) {
    closeModal();
  }
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Escape to close modal
  if (e.key === "Escape") {
    closeModal();
  }
  // Ctrl/Cmd + N for new note
  if ((e.ctrlKey || e.metaKey) && e.key === "n") {
    e.preventDefault();
    openModal();
  }
});

// ============ INIT ============
fetchNotes();
