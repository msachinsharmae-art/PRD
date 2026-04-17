const express = require('express');
const router = express.Router();
const store = require('../data/store');

// GET / - list all pay schedules
router.get('/', (req, res) => {
  res.json(store.getAllPaySchedules());
});

// POST / - create pay schedule
router.post('/', (req, res) => {
  const schedule = store.addPaySchedule(req.body);
  res.status(201).json(schedule);
});

// PUT /:id - update pay schedule
router.put('/:id', (req, res) => {
  const updated = store.updatePaySchedule(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: `Pay schedule ${req.params.id} not found` });
  }
  res.json(updated);
});

// DELETE /:id - delete pay schedule
router.delete('/:id', (req, res) => {
  const deleted = store.deletePaySchedule(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: `Pay schedule ${req.params.id} not found` });
  }
  res.status(204).end();
});

module.exports = router;
