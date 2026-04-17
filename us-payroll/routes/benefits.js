const express = require('express');
const router = express.Router();
const store = require('../data/store');

// ---------------------------------------------------------------------------
// Benefit Plans
// ---------------------------------------------------------------------------

// GET /plans - list all benefit plans
router.get('/plans', (req, res) => {
  res.json(store.getAllBenefitPlans());
});

// POST /plans - create benefit plan
router.post('/plans', (req, res) => {
  const plan = store.addBenefitPlan(req.body);
  res.status(201).json(plan);
});

// PUT /plans/:id - update benefit plan
router.put('/plans/:id', (req, res) => {
  const updated = store.updateBenefitPlan(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: `Benefit plan ${req.params.id} not found` });
  }
  res.json(updated);
});

// DELETE /plans/:id - delete benefit plan
router.delete('/plans/:id', (req, res) => {
  const deleted = store.deleteBenefitPlan(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: `Benefit plan ${req.params.id} not found` });
  }
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Benefit Enrollments
// ---------------------------------------------------------------------------

// GET /enrollments/:empId - get enrollments for employee
router.get('/enrollments/:empId', (req, res) => {
  const enrollments = store.getEnrollmentsByEmployee(req.params.empId);
  res.json(enrollments);
});

// POST /enrollments - enroll employee
router.post('/enrollments', (req, res) => {
  const enrollment = store.addBenefitEnrollment(req.body);
  res.status(201).json(enrollment);
});

// PUT /enrollments/:id - update enrollment
router.put('/enrollments/:id', (req, res) => {
  const updated = store.updateBenefitEnrollment(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: `Enrollment ${req.params.id} not found` });
  }
  res.json(updated);
});

// DELETE /enrollments/:id - cancel enrollment
router.delete('/enrollments/:id', (req, res) => {
  const deleted = store.deleteBenefitEnrollment(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: `Enrollment ${req.params.id} not found` });
  }
  res.status(204).end();
});

module.exports = router;
