// Knowledge Base Loader — reads text files and splits into chunks
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

/** Load and chunk a text file by page markers or double-newlines */
function loadFile(filename, source) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`[Knowledge] File not found: ${filepath}`);
    return [];
  }

  const raw = fs.readFileSync(filepath, 'utf-8');
  const chunks = [];

  // Split by page markers (=== PAGE N ===), section markers (=== SECTION: ... ===), or any === ... === header
  const sections = raw.split(/===\s*[^=]+\s*===/).filter(s => s.trim().length > 0);

  for (const section of sections) {
    // Skip short headers/markers
    if (section.trim().length < 40) continue;

    // Further split by double newlines into paragraphs
    const paragraphs = section.split(/\n\s*\n/).filter(p => p.trim().length > 40);

    for (const para of paragraphs) {
      const cleaned = para
        .replace(/\s+/g, ' ')
        .replace(/\s*•\s*/g, '\n• ')
        .replace(/\s*(\d+)\.\s+/g, '\n$1. ')
        .trim();

      if (cleaned.length > 40) {
        chunks.push({
          id: chunks.length,
          source,
          text: cleaned,
        });
      }
    }
  }

  return chunks;
}

/** Load all knowledge from data files */
function loadKnowledge() {
  const coreHrChunks = loadFile('core-hr.txt', 'Core HR & Workflows');
  const payrollChunks = loadFile('payroll.txt', 'Payroll');

  const allChunks = [...coreHrChunks, ...payrollChunks].map((c, i) => ({ ...c, id: i }));
  console.log(`[Knowledge] Loaded ${coreHrChunks.length} Core HR chunks, ${payrollChunks.length} Payroll chunks (${allChunks.length} total)`);
  return allChunks;
}

module.exports = { loadKnowledge };
