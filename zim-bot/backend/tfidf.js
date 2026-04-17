// TF-IDF Search Engine with cosine similarity
// Self-contained NLP engine — no external dependencies

const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','shall','should','may','might','must','can','could',
  'i','me','my','we','our','you','your','he','him','his','she','her','it','its','they','them','their',
  'this','that','these','those','am','or','and','but','if','so','no','not','nor','on','at','to',
  'by','for','with','about','from','as','in','of','up','out','off','over','into','then','than',
  'too','very','just','also','each','any','all','both','more','most','such','only','own','same',
  'here','there','when','where','how','what','which','who','whom','why','some','other','new',
  'now','get','like','make','go','see','come','take','know','think','give','use','find','tell',
  'ask','work','seem','feel','try','leave','call','need','become','keep','let','begin','show',
  'hear','play','run','move','live','believe','bring','happen','write','provide','sit','stand',
  'lose','pay','meet','include','continue','set','learn','change','lead','understand','watch',
  'follow','stop','create','speak','read','allow','add','spend','grow','open','walk','win',
  'offer','remember','love','consider','appear','buy','wait','serve','die','send','expect','build',
  'stay','fall','cut','reach','kill','remain','etc','page','section','click','button','clicking',
  'admin','admins','following','below','above','using','used','e.g.','i.e.','note','path',
]);

// Domain synonym expansions
const SYNONYMS = {
  'pf': ['provident fund', 'epf', 'employee provident fund'],
  'esi': ['esic', 'employee state insurance'],
  'pt': ['professional tax'],
  'lwf': ['labour welfare fund', 'labor welfare fund'],
  'tds': ['tax deducted at source', 'income tax'],
  'ctc': ['cost to company'],
  'fnf': ['full and final', 'f&f', 'full & final', 'final settlement'],
  'ot': ['overtime'],
  'lop': ['loss of pay'],
  'hra': ['house rent allowance', 'housing rent allowance'],
  'wfh': ['work from home'],
  'da': ['dearness allowance'],
  'nps': ['national pension scheme'],
  'uan': ['universal account number'],
  'pan': ['permanent account number'],
  'payslip': ['salary slip', 'pay slip'],
  'payroll': ['salary processing', 'salary run'],
  'leave': ['time off', 'absence'],
  'attendance': ['check in', 'check out', 'punch', 'biometric'],
  'separation': ['resignation', 'termination', 'exit', 'offboarding'],
  'probation': ['confirmation', 'trial period'],
  'appraisal': ['salary revision', 'increment', 'hike'],
  'reimbursement': ['claim', 'expense claim'],
  'gratuity': ['gratuity settlement', 'gratuity payment'],
  'arrear': ['arrears', 'back pay'],
  'roster': ['shift schedule', 'shift roster'],
  'geo-fencing': ['geofencing', 'geo fence', 'location restriction'],
};

// Build reverse synonym map: "provident fund" -> "pf"
const REVERSE_SYNONYMS = {};
for (const [key, values] of Object.entries(SYNONYMS)) {
  for (const v of values) {
    REVERSE_SYNONYMS[v] = key;
    // Also add individual words
    v.split(' ').forEach(w => {
      if (w.length > 2 && !STOP_WORDS.has(w)) {
        if (!REVERSE_SYNONYMS[w]) REVERSE_SYNONYMS[w] = key;
      }
    });
  }
}

/** Tokenize text: lowercase, strip punctuation, split, remove stop words, expand synonyms */
function tokenize(text) {
  const raw = text.toLowerCase()
    .replace(/[^a-z0-9\s&/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));

  // Expand synonyms
  const expanded = [];
  for (const word of raw) {
    expanded.push(word);
    // Check if this word is a synonym key
    if (SYNONYMS[word]) {
      for (const syn of SYNONYMS[word]) {
        syn.split(' ').forEach(w => {
          if (w.length > 1 && !STOP_WORDS.has(w)) expanded.push(w);
        });
      }
    }
    // Check if this word is a synonym value
    if (REVERSE_SYNONYMS[word]) {
      expanded.push(REVERSE_SYNONYMS[word]);
    }
  }

  return expanded;
}

/** Compute term frequency for a list of tokens */
function termFrequency(tokens) {
  const tf = {};
  for (const t of tokens) {
    tf[t] = (tf[t] || 0) + 1;
  }
  // Normalize by max frequency
  const maxFreq = Math.max(...Object.values(tf), 1);
  for (const t in tf) {
    tf[t] = tf[t] / maxFreq;
  }
  return tf;
}

class TfIdfEngine {
  constructor() {
    this.chunks = [];
    this.chunkTokens = [];
    this.chunkTf = [];
    this.idf = {};
    this.ready = false;
  }

  /** Build index from array of { id, source, text } chunks */
  buildIndex(chunks) {
    this.chunks = chunks;
    const N = chunks.length;

    // Tokenize each chunk
    this.chunkTokens = chunks.map(c => tokenize(c.text));
    this.chunkTf = this.chunkTokens.map(tokens => termFrequency(tokens));

    // Compute IDF: log(N / df) where df = number of docs containing the term
    const df = {};
    for (const tf of this.chunkTf) {
      for (const term of Object.keys(tf)) {
        df[term] = (df[term] || 0) + 1;
      }
    }
    this.idf = {};
    for (const [term, count] of Object.entries(df)) {
      this.idf[term] = Math.log(N / count);
    }

    this.ready = true;
    console.log(`[TF-IDF] Indexed ${N} chunks, ${Object.keys(this.idf).length} unique terms`);
  }

  /** Search query, return top N results with scores. sourceFilter limits to a specific module. */
  search(query, topN = 3, minScore = 0.03, sourceFilter = null) {
    if (!this.ready) return [];

    const queryTokens = tokenize(query);
    const queryTf = termFrequency(queryTokens);

    // Compute TF-IDF vector for query
    const queryVec = {};
    for (const [term, tf] of Object.entries(queryTf)) {
      if (this.idf[term] !== undefined) {
        queryVec[term] = tf * this.idf[term];
      }
    }

    // Compute cosine similarity with each chunk (filtered by source if specified)
    const results = [];
    for (let i = 0; i < this.chunks.length; i++) {
      // Skip chunks not matching the source filter
      if (sourceFilter && this.chunks[i].source !== sourceFilter) continue;

      const chunkVec = {};
      for (const [term, tf] of Object.entries(this.chunkTf[i])) {
        if (this.idf[term] !== undefined) {
          chunkVec[term] = tf * this.idf[term];
        }
      }

      const score = cosineSimilarity(queryVec, chunkVec);
      if (score >= minScore) {
        results.push({ chunk: this.chunks[i], score });
      }
    }

    // Sort by score descending, return top N
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topN);
  }
}

/** Cosine similarity between two sparse vectors (objects) */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const term in vecA) {
    normA += vecA[term] ** 2;
    if (vecB[term]) {
      dotProduct += vecA[term] * vecB[term];
    }
  }
  for (const term in vecB) {
    normB += vecB[term] ** 2;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

module.exports = { TfIdfEngine, tokenize };
