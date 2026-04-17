// @ts-check
// Central constants — credentials, URLs, timeouts
module.exports = {
  BASE_URL: 'https://www.zimyo.net',
  PAYROLL_URL: 'https://www.zimyo.net/payroll',
  EMPLOYEES_URL: 'https://www.zimyo.net/payroll/employees/list',
  RUN_PAYROLL_URL: 'https://www.zimyo.net/payroll/payroll-operations/run-payroll',

  CREDENTIALS: {
    username: 'devteam@yopmail.com',
    password: 'Zimyo@12345',
  },

  TIMEOUTS: {
    navigation: 30000,
    element: 15000,
    networkIdle: 8000,
    afterAction: 5000,
    afterCompute: 8000,
    afterSearch: 10000,
    short: 1000,
    medium: 3000,
    long: 5000,
  },
};
