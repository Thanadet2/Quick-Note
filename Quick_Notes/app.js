if (localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = '../Login/index.html';
}
// ==================== Quick Notes App ====================
// Simple, beautiful note-taking app
// ใช้งานได้กับ HTML/CSS/JS ธรรมดา

// ==================== State ====================
let notes = [];
let editingId = null;
let deleteId = null;
let searchTerm = '';

// Storage Keys
const STORAGE_KEY = 'quickNotes_data';
const THEME_KEY = 'quickNotes_theme';
const DRAFT_KEY = 'quickNotes_draft';

// ==================== DOM Elements ====================
const notesContainer = document.getElementById('notesContainer');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const modalOverlay = document.getElementById('modalOverlay');
const modal = document.getElementById('modal');
const quickComposer = document.getElementById('quickComposer');
const deleteModal = document.getElementById('deleteModal');
const noteForm = document.getElementById('noteForm');
const quickForm = document.getElementById('quickForm');
const noteTitle = document.getElementById('noteTitle');
const noteContent = document.getElementById('noteContent');
const charCount = document.getElementById('charCount');
const qcTitle = document.getElementById('qcTitle');
const qcContent = document.getElementById('qcContent');
const qcCount = document.getElementById('qcCount');
const themeBtn = document.getElementById('themeBtn');
const toast = document.getElementById('toast');

// ==================== Utility Functions ====================

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Format date
function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show toast notification
function showToast(message, type = 'default') {
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  
  setTimeout(() => {ฃฃ
    toast.className = 'toast';
  }, 2500);
}

// Debounce function
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ==================== Storage ====================

function loadNotes() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error loading notes:', e);
    return [];
  }
}

function saveNotes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error('Error saving notes:', e);
    showToast('ไม่สามารถบันทึกโน้ตได้', 'error');
  }
}

function saveDraft(title, content) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, content }));
  } catch (e) {}
}

function loadDraft() {
  try {
    const draft = localStorage.getItem(DRAFT_KEY);
    return draft ? JSON.parse(draft) : null;
  } catch (e) {
    return null;
  }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

// ==================== Theme ====================

function loadTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'dark') {
    document.body.classList.add('dark');
    updateThemeIcon(true);
  } else if (stored === 'light') {
    document.body.classList.remove('dark');
    updateThemeIcon(false);
  } else {
    // Use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.body.classList.add('dark');
      updateThemeIcon(true);
    }
  }
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
  const moonIcon = themeBtn.querySelector('.moon-icon');
  const sunIcon = themeBtn.querySelector('.sun-icon');
  
  if (isDark) {
    moonIcon.style.display = 'none';
    sunIcon.style.display = 'block';
  } else {
    moonIcon.style.display = 'block';
    sunIcon.style.display = 'none';
  }
}

// ==================== Render ====================

// ฟังก์ชันแสดงผล (โชว์เฉพาะของคนล็อกอิน + กรองคำค้นหา)
function render() {
    // 1. ดึงชื่อคนล็อกอินปัจจุบันออกมา
    const currentUser = localStorage.getItem('currentUserName'); 

    // 2. กรองโน้ต: ต้องเป็นของคนนี้ AND ตรงกับคำค้นหา
    const filtered = notes.filter(note => {
        // กฎข้อ 1: ถ้าไม่มีคนล็อกอิน หรือเจ้าของโน้ตไม่ตรงกับคนล็อกอิน -> ไม่ต้องโชว์
        // (หมายเหตุ: โน้ตเก่าที่ไม่มีเจ้าของจะหายไป ซึ่งปลอดภัยกว่าให้คนอื่นเห็น)
        if (note.owner !== currentUser) return false;

        // กฎข้อ 2: เช็คคำค้นหา (เหมือนเดิม)
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (note.title && note.title.toLowerCase().includes(term)) ||
            (note.content && note.content.toLowerCase().includes(term))
        );
    });

    // 3. เรียงลำดับ (ปักหมุดก่อน)
    filtered.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return (b.id || 0) - (a.id || 0); 
    });

    const container = document.getElementById('notesContainer');
    const emptyState = document.querySelector('.empty-state');

    // 4. จัดการหน้าจอว่าง
    if (filtered.length === 0 && !searchTerm) {
        if (emptyState) emptyState.style.display = 'flex';
        container.innerHTML = '';
    } else {
        if (emptyState) emptyState.style.display = 'none';

        // 5. สร้างการ์ด (ใช้ CSS ตัวใหม่ที่เพิ่งแก้)
        container.innerHTML = filtered.map(note => `
            <article class="note-card ${note.pinned ? 'pinned' : ''}" onclick="editNote('${note.id}')">
                ${note.pinned ? '<div class="pin-badge">PIN</div>' : ''}
                
                <div class="card-actions">
                    <button class="action-btn ${note.pinned ? 'pin-active' : ''}" onclick="togglePin('${note.id}', event)" title="${note.pinned ? 'เลิกปักหมุด' : 'ปักหมุด'}">
                         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"></path></svg>
                    </button>
                    <button class="action-btn edit" onclick="editNote('${note.id}', event)" title="แก้ไข">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="action-btn delete" onclick="confirmDelete('${note.id}', event)" title="ลบโน้ต">
                         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>

                <h3 class="note-title ${!note.title ? 'untitled' : ''}">
                    ${note.title ? escapeHtml(note.title) : 'ไม่มีชื่อเรื่อง'}
                </h3>
                
                <div class="note-content">
                    ${escapeHtml(note.content || '')}
                </div>
                
                <div class="note-meta">
                    แก้ไขล่าสุด: ${formatDate(note.updatedAt)}
                </div>
            </article>
        `).join('');
    }
}
// ==================== Modal Functions ====================

