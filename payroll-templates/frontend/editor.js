/**
 * Payslip Editor — Main JS
 * Handles code editing, live preview, AI chat, slug panel, undo/redo
 */

const API = '';
let templateId = null;
let templateData = null;
let sampleData = null;
let slugCategories = null;
let undoStack = [];
let redoStack = [];
let lastSavedHtml = '';

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  templateId = parseInt(params.get('id'));
  if (!templateId) {
    window.location.href = '/';
    return;
  }

  initResizeHandle();
  loadTemplate();
  loadSlugs();
  loadSampleData();
  setupCodeEditor();
});

async function loadTemplate() {
  try {
    const res = await fetch(`${API}/api/templates/${templateId}`);
    const data = await res.json();
    if (!data.success) throw new Error('Template not found');
    templateData = data.template;
    document.getElementById('templateName').textContent = templateData.template_name;
    document.title = `Editor — ${templateData.template_name}`;

    const editor = document.getElementById('codeEditor');
    editor.value = templateData.template_html;
    lastSavedHtml = templateData.template_html;
    pushUndo(templateData.template_html);
    updateLineNumbers();
    updatePreview();
  } catch (err) {
    showToast('Failed to load template', 'error');
  }
}

async function loadSlugs() {
  try {
    const res = await fetch(`${API}/api/slugs`);
    const data = await res.json();
    if (data.success) {
      slugCategories = data.categories;
      renderSlugPanel();
    }
  } catch (err) {
    console.error('Failed to load slugs:', err);
  }
}

async function loadSampleData() {
  try {
    const res = await fetch(`${API}/api/sample-data`);
    const data = await res.json();
    if (data.success) sampleData = data.data;
  } catch (err) {
    console.error('Failed to load sample data:', err);
  }
}

// ═══════════════════════════════════════
// CODE EDITOR
// ═══════════════════════════════════════
function setupCodeEditor() {
  const editor = document.getElementById('codeEditor');

  editor.addEventListener('input', () => {
    updateLineNumbers();
    updatePreview();
  });

  editor.addEventListener('scroll', () => {
    document.getElementById('lineNumbers').scrollTop = editor.scrollTop;
  });

  // Tab support
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
      editor.selectionStart = editor.selectionEnd = start + 2;
      updateLineNumbers();
    }
    // Ctrl+S to save
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveTemplate();
    }
    // Ctrl+Z undo
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undoChange();
    }
    // Ctrl+Shift+Z redo
    if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
      e.preventDefault();
      redoChange();
    }
  });

  // Save undo state on blur
  editor.addEventListener('blur', () => {
    pushUndo(editor.value);
  });
}

function updateLineNumbers() {
  const editor = document.getElementById('codeEditor');
  const lines = editor.value.split('\n').length;
  const nums = document.getElementById('lineNumbers');
  nums.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
}

function formatCode() {
  const editor = document.getElementById('codeEditor');
  let html = editor.value;
  // Simple formatting: add newlines after closing tags
  html = html.replace(/>\s*</g, '>\n<');
  // Indent
  let indent = 0;
  const lines = html.split('\n');
  const formatted = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('</')) indent = Math.max(0, indent - 1);
    const indented = '  '.repeat(indent) + trimmed;
    if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.startsWith('<!') &&
        !trimmed.endsWith('/>') && !trimmed.includes('</') && !trimmed.startsWith('<br') &&
        !trimmed.startsWith('<img') && !trimmed.startsWith('<input') && !trimmed.startsWith('<hr')) {
      indent++;
    }
    return indented;
  });
  editor.value = formatted.join('\n');
  pushUndo(editor.value);
  updateLineNumbers();
  updatePreview();
  showToast('Code formatted', 'info');
}

// ═══════════════════════════════════════
// UNDO / REDO
// ═══════════════════════════════════════
function pushUndo(html) {
  if (undoStack.length > 0 && undoStack[undoStack.length - 1] === html) return;
  undoStack.push(html);
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
}

