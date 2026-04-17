// Zim Bot — Frontend Chat Logic
const API_BASE = window.location.origin;

const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const topicHints = document.getElementById('topicHints');
const hintsContainer = document.getElementById('hintsContainer');

let isWaiting = false;

// Format time
function timeNow() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Simple markdown to HTML (bold, italic, bullet points, hr, code)
function md(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

// Add a message bubble
function addMessage(content, type) {
  const msg = document.createElement('div');
  msg.className = `message ${type}`;

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = type === 'bot' ? 'Z' : 'Y';

  const contentWrap = document.createElement('div');
  contentWrap.className = 'message-content';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = type === 'bot' ? `<p>${md(content)}</p>` : `<p>${escapeHtml(content)}</p>`;

  const time = document.createElement('span');
  time.className = 'message-time';
  time.textContent = timeNow();

  contentWrap.appendChild(bubble);
  contentWrap.appendChild(time);
  msg.appendChild(avatar);
  msg.appendChild(contentWrap);
  chatMessages.appendChild(msg);
  scrollToBottom();

  return msg;
}

// Add typing indicator
function showTyping() {
  const msg = document.createElement('div');
  msg.className = 'message bot';
  msg.id = 'typingMsg';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = 'Z';

  const contentWrap = document.createElement('div');
  contentWrap.className = 'message-content';

  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.innerHTML = '<span></span><span></span><span></span>';

  contentWrap.appendChild(indicator);
  msg.appendChild(avatar);
  msg.appendChild(contentWrap);
  chatMessages.appendChild(msg);
  scrollToBottom();
}

function hideTyping() {
  const el = document.getElementById('typingMsg');
  if (el) el.remove();
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Send message to API
async function sendMessage(question) {
  if (isWaiting || !question.trim()) return;

  isWaiting = true;
  sendBtn.disabled = true;
  chatInput.value = '';

  // Hide hints after first message
  hintsContainer.style.display = 'none';

  addMessage(question, 'user');
  showTyping();

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    const data = await res.json();
    hideTyping();

    if (data.answer) {
      addMessage(data.answer, 'bot');
    } else {
      addMessage("Sorry, I couldn't process that. Please try again.", 'bot');
    }
  } catch (err) {
    hideTyping();
    addMessage("Oops! I'm having trouble connecting. Make sure the Zim server is running on port 3600.", 'bot');
    console.error('Chat error:', err);
  }

  isWaiting = false;
  sendBtn.disabled = false;
  chatInput.focus();
}

// Load topic hints
async function loadHints() {
  try {
    const res = await fetch(`${API_BASE}/api/topics`);
    const topics = await res.json();
    topicHints.innerHTML = '';
    for (const topic of topics) {
      const btn = document.createElement('button');
      btn.className = 'hint-btn';
      btn.textContent = `${topic.icon} ${topic.label}`;
      btn.addEventListener('click', () => {
        chatInput.value = topic.label;
        sendMessage(topic.label);
      });
      topicHints.appendChild(btn);
    }
  } catch {
    // Hints are optional, fail silently
  }
}

// Event listeners
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage(chatInput.value);
});

// Enter to send, Shift+Enter for newline (input doesn't support newline anyway)
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(chatInput.value);
  }
});

// Initialize
loadHints();
