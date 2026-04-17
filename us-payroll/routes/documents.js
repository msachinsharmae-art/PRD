const express = require('express');
const router = express.Router();
const store = require('../data/store');

// GET / - list documents (query: category, tag, state)
router.get('/', (req, res) => {
  let docs = store.getAllDocuments();
  if (req.query.category) {
    docs = docs.filter((d) => d.category === req.query.category);
  }
  if (req.query.tag) {
    docs = docs.filter((d) => d.tags.includes(req.query.tag));
  }
  if (req.query.state) {
    const stateCode = req.query.state.toUpperCase();
    docs = docs.filter(
      (d) => d.applicableStates.length === 0 || d.applicableStates.includes(stateCode)
    );
  }
  res.json(docs);
});

// GET /:id - get single document
router.get('/:id', (req, res) => {
  const doc = store.getDocument(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: `Document ${req.params.id} not found` });
  }
  res.json(doc);
});

// POST / - create document
router.post('/', (req, res) => {
  const doc = store.addDocument(req.body);
  res.status(201).json(doc);
});

// PUT /:id - update document
router.put('/:id', (req, res) => {
  const updated = store.updateDocument(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: `Document ${req.params.id} not found` });
  }
  res.json(updated);
});

// DELETE /:id - delete document
router.delete('/:id', (req, res) => {
  const deleted = store.deleteDocument(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: `Document ${req.params.id} not found` });
  }
  res.status(204).end();
});

module.exports = router;
