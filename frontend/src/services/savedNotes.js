// Saved Notes Service
// Manages user's saved AI answer summaries in localStorage

const STORAGE_KEY = 'flutter_saved_notes';

// Get all saved notes
export const getSavedNotes = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error reading saved notes:', e);
    return [];
  }
};

// Save a note
export const saveNote = (messageId, content, conversationTitle = '') => {
  try {
    const notes = getSavedNotes();

    // Don't duplicate
    if (notes.find(n => n.messageId === messageId)) {
      return { success: false, alreadySaved: true };
    }

    const newNote = {
      id: `note_${Date.now()}`,
      messageId,
      content,
      conversationTitle,
      savedAt: new Date().toISOString()
    };

    notes.unshift(newNote); // Add to front
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    return { success: true, note: newNote };
  } catch (e) {
    console.error('Error saving note:', e);
    return { success: false, error: e.message };
  }
};

// Remove a saved note
export const removeNote = (noteId) => {
  try {
    const notes = getSavedNotes();
    const filtered = notes.filter(n => n.id !== noteId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return { success: true };
  } catch (e) {
    console.error('Error removing note:', e);
    return { success: false, error: e.message };
  }
};

// Check if a message is already saved
export const isNoteSaved = (messageId) => {
  const notes = getSavedNotes();
  return notes.some(n => n.messageId === messageId);
};

// Get note ID by messageId
export const getNoteIdByMessageId = (messageId) => {
  const notes = getSavedNotes();
  const note = notes.find(n => n.messageId === messageId);
  return note ? note.id : null;
};