function openModal(id = null, event) {
  if (event) event.stopPropagation();
  
  editingId = id;
  
  if (id) {
    // Edit mode
    const note = notes.find(n => n.id === id);
    if (!note) return;
    
    document.getElementById('modalTitle').textContent = 'แก้ไขโน้ต';
    noteTitle.value = note.title || '';
    noteContent.value = note.content || '';
  } else {
    // Add mode
    document.getElementById('modalTitle').textContent = 'เพิ่มโน้ตใหม่';
    
    // Load draft
    const draft = loadDraft();
    noteTitle.value = draft?.title || '';
    noteContent.value = draft?.content || '';
  }
  
  updateCharCount();
  
  modalOverlay.hidden = false;
  modal.hidden = false;
  quickComposer.hidden = true;
  
  document.body.classList.add('no-scroll');
  
  setTimeout(() => noteTitle.focus(), 100);
}

function closeModal() {
  modalOverlay.hidden = true;
  modal.hidden = true;
  document.body.classList.remove('no-scroll');
  editingId = null;
  noteTitle.value = '';
  noteContent.value = '';
}

function updateCharCount() {
  charCount.textContent = noteContent.value.length;
}

// ==================== Quick Composer ====================

function openQuickComposer() {
  modalOverlay.hidden = false;
  quickComposer.hidden = false;
  modal.hidden = true;
  
  qcTitle.value = '';
  qcContent.value = '';
  updateQcCount();
  
  document.body.classList.add('no-scroll');
  
  setTimeout(() => qcContent.focus(), 100);
}

function closeQuickComposer() {
  modalOverlay.hidden = true;
  quickComposer.hidden = true;
  document.body.classList.remove('no-scroll');
}

function updateQcCount() {
  qcCount.textContent = qcContent.value.length + ' ตัวอักษร';
}

// ==================== Note Actions ====================

function saveNote(event) {
  event.preventDefault();
  
  const title = noteTitle.value.trim();
  const content = noteContent.value.trim();
  
  if (!title && !content) {
    showToast('กรุณาใส่หัวข้อหรือเนื้อหา', 'error');
    return;
  }
  
  const now = new Date().toISOString();
  
  if (editingId) {
    // Update existing note
    const index = notes.findIndex(n => n.id === editingId);
    if (index !== -1) {
      notes[index] = {
        ...notes[index],
        title,
        content,
        updatedAt: now
      };
    }
    showToast('บันทึกแล้ว', 'success');
  } else {
    // Create new note
    notes.unshift({
      id: generateId(),
      title,
      content,
      createdAt: now,
      updatedAt: now,
      pinned: false,
      owner: localStorage.getItem('currentUserName')
    });
    showToast('สร้างโน้ตแล้ว', 'success');
  }
  
  clearDraft();
  saveNotes();
  render();
  closeModal();
}

function saveQuickNote(event) {
  event.preventDefault();
  
  const title = qcTitle.value.trim();
  const content = qcContent.value.trim();
  
  if (!title && !content) {
    showToast('กรุณาใส่เนื้อหา', 'error');
    return;
  }
  
  const now = new Date().toISOString();
  
  notes.unshift({
    id: generateId(),
    title,
    content,
    createdAt: now,
    updatedAt: now,
    pinned: false
  });
  
  saveNotes();
  render();
  closeQuickComposer();
  showToast('สร้างโน้ตแล้ว', 'success');
}

function togglePin(id, event) {
  if (event) event.stopPropagation();
  
  const index = notes.findIndex(n => n.id === id);
  if (index !== -1) {
    notes[index].pinned = !notes[index].pinned;
    notes[index].updatedAt = new Date().toISOString();
    saveNotes();
    render();
  }
}

function requestDelete(id, event) {
  if (event) event.stopPropagation();
  deleteId = id;
  deleteModal.hidden = false;
}

function cancelDelete() {
  deleteModal.hidden = true;
  deleteId = null;
}

function confirmDelete() {
  if (deleteId) {
    notes = notes.filter(n => n.id !== deleteId);
    saveNotes();
    render();
    showToast('ลบโน้ตแล้ว', 'success');
  }
  cancelDelete();
}

