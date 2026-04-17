// Zim Bot — Express Server
const express = require('express');
const cors = require('cors');
const path = require('path');
const { loadKnowledge } = require('./knowledge');
const { TfIdfEngine } = require('./tfidf');
const { buildResponse, detectModule } = require('./responder');

const PORT = 3600;
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Initialize knowledge base and search engine
const chunks = loadKnowledge();
const engine = new TfIdfEngine();
engine.buildIndex(chunks);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, chunks: chunks.length });
});

// Chat endpoint
app.post('/api/chat', (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'Please provide a question' });
  }

  const q = question.trim();
  console.log(`[Zim] Q: "${q}"`);

  // Detect which module the question is about
  const module = detectModule(q);
  console.log(`[Zim] Detected module: ${module || 'auto (both)'}`);

  // Search within the detected module only
  const results = engine.search(q, 3, 0.03, module);

  // If no results in detected module, try broader search
  let finalResults = results;
  if (results.length === 0 && module) {
    console.log(`[Zim] No results in ${module}, trying broad search...`);
    finalResults = engine.search(q, 3, 0.03, null);
  }

  const response = buildResponse(q, finalResults);
  console.log(`[Zim] Found ${finalResults.length} results, sources: ${response.sources.join(', ') || 'none'}`);
  res.json(response);
});

// Topic hints for quick-start buttons
app.get('/api/topics', (_req, res) => {
  res.json([
    { label: 'How to add a new employee?', icon: '👤' },
    { label: 'How to run payroll?', icon: '💰' },
    { label: 'PF & ESI configuration', icon: '📋' },
    { label: 'Leave encashment setup', icon: '🏖️' },
    { label: 'Full & Final process', icon: '📄' },
    { label: 'Approval workflows setup', icon: '✅' },
    { label: 'Salary structure configuration', icon: '🏗️' },
    { label: 'Shift and attendance setup', icon: '⏰' },
  ]);
});

// Serve frontend
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🤖 Zim Bot is live at http://localhost:${PORT}\n`);
});
