const express = require('express');
const router = express.Router();
const store = require('../data/store');

// GET / - list all OT plans
router.get('/', (req, res) => {
  res.json(store.getAllOTPlans());
});

// POST / - create OT plan
router.post('/', (req, res) => {
  const plan = store.addOTPlan(req.body);
  res.status(201).json(plan);
});

// PUT /:id - update OT plan
router.put('/:id', (req, res) => {
  const updated = store.updateOTPlan(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: `OT plan ${req.params.id} not found` });
  }
  res.json(updated);
});

// DELETE /:id - delete OT plan
router.delete('/:id', (req, res) => {
  const deleted = store.deleteOTPlan(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: `OT plan ${req.params.id} not found` });
  }
  res.status(204).end();
});

module.exports = router;