// ==================== Search ====================

const handleSearch = debounce((value) => {
  searchTerm = value;
  render();
}, 250);

// ==================== Import/Export ====================

function exportNotes() {
  if (notes.length === 0) {
    showToast('ไม่มีโน้ตที่จะส่งออก', 'error');
    return;
  }
  
  const dataStr = JSON.stringify(notes, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `quick-notes-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
  showToast('ส่งออกโน้ตแล้ว', 'success');
}

function importNotes(file) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      
      if (!Array.isArray(imported)) {
        showToast('ไฟล์ไม่ถูกต้อง', 'error');
        return;
      }
      
      // Add imported notes
      notes = [...imported, ...notes];
      saveNotes();
      render();
      showToast(`นำเข้า ${imported.length} โน้ตแล้ว`, 'success');
    } catch (err) {
      showToast('ไม่สามารถอ่านไฟล์ได้', 'error');
    }
  };
  
  reader.readAsText(file);
}

// ==================== Event Listeners ====================

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  notes = loadNotes();
  loadTheme();
  render();
});

// Search
searchInput.addEventListener('input', (e) => handleSearch(e.target.value));

// Forms
noteForm.addEventListener('submit', saveNote);
quickForm.addEventListener('submit', saveQuickNote);

// Character count
noteContent.addEventListener('input', updateCharCount);
qcContent.addEventListener('input', updateQcCount);

// Draft auto-save
noteContent.addEventListener('input', debounce(() => {
  if (!editingId) {
    saveDraft(noteTitle.value, noteContent.value);
  }
}, 500));

noteTitle.addEventListener('input', debounce(() => {
  if (!editingId) {
    saveDraft(noteTitle.value, noteContent.value);
  }
}, 500));

// FABs
document.getElementById('fabAdd').addEventListener('click', () => openModal());
document.getElementById('fabQuick').addEventListener('click', openQuickComposer);

// Theme toggle
themeBtn.addEventListener('click', toggleTheme);

// Export/Import
document.getElementById('exportBtn').addEventListener('click', exportNotes);
document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importInput').click();
});
document.getElementById('importInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    importNotes(file);
    e.target.value = '';
  }
});

// Close modal on overlay click
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    closeModal();
    closeQuickComposer();
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // ESC to close modals
  if (e.key === 'Escape') {
    if (!modal.hidden) closeModal();
    if (!quickComposer.hidden) closeQuickComposer();
    if (!deleteModal.hidden) cancelDelete();
  }
  
  // Ctrl/Cmd + N for new note
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    openModal();
  }
});
  // ฟังก์ชันออกจากระบบ
  function logout() {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('currentUserName');
  window.location.href = '../Login/index.html';
}
// --- ส่วนแสดงชื่อผู้ใช้ ---
function showUserName() {
    // 1. ดึงชื่อจาก LocalStorage (ถ้าไม่มีให้ขึ้นว่า Guest)
    const currentUser = localStorage.getItem('currentUserName') || 'Guest';
    
    // 2. หาตำแหน่งกล่องที่จะใส่ชื่อ
    const displayBox = document.getElementById('userDisplay');
    
    // 3. ใส่ข้อความลงไป
    if (displayBox) {
        displayBox.textContent = `Hello, ${currentUser}`;
    }
}

// สั่งให้ทำงานทันทีเมื่อเปิดเว็บ
showUserName();
// แสดงชื่อผู้ใช้ตรงกลาง
window.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('currentUserName') || 'Guest';
    const display = document.getElementById('userDisplay');
    if (display) display.textContent = `Hello, ${user}`;
});
// --- ฟังก์ชันจัดการปุ่มกด (ลบ/แก้ไข/ปักหมุด) ---

// 1. ฟังก์ชันลบโน้ต (กดแล้วจะถามก่อนลบ)
function confirmDelete(id, event) {
    if (event) event.stopPropagation(); // ป้องกันไม่ให้การ์ดเปิดขึ้นมา
    
    if (confirm('⚠️ คุณต้องการลบโน้ตนี้ใช่ไหม?')) {
        notes = notes.filter(n => n.id !== id); // ลบออกจากรายการ
        saveNotes(); // บันทึกลงเครื่อง
        render();    // แสดงผลใหม่
    }
}

// 2. ฟังก์ชันแก้ไขโน้ต (กดรูปดินสอ)
function editNote(id, event) {
    if (event) event.stopPropagation(); // ป้องกันซ้ำซ้อน
    openModal(id); // เปิดหน้าต่างแก้ไข
}

// 3. ฟังก์ชันปักหมุด
function togglePin(id, event) {
    if (event) event.stopPropagation();
    
    const note = notes.find(n => n.id === id);
    if (note) {
        note.pinned = !note.pinned; // สลับสถานะปักหมุด
        saveNotes();
        render();
    }
}
// ==================== Login Page Edits ====================