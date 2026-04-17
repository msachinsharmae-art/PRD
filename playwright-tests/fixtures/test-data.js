// @ts-check
// Central test data — employees, salary values, payroll months
// Keep test data here so specs stay clean and data is reusable.

module.exports = {
  employees: {
    testShift: {
      name: 'Test Shift',
      searchTerm: 'test shift',
    },
    anita: {
      name: 'Anita',
      searchTerm: 'anita',
    },
  },

  salary: {
    default: {
      ctc: '500000',
      basic: '250000',
    },
  },

  payrollRun: {
    march2026: {
      entity: 'All',
      month: 'Mar-2026',
      status: 'All',
    },
  },
};
