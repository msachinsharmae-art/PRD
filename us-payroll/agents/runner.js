/**
 * US Payroll Agent - Tool Execution Runner
 * Routes tool calls to the shared store and engine modules.
 */

const store = require('../data/store');
const payrollEngine = require('../engines/payrollEngine');
const taxEngine = require('../engines/taxEngine');
const complianceEngine = require('../engines/complianceEngine');
const stateCompliance = require('../data/stateCompliance');
const achEngine = require('../engines/achEngine');

let federalTax;
try { federalTax = require('../data/federalTax'); } catch (_) { federalTax = null; }

let stateTaxData;
try { stateTaxData = require('../data/stateTax'); } catch (_) { stateTaxData = null; }

// ---------------------------------------------------------------------------
// Supported states
// ---------------------------------------------------------------------------
const SUPPORTED_STATES = ['CA', 'NY', 'TX', 'NJ', 'WA', 'IL', 'GA', 'FL'];

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

const toolHandlers = {

  add_employee(input) {
    if (!input.first_name || !input.last_name) {
      throw new Error('first_name and last_name are required');
    }
    if (!input.ssn || !/^\d{3}-\d{2}-\d{4}$/.test(input.ssn)) {
      throw new Error('Valid SSN in format XXX-XX-XXXX is required');
    }
    if (!input.state || !SUPPORTED_STATES.includes(input.state)) {
      throw new Error(`Invalid state. Supported: ${SUPPORTED_STATES.join(', ')}`);
    }
    if (typeof input.pay_rate !== 'number' || input.pay_rate <= 0) {
      throw new Error('pay_rate must be a positive number');
    }

    // Check minimum wage for hourly
    if (input.pay_type === 'hourly') {
      try {
        const mw = stateCompliance.getMinimumWage(input.state);
        if (mw && input.pay_rate < mw.standard) {
          throw new Error(`Pay rate $${input.pay_rate}/hr is below ${input.state} minimum wage of $${mw.standard}/hr`);
        }
      } catch (_) { /* state may not be in compliance data yet */ }
    }

    const emp = store.addEmployee({
      firstName: input.first_name,
      lastName: input.last_name,
      ssn: input.ssn,
      email: input.email || '',
      state: input.state,
      payRate: input.pay_rate,
      payType: input.pay_type || 'hourly',
      payFrequency: 'biweekly',
      filingStatus: input.filing_status || 'single',
      allowances: input.allowances || 0,
      hireDate: input.start_date || new Date().toISOString().split('T')[0],
      bankAccount: input.bank_account ? {
        routingNumber: input.bank_account.routing_number || '',
        accountNumber: input.bank_account.account_number || '',
        accountType: input.bank_account.account_type || 'checking',
      } : { routingNumber: '', accountNumber: '', accountType: 'checking' },
      benefits: input.benefits ? [input.benefits] : [],
    });

    const safe = { ...emp, ssn: `***-**-${(input.ssn || '').slice(-4)}` };
    return { success: true, message: `Employee ${emp.id} created`, employee: safe };
  },

  get_employee(input) {
    if (!input.employee_id) throw new Error('employee_id is required');
    const emp = store.getEmployee(input.employee_id);
    if (!emp) throw new Error(`Employee ${input.employee_id} not found`);
    return { ...emp, ssn: emp.ssn ? `***-**-${emp.ssn.slice(-4)}` : '***-**-****' };
  },

  list_employees(input) {
    let employees = store.getAllEmployees();
    if (input && input.state) {
      employees = employees.filter(e => e.state === input.state);
    }
    return {
      total: employees.length,
      employees: employees.map(e => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`,
        state: e.state,
        pay_type: e.payType,
        pay_rate: e.payRate,
        status: e.isActive ? 'active' : 'inactive',
        start_date: e.hireDate,
      })),
    };
  },

  run_payroll(input) {
    if (!input.start_date || !input.end_date || !input.pay_date) {
      throw new Error('start_date, end_date, and pay_date are required');
    }

    const activeEmployees = store.getActiveEmployees();
    if (activeEmployees.length === 0) {
      throw new Error('No active employees found. Add employees before running payroll.');
    }

    // Create pay run via store
    const payRun = store.addPayRun({
      payPeriodStart: input.start_date,
      payPeriodEnd: input.end_date,
      payDate: input.pay_date,
      status: 'processing',
    });

    const payStubs = [];
    const errors = [];

    for (const emp of activeEmployees) {
      try {
        const hours = emp.payType === 'hourly' ? { regular: 80 } : { regular: 0 };
        const payPeriod = { start: input.start_date, end: input.end_date, payDate: input.pay_date };
        const stub = payrollEngine.processPayStub(emp, hours, payPeriod);
        payStubs.push(stub);
      } catch (err) {
        errors.push({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          error: err.message,
        });
      }
    }

    const totalGross = payStubs.reduce((s, p) => s + (p.earnings?.totalGross || 0), 0);
    const totalNet = payStubs.reduce((s, p) => s + (p.netPay || 0), 0);
    const totalTaxes = payStubs.reduce((s, p) => s + (p.taxes?.total || 0), 0);

    store.updatePayRun(payRun.id, {
      status: errors.length > 0 ? 'completed_with_errors' : 'completed',
      employees: payStubs,
      errors,
      totalGross: Math.round(totalGross * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
      totalTaxes: Math.round(totalTaxes * 100) / 100,
      processedAt: new Date().toISOString(),
    });

    const result = store.getPayRun(payRun.id);
    return {
      pay_run_id: result.id,
      status: result.status,
      pay_period: { start: input.start_date, end: input.end_date, pay_date: input.pay_date },
      employee_count: payStubs.length,
      totals: {
        gross_pay: result.totalGross,
        total_taxes: result.totalTaxes,
        net_pay: result.totalNet,
      },
      errors: errors.length > 0 ? errors : undefined,
      employee_results: payStubs.map(s => ({
        employee_id: s.employeeId,
        employee_name: s.employeeName,
        gross_pay: s.earnings?.totalGross || 0,
        taxes: s.taxes?.total || 0,
        net_pay: s.netPay || 0,
      })),
    };
  },

  calculate_pay(input) {
    if (!input.employee_id) throw new Error('employee_id is required');
    const emp = store.getEmployee(input.employee_id);
    if (!emp) throw new Error(`Employee ${input.employee_id} not found`);

    const hours = {
      regular: input.hours_worked || (emp.payType === 'hourly' ? 80 : 0),
      overtime: input.overtime_hours || 0,
      otherEarnings: input.bonus || 0,
    };
    // Adjust regular to exclude OT
    if (input.hours_worked && input.overtime_hours) {
      hours.regular = input.hours_worked - input.overtime_hours;
    }

    const payPeriod = { frequency: input.pay_period || emp.payFrequency || 'biweekly' };
    const stub = payrollEngine.processPayStub(emp, hours, payPeriod);

    return {
      employee_id: emp.id,
      employee_name: `${emp.firstName} ${emp.lastName}`,
      state: emp.state,
      pay_period: input.pay_period || 'biweekly',
      gross_pay: stub.earnings?.totalGross || 0,
      taxes: {
        federal_income_tax: stub.taxes?.federal?.withholding || 0,
        social_security: stub.taxes?.federal?.socialSecurity || 0,
        medicare: stub.taxes?.federal?.medicare || 0,
        state_income_tax: stub.taxes?.state?.incomeTax || 0,
        state_disability: stub.taxes?.state?.sdi || 0,
        total_taxes: stub.taxes?.total || 0,
      },
      deductions: {
        pre_tax: stub.deductions?.totalPreTax || 0,
        post_tax: stub.deductions?.totalPostTax || 0,
      },
      net_pay: stub.netPay || 0,
    };
  },

  check_compliance(input) {
    const checks = [];

    if (input.employee_id) {
      const emp = store.getEmployee(input.employee_id);
      if (!emp) throw new Error(`Employee ${input.employee_id} not found`);

      // Minimum wage
      if (!input.check_type || input.check_type === 'all' || input.check_type === 'minimum_wage') {
        if (emp.payType === 'hourly') {
          const mwResult = complianceEngine.checkMinimumWage(emp, { regular: 80 }, emp.payRate * 80);
          checks.push({
            check: 'minimum_wage',
            state: emp.state,
            status: mwResult.compliant ? 'PASS' : 'FAIL',
            detail: mwResult.details,
          });
        }
      }

      // Pay frequency
      if (!input.check_type || input.check_type === 'all' || input.check_type === 'pay_frequency') {
        const pfResult = complianceEngine.checkPayFrequency(emp);
        checks.push({
          check: 'pay_frequency',
          state: emp.state,
          status: pfResult.compliant ? 'PASS' : 'FAIL',
          detail: pfResult.details,
        });
      }

      // Bank account
      if (!input.check_type || input.check_type === 'all') {
        const hasBank = emp.bankAccount && emp.bankAccount.routingNumber;
        checks.push({
          check: 'direct_deposit_setup',
          status: hasBank ? 'PASS' : 'WARNING',
          detail: hasBank ? 'Bank account on file' : 'No bank account - cannot process direct deposit',
        });
      }

      return { employee_id: input.employee_id, state: emp.state, checks };
    }

    if (input.state) {
      let complianceData;
      try {
        complianceData = stateCompliance.getStateCompliance(input.state);
      } catch (_) {
        throw new Error(`No compliance data for state ${input.state}`);
      }

      const stateEmployees = store.getEmployeesByState(input.state);

      // Minimum wage compliance
      if (!input.check_type || input.check_type === 'all' || input.check_type === 'minimum_wage') {
        const minWage = complianceData.minimumWage?.standard || 7.25;
        const violations = stateEmployees.filter(e => e.payType === 'hourly' && e.payRate < minWage);
        checks.push({
          check: 'minimum_wage',
          state: input.state,
          status: violations.length === 0 ? 'PASS' : 'FAIL',
          detail: `${violations.length} of ${stateEmployees.length} employees below minimum wage ($${minWage}/hr)`,
          violations: violations.map(v => ({ id: v.id, name: `${v.firstName} ${v.lastName}`, rate: v.payRate })),
        });
      }

      // Overtime rules
      if (!input.check_type || input.check_type === 'all' || input.check_type === 'overtime') {
        const ot = complianceData.overtime || {};
        checks.push({
          check: 'overtime_rules',
          state: input.state,
          status: 'INFO',
          detail: `${complianceData.name} OT: ${ot.type || 'weekly'}, threshold: ${ot.weeklyThreshold || 40} hrs, rate: ${ot.overtimeRate || 1.5}x`,
        });
      }

      return { state: input.state, employee_count: stateEmployees.length, checks };
    }

    // General overview
    for (const stateCode of SUPPORTED_STATES) {
      const stateEmps = store.getEmployeesByState(stateCode);
      if (stateEmps.length > 0) {
        let compData;
        try { compData = stateCompliance.getStateCompliance(stateCode); } catch (_) { continue; }
        checks.push({
          state: stateCode,
          name: compData.name,
          employee_count: stateEmps.length,
          minimum_wage: compData.minimumWage?.standard,
        });
      }
    }
    return { summary: 'compliance_overview', states_with_employees: checks.length, checks };
  },

  get_tax_breakdown(input) {
    if (!input.employee_id) throw new Error('employee_id is required');
    const emp = store.getEmployee(input.employee_id);
    if (!emp) throw new Error(`Employee ${input.employee_id} not found`);

    const annualGross = input.annual_gross || (emp.payType === 'salary' ? emp.payRate : emp.payRate * 2080);
    const ytdGross = input.ytd_gross || emp.ytdEarnings || 0;

    // Federal tax
    let fedResult = { annualTax: 0, effectiveRate: 0 };
    if (federalTax) {
      fedResult = federalTax.calculateFederalWithholding(annualGross, emp.filingStatus || 'single', emp.allowances || 0);
    }

    // FICA
    let fica = { socialSecurity: 0, medicare: 0, additionalMedicare: 0, totalFICA: 0, employerMatch: { total: 0, socialSecurity: 0, medicare: 0 } };
    if (federalTax) {
      fica = federalTax.calculateFICA(annualGross, ytdGross);
    }

    // FUTA
    let futa = { futaNet: 0 };
    if (federalTax) {
      futa = federalTax.calculateFUTA(annualGross, ytdGross);
    }

    // State tax
    let stateResult = { incomeTax: 0, totalEmployeeStateTax: 0 };
    if (stateTaxData) {
      try {
        stateResult = stateTaxData.calculateStateTax(emp.state, annualGross, emp.filingStatus || 'single');
      } catch (_) { /* unsupported state */ }
    }

    const totalEmployeeTax = Math.round((fedResult.annualTax + fica.totalFICA + stateResult.totalEmployeeStateTax) * 100) / 100;
    const totalEmployerTax = Math.round(((fica.employerMatch?.total || 0) + futa.futaNet) * 100) / 100;

    return {
      employee_id: emp.id,
      employee_name: `${emp.firstName} ${emp.lastName}`,
      state: emp.state,
      annual_gross: annualGross,
      employee_taxes: {
        federal_income_tax: fedResult.annualTax,
        federal_effective_rate: fedResult.effectiveRate,
        social_security: fica.socialSecurity,
        medicare: fica.medicare,
        additional_medicare: fica.additionalMedicare,
        state_taxes: stateResult,
        total_employee_taxes: totalEmployeeTax,
      },
      employer_taxes: {
        social_security_match: fica.employerMatch?.socialSecurity || 0,
        medicare_match: fica.employerMatch?.medicare || 0,
        futa: futa.futaNet,
        total_employer_taxes: totalEmployerTax,
      },
      total_tax_cost: Math.round((totalEmployeeTax + totalEmployerTax) * 100) / 100,
    };
  },

  generate_pay_stub(input) {
    if (!input.employee_id) throw new Error('employee_id is required');
    if (!input.pay_run_id) throw new Error('pay_run_id is required');

    const emp = store.getEmployee(input.employee_id);
    if (!emp) throw new Error(`Employee ${input.employee_id} not found`);

    const payRun = store.getPayRun(input.pay_run_id);
    if (!payRun) throw new Error(`Pay run ${input.pay_run_id} not found`);

    const empStub = (payRun.employees || []).find(s => s.employeeId === input.employee_id);
    if (!empStub) {
      throw new Error(`Employee ${input.employee_id} not found in pay run ${input.pay_run_id}`);
    }

    return {
      pay_stub: {
        company: 'Zimyo US Payroll',
        employee: {
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          ssn: emp.ssn ? `***-**-${emp.ssn.slice(-4)}` : '***-**-****',
          state: emp.state,
        },
        pay_period: {
          start: payRun.payPeriodStart,
          end: payRun.payPeriodEnd,
          pay_date: payRun.payDate,
        },
        earnings: empStub.earnings,
        taxes: empStub.taxes,
        deductions: empStub.deductions,
        net_pay: empStub.netPay,
        ytd: empStub.ytd,
      },
    };
  },

  process_direct_deposit(input) {
    if (!input.pay_run_id) throw new Error('pay_run_id is required');
    if (!input.effective_date) throw new Error('effective_date is required');

    const payRun = store.getPayRun(input.pay_run_id);
    if (!payRun) throw new Error(`Pay run ${input.pay_run_id} not found`);

    // Build results in the format achEngine expects
    const results = (payRun.employees || []).map(stub => {
      const emp = store.getEmployee(stub.employeeId);
      return { payStub: stub, employee: emp || {} };
    });

    const depositResult = achEngine.processDirectDeposit({ ...payRun, results });
    return depositResult;
  },

  generate_tax_report(input) {
    if (!input.report_type) throw new Error('report_type is required');
    if (!input.period) throw new Error('period is required');

    const employees = store.getAllEmployees();
    const payRuns = store.getAllPayRuns().filter(r => r.status === 'completed' || r.status === 'completed_with_errors');

    if (input.report_type === '941_quarterly') {
      let totalWages = 0, totalFedTax = 0, totalSS = 0, totalMedicare = 0;

      for (const run of payRuns) {
        for (const stub of (run.employees || [])) {
          totalWages += stub.earnings?.totalGross || 0;
          const fed = stub.taxes?.federal || {};
          totalFedTax += fed.withholding || 0;
          totalSS += fed.socialSecurity || 0;
          totalMedicare += fed.medicare || 0;
        }
      }

      return {
        report_type: 'IRS Form 941',
        period: input.period,
        data: {
          employee_count: employees.length,
          total_wages: Math.round(totalWages * 100) / 100,
          federal_income_tax_withheld: Math.round(totalFedTax * 100) / 100,
          social_security_tax: Math.round(totalSS * 2 * 100) / 100,
          medicare_tax: Math.round(totalMedicare * 2 * 100) / 100,
          total_tax_liability: Math.round((totalFedTax + totalSS * 2 + totalMedicare * 2) * 100) / 100,
        },
        status: 'generated',
        generated_at: new Date().toISOString(),
      };
    }

    if (input.report_type === 'w2_annual') {
      const w2s = employees.map(emp => {
        let ytdGross = 0, ytdFedTax = 0, ytdStateTax = 0, ytdSS = 0, ytdMedicare = 0;
        for (const run of payRuns) {
          const stub = (run.employees || []).find(s => s.employeeId === emp.id);
          if (stub) {
            ytdGross += stub.earnings?.totalGross || 0;
            const fed = stub.taxes?.federal || {};
            const st = stub.taxes?.state || {};
            ytdFedTax += fed.withholding || 0;
            ytdSS += fed.socialSecurity || 0;
            ytdMedicare += fed.medicare || 0;
            ytdStateTax += st.incomeTax || 0;
          }
        }
        return {
          employee_id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          ssn: emp.ssn ? `***-**-${emp.ssn.slice(-4)}` : '***-**-****',
          state: emp.state,
          box_1_wages: Math.round(ytdGross * 100) / 100,
          box_2_federal_withheld: Math.round(ytdFedTax * 100) / 100,
          box_3_ss_wages: Math.round(ytdGross * 100) / 100,
          box_4_ss_tax: Math.round(ytdSS * 100) / 100,
          box_5_medicare_wages: Math.round(ytdGross * 100) / 100,
          box_6_medicare_tax: Math.round(ytdMedicare * 100) / 100,
          box_16_state_wages: Math.round(ytdGross * 100) / 100,
          box_17_state_tax: Math.round(ytdStateTax * 100) / 100,
        };
      });

      return {
        report_type: 'W-2 Annual',
        tax_year: input.period,
        employee_count: w2s.length,
        w2_records: w2s,
        status: 'generated',
        generated_at: new Date().toISOString(),
      };
    }

    if (input.report_type === 'state_withholding') {
      if (!input.state) throw new Error('state is required for state_withholding report');

      const stateEmps = store.getEmployeesByState(input.state);
      let compData;
      try { compData = stateCompliance.getStateCompliance(input.state); } catch (_) { compData = { name: input.state }; }

      const records = stateEmps.map(emp => {
        let ytdGross = 0, ytdStateTax = 0;
        for (const run of payRuns) {
          const stub = (run.employees || []).find(s => s.employeeId === emp.id);
          if (stub) {
            ytdGross += stub.earnings?.totalGross || 0;
            ytdStateTax += (stub.taxes?.state?.incomeTax || 0) + (stub.taxes?.state?.sdi || 0);
          }
        }
        return {
          employee_id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          ytd_wages: Math.round(ytdGross * 100) / 100,
          ytd_state_tax: Math.round(ytdStateTax * 100) / 100,
        };
      });

      return {
        report_type: `State Withholding Report - ${compData.name || input.state}`,
        period: input.period,
        state: input.state,
        employee_count: records.length,
        records,
        status: 'generated',
        generated_at: new Date().toISOString(),
      };
    }

    throw new Error(`Unknown report_type: ${input.report_type}. Use: 941_quarterly, w2_annual, state_withholding`);
  },

  get_state_rules(input) {
    if (!input.state) throw new Error('state is required');
    try {
      return stateCompliance.getStateCompliance(input.state);
    } catch (err) {
      throw new Error(`No rules found for state '${input.state}'. Supported: ${SUPPORTED_STATES.join(', ')}`);
    }
  },

  validate_new_hire(input) {
    if (!input.employee_id) throw new Error('employee_id is required');
    const emp = store.getEmployee(input.employee_id);
    if (!emp) throw new Error(`Employee ${input.employee_id} not found`);

    // Use compliance engine validation
    const validation = complianceEngine.validateNewHire({
      ...emp,
      workState: emp.state,
      w4: { filingStatus: emp.filingStatus },
      i9Completed: input.documents?.i9_completed || false,
    });

    // New hire report
    const report = complianceEngine.generateNewHireReport({
      ...emp,
      workState: emp.state,
      employerEIN: '12-3456789',
      employerName: 'Zimyo US Payroll',
    });

    return {
      employee_id: emp.id,
      validation_passed: validation.valid,
      missing_fields: validation.missingFields,
      warnings: validation.warnings,
      new_hire_report: report,
    };
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function executeTool(name, input) {
  try {
    const handler = toolHandlers[name];
    if (!handler) {
      return { error: `Unknown tool: ${name}`, is_error: true };
    }
    return handler(input || {});
  } catch (err) {
    return { error: err.message || String(err), is_error: true };
  }
}

module.exports = { executeTool };
