const express = require('express');
const router = express.Router();
const store = require('../data/store');

// GET / - return company config
router.get('/', (req, res) => {
  res.json(store.getCompany());
});

// PUT / - update company config
router.put('/', (req, res) => {
  const updated = store.updateCompany(req.body);
  res.json(updated);
});

// POST /states - add state to registeredStates
router.post('/states', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'State code is required' });
  }
  const stateCode = code.toUpperCase();
  const company = store.getCompany();
  if (company.registeredStates.includes(stateCode)) {
    return res.status(409).json({ error: `State ${stateCode} is already registered` });
  }
  const updated = store.updateCompany({
    registeredStates: [...company.registeredStates, stateCode],
  });
  res.status(201).json(updated);
});

// DELETE /states/:code - remove state from registeredStates
router.delete('/states/:code', (req, res) => {
  const stateCode = req.params.code.toUpperCase();
  const company = store.getCompany();
  if (!company.registeredStates.includes(stateCode)) {
    return res.status(404).json({ error: `State ${stateCode} is not registered` });
  }
  const updated = store.updateCompany({
    registeredStates: company.registeredStates.filter((s) => s !== stateCode),
  });
  res.json(updated);
});

// POST /locations - add work location
router.post('/locations', (req, res) => {
  const location = req.body;
  if (!location.name || !location.state) {
    return res.status(400).json({ error: 'Location name and state are required' });
  }
  const company = store.getCompany();
  const newLocation = {
    id: location.id || `loc-${Date.now()}`,
    name: location.name,
    state: location.state,
    city: location.city || '',
    isPrimary: location.isPrimary || false,
  };
  const updated = store.updateCompany({
    workLocations: [...company.workLocations, newLocation],
  });
  res.status(201).json(updated);
});

// DELETE /locations/:id - remove work location
router.delete('/locations/:id', (req, res) => {
  const company = store.getCompany();
  const exists = company.workLocations.some((loc) => loc.id === req.params.id);
  if (!exists) {
    return res.status(404).json({ error: `Location ${req.params.id} not found` });
  }
  const updated = store.updateCompany({
    workLocations: company.workLocations.filter((loc) => loc.id !== req.params.id),
  });
  res.json(updated);
});

module.exports = router;
