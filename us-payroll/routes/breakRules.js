const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { STATE_COMPLIANCE } = require('../data/stateCompliance');

// GET / - list all break rules
router.get('/', (req, res) => {
  res.json(store.getAllBreakRules());
});

// GET /presets - return state preset break rules from stateCompliance data
router.get('/presets', (req, res) => {
  const presets = [];
  for (const [code, state] of Object.entries(STATE_COMPLIANCE)) {
    const preset = {
      state: code,
      stateName: state.name,
      mealBreaks: [],
      restBreaks: [],
    };

    // Build meal break presets from state compliance data
    if (state.mealBreaks && state.mealBreaks.required) {
      if (state.mealBreaks.firstMeal) {
        preset.mealBreaks.push({
          afterHours: state.mealBreaks.firstMeal.afterHours,
          durationMinutes: state.mealBreaks.firstMeal.duration,
          paid: state.mealBreaks.firstMeal.paid,
        });
      }
      if (state.mealBreaks.secondMeal) {
        preset.mealBreaks.push({
          afterHours: state.mealBreaks.secondMeal.afterHours,
          durationMinutes: state.mealBreaks.secondMeal.duration,
          paid: state.mealBreaks.secondMeal.paid,
        });
      }
      // Handle NY-style factory/non-factory break structures
      if (state.mealBreaks.factoryWorkers) {
        preset.mealBreaks.push({
          label: 'Factory Workers',
          afterHours: state.mealBreaks.factoryWorkers.afterHours,
          durationMinutes: state.mealBreaks.factoryWorkers.duration,
          paid: state.mealBreaks.factoryWorkers.paid,
        });
      }
      if (state.mealBreaks.nonFactoryWorkers) {
        preset.mealBreaks.push({
          label: 'Non-Factory Workers',
          afterHours: state.mealBreaks.nonFactoryWorkers.afterHours,
          durationMinutes: state.mealBreaks.nonFactoryWorkers.duration,
          paid: state.mealBreaks.nonFactoryWorkers.paid,
        });
      }
      if (state.mealBreaks.penalty) {
        preset.mealPenalty = state.mealBreaks.penalty;
      }
      preset.mealNotes = state.mealBreaks.notes || '';
    }

    // Build rest break presets from state compliance data
    if (state.restBreaks && state.restBreaks.required) {
      preset.restBreaks.push({
        frequency: state.restBreaks.frequency,
        paid: state.restBreaks.paid,
      });
      preset.restNotes = state.restBreaks.notes || '';
      if (state.restBreaks.penalty) {
        preset.restPenalty = state.restBreaks.penalty;
      }
    }

    presets.push(preset);
  }
  res.json(presets);
});

// POST / - create custom break rule
router.post('/', (req, res) => {
  const rule = store.addBreakRule(req.body);
  res.status(201).json(rule);
});

// PUT /:id - update break rule
router.put('/:id', (req, res) => {
  const updated = store.updateBreakRule(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: `Break rule ${req.params.id} not found` });
  }
  res.json(updated);
});

// DELETE /:id - delete break rule
router.delete('/:id', (req, res) => {
  const deleted = store.deleteBreakRule(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: `Break rule ${req.params.id} not found` });
  }
  res.status(204).end();
});

module.exports = router;