function undoChange() {
  if (undoStack.length <= 1) return;
  const current = undoStack.pop();
  redoStack.push(current);
  const prev = undoStack[undoStack.length - 1];
  document.getElementById('codeEditor').value = prev;
  updateLineNumbers();
  updatePreview();
  showToast('Undo', 'info');
}

function redoChange() {
  if (redoStack.length === 0) return;
  const next = redoStack.pop();
  undoStack.push(next);
  document.getElementById('codeEditor').value = next;
  updateLineNumbers();
  updatePreview();
  showToast('Redo', 'info');
}

// ═══════════════════════════════════════
// PREVIEW
// ═══════════════════════════════════════
function updatePreview() {
  const editor = document.getElementById('codeEditor');
  const mode = document.getElementById('previewMode').value;
  const iframe = document.getElementById('previewFrame');

  let html = editor.value;
  if (mode === 'sample' && sampleData) {
    html = renderWithSampleData(html, sampleData);
  }

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
}

function renderWithSampleData(html, data) {
  let result = html;

  // Remove {{#each ...}} and {{/each}} blocks — replace with sample rows
  // Handle earnings loop
  result = result.replace(/\{\{#each\s+new_obj\.earnings\}\}([\s\S]*?)\{\{\/each\}\}/gi, (match, template) => {
    return (data.new_obj?.earnings || []).map(item => {
      let row = template;
      for (const [key, val] of Object.entries(item)) {
        row = row.replace(new RegExp(`\\{\\{this\\.${key}\\}\\}`, 'g'), val || '');
      }
      return row;
    }).join('');
  });

  // Handle deductions loop
  result = result.replace(/\{\{#each\s+new_obj\.deductions\}\}([\s\S]*?)\{\{\/each\}\}/gi, (match, template) => {
    return (data.new_obj?.deductions || []).map(item => {
      let row = template;
      for (const [key, val] of Object.entries(item)) {
        row = row.replace(new RegExp(`\\{\\{this\\.${key}\\}\\}`, 'g'), val || '');
      }
      return row;
    }).join('');
  });

  // Handle compliance loop
  result = result.replace(/\{\{#each\s+new_obj\.compliance\}\}([\s\S]*?)\{\{\/each\}\}/gi, (match, template) => {
    return (data.new_obj?.compliance || []).map(item => {
      let row = template;
      for (const [key, val] of Object.entries(item)) {
        row = row.replace(new RegExp(`\\{\\{this\\.${key}\\}\\}`, 'g'), val || '');
      }
      return row;
    }).join('');
  });

  // Handle reimbursement loop
  result = result.replace(/\{\{#each\s+new_obj\.reimbursment\}\}([\s\S]*?)\{\{\/each\}\}/gi, (match, template) => {
    return (data.new_obj?.reimbursment || []).map(item => {
      let row = template;
      for (const [key, val] of Object.entries(item)) {
        row = row.replace(new RegExp(`\\{\\{this\\.${key}\\}\\}`, 'g'), val || '');
      }
      return row;
    }).join('');
  });

  // Handle leave_arr loop
  result = result.replace(/\{\{#each\s+new_obj\.leave_arr\}\}([\s\S]*?)\{\{\/each\}\}/gi, (match, template) => {
    return (data.new_obj?.leave_arr || []).map(item => {
      let row = template;
      for (const [key, val] of Object.entries(item)) {
        row = row.replace(new RegExp(`\\{\\{this\\.${key}\\}\\}`, 'g'), val || '');
      }
      return row;
    }).join('');
  });

  // Handle expenses loop
  result = result.replace(/\{\{#each\s+new_obj\.expenses\}\}([\s\S]*?)\{\{\/each\}\}/gi, () => '');

  // Handle pf_details loop
  result = result.replace(/\{\{#each\s+new_obj\.pf_details\}\}([\s\S]*?)\{\{\/each\}\}/gi, (match, template) => {
    return (data.new_obj?.pf_details || []).map(item => {
      let row = template;
      for (const [key, val] of Object.entries(item)) {
        row = row.replace(new RegExp(`\\{\\{this\\.${key}\\}\\}`, 'g'), val || '');
      }
      return row;
    }).join('');
  });

  // Handle missed heads loops
  result = result.replace(/\{\{#each\s+MISS_HEADS\.\w+\}\}([\s\S]*?)\{\{\/each\}\}/gi, () => '');

  // Any remaining #each blocks
  result = result.replace(/\{\{#each\s+[^}]+\}\}([\s\S]*?)\{\{\/each\}\}/gi, () => '');

  // Replace simple variables: {{single.xxx}}
  result = result.replace(/\{\{single\.(\w+)\}\}/g, (match, key) => {
    return data.single?.[key] || match;
  });

  // Replace {{org_details.xxx}}
  result = result.replace(/\{\{org_details\.(\w+)\}\}/g, (match, key) => {
    return data.org_details?.[key] || match;
  });

  // Replace {{new_obj.xxx}} (non-nested)
  result = result.replace(/\{\{new_obj\.(\w+)\}\}/g, (match, key) => {
    const val = data.new_obj?.[key];
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val);
    return match;
  });

  // Replace {{new_obj.profession_tax.xxx}} etc.
  result = result.replace(/\{\{new_obj\.(\w+)\.(\w+)\}\}/g, (match, obj, key) => {
    return data.new_obj?.[obj]?.[key] || match;
  });

  // Replace {{loan_emi.xxx}}
  result = result.replace(/\{\{loan_emi\.(\w+)\}\}/g, (match, key) => {
    return data.loan_emi?.[key] || match;
  });

  // Replace {{yearly_earning_total.xxx}}
  result = result.replace(/\{\{yearly_earning_total\.(\w+)\}\}/g, (match, key) => {
    return data.yearly_earning_total?.[key] || match;
  });

  // Replace {{detailedOt.xxx}}
  result = result.replace(/\{\{detailedOt\.(\w+)\}\}/g, (match, key) => {
    return data.detailedOt?.[key] || match;
  });

  // Replace top-level vars: {{month}}, {{year}}, etc.
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (data[key] !== undefined && typeof data[key] === 'string') return data[key];
    return match;
  });

  // Replace logo URL
  result = result.replace(/\{\{hrms_logo_url\}\}/g, data.hrms_logo_url || '');

  return result;
}

function runPreview() {
  const editor = document.getElementById('codeEditor');
  if (!sampleData) {
    showToast('Sample data not loaded yet', 'error');
    return;
  }

  const html = renderWithSampleData(editor.value, sampleData);

  // Open full preview modal
  const overlay = document.getElementById('fullPreviewOverlay');
  const iframe = document.getElementById('fullPreviewFrame');
  overlay.classList.add('open');

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
}

function closeFullPreview() {
  document.getElementById('fullPreviewOverlay').classList.remove('open');
}

// ═══════════════════════════════════════
// SAVE
// ═══════════════════════════════════════
async function saveTemplate() {
  const editor = document.getElementById('codeEditor');
  try {
    const res = await fetch(`${API}/api/templates/${templateId}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_html: editor.value }),
    });
    const data = await res.json();
    if (data.success) {
      lastSavedHtml = editor.value;
      showToast('Template saved successfully!', 'success');
    } else {
      showToast('Failed to save: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('Failed to save template', 'error');
  }
}

// ═══════════════════════════════════════
// AI CHAT
// ═══════════════════════════════════════
function toggleAIPanel() {
  document.getElementById('aiPanel').classList.toggle('collapsed');
}

async function sendAICommand() {
  const input = document.getElementById('aiInput');
  const command = input.value.trim();
  if (!command) return;

  const editor = document.getElementById('codeEditor');
  const chat = document.getElementById('aiChat');

  // Add user message
  appendChatMsg(command, 'user');
  input.value = '';

  try {
    const res = await fetch(`${API}/api/ai/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: templateId,
        command,
        template_html: editor.value,
      }),
    });
    const data = await res.json();

    if (data.success && data.action === 'undo') {
      undoChange();
      appendChatMsg('Reverted to previous state.', 'assistant');
    } else if (data.success) {
      pushUndo(editor.value);
      editor.value = data.html;
      updateLineNumbers();
      updatePreview();
      appendChatMsg(`Done! ${data.description}`, 'assistant');
    } else {
      appendChatMsg(data.error, 'error');
    }
  } catch (err) {
    appendChatMsg('Failed to process command. Please try again.', 'error');
  }
}

function appendChatMsg(text, type) {
  const chat = document.getElementById('aiChat');
  const msg = document.createElement('div');
  msg.className = `ai-msg ai-msg-${type}`;
  if (type === 'user') {
    msg.innerHTML = `<strong>You:</strong> ${escapeHtml(text)}`;
  } else if (type === 'assistant') {
    msg.innerHTML = `<strong>AI:</strong> ${escapeHtml(text)}`;
  } else if (type === 'error') {
    msg.innerHTML = `<strong>AI:</strong> ${escapeHtml(text)}`;
  }
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

function useExample(el) {
  document.getElementById('aiInput').value = el.textContent;
  document.getElementById('aiInput').focus();
}

// ═══════════════════════════════════════
// SLUG PANEL
// ═══════════════════════════════════════
function toggleSlugPanel() {
  document.getElementById('slugPanel').classList.toggle('open');
  document.getElementById('slugOverlay').classList.toggle('open');
}

function renderSlugPanel() {
  if (!slugCategories) return;
  const body = document.getElementById('slugPanelBody');
  let html = '';

  for (const [key, cat] of Object.entries(slugCategories)) {
    html += `<div class="slug-category" data-category="${key}">`;
    html += `<div class="slug-category-title">${cat.label}</div>`;
    for (const s of cat.slugs) {
      const escapedSlug = escapeHtml(s.slug);
      html += `<div class="slug-item" onclick="insertSlug('${escapeJs(s.slug)}')" title="Click to insert">
        <span class="slug-code">${escapedSlug}</span>
        <span class="slug-desc">${escapeHtml(s.description)}</span>
      </div>`;
    }
    html += '</div>';
  }

  body.innerHTML = html;
}

function filterSlugs() {
  const query = document.getElementById('slugSearch').value.toLowerCase();
  const items = document.querySelectorAll('.slug-item');
  const categories = document.querySelectorAll('.slug-category');

  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(query) ? '' : 'none';
  });

  // Hide empty categories
  categories.forEach(cat => {
    const visible = cat.querySelectorAll('.slug-item:not([style*="display: none"])');
    cat.style.display = visible.length > 0 ? '' : 'none';
  });
}

function insertSlug(slug) {
  const editor = document.getElementById('codeEditor');
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  editor.value = editor.value.substring(0, start) + slug + editor.value.substring(end);
  editor.selectionStart = editor.selectionEnd = start + slug.length;
  editor.focus();
  updateLineNumbers();
  updatePreview();
  showToast(`Inserted: ${slug}`, 'info');
}

// ═══════════════════════════════════════
// RESIZE HANDLE
// ═══════════════════════════════════════
function initResizeHandle() {
  const handle = document.getElementById('resizeHandle');
  const codePanel = document.getElementById('codePanel');
  let isResizing = false;

  handle.addEventListener('mousedown', (e) => {
    isResizing = true;
    handle.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const newWidth = e.clientX;
    const minW = 300;
    const maxW = window.innerWidth - 300;
    if (newWidth >= minW && newWidth <= maxW) {
      codePanel.style.width = newWidth + 'px';
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      handle.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

// ═══════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════
function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeJs(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}
