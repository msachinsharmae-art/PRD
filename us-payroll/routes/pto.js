const express = require('express');
const router = express.Router();
const store = require('../data/store');

// ---------------------------------------------------------------------------
// PTO Policies
// ---------------------------------------------------------------------------

// GET /policies - list all PTO policies
router.get('/policies', (req, res) => {
  res.json(store.getAllPTOPolicies());
});

// POST /policies - create PTO policy
router.post('/policies', (req, res) => {
  const policy = store.addPTOPolicy(req.body);
  res.status(201).json(policy);
});

// PUT /policies/:id - update PTO policy
router.put('/policies/:id', (req, res) => {
  const updated = store.updatePTOPolicy(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: `PTO policy ${req.params.id} not found` });
  }
  res.json(updated);
});

// DELETE /policies/:id - delete PTO policy
router.delete('/policies/:id', (req, res) => {
  const deleted = store.deletePTOPolicy(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: `PTO policy ${req.params.id} not found` });
  }
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// PTO Balances
// ---------------------------------------------------------------------------

// GET /balances/:empId - get balances for employee
router.get('/balances/:empId', (req, res) => {
  const balances = store.getPTOBalancesByEmployee(req.params.empId);
  res.json(balances);
});

// ---------------------------------------------------------------------------
// Leave Requests
// ---------------------------------------------------------------------------

// GET /requests - list requests (query: employeeId, status)
router.get('/requests', (req, res) => {
  let requests = store.getAllLeaveRequests();
  if (req.query.employeeId) {
    requests = requests.filter((r) => r.employeeId === req.query.employeeId);
  }
  if (req.query.status) {
    requests = requests.filter((r) => r.status === req.query.status);
  }
  res.json(requests);
});

// POST /requests - create leave request
router.post('/requests', (req, res) => {
  const request = store.addLeaveRequest(req.body);
  res.status(201).json(request);
});

// PUT /requests/:id - approve/deny/cancel leave request
router.put('/requests/:id', (req, res) => {
  const existing = store.getLeaveRequest(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: `Leave request ${req.params.id} not found` });
  }
  const updates = { ...req.body };
  // Auto-set reviewedAt timestamp when status changes to approved/denied
  if (updates.status && ['approved', 'denied'].includes(updates.status) && !updates.reviewedAt) {
    updates.reviewedAt = new Date().toISOString();
  }
  const updated = store.updateLeaveRequest(req.params.id, updates);
  res.json(updated);
});

module.exports = router;
