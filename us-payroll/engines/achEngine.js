/**
 * ACH / Payment Processing Engine
 * Generates NACHA-format ACH files and simulates direct deposit processing.
 */

'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ACH_RECORD_SIZE = 94;  // NACHA standard: 94 characters per record
const BLOCKING_FACTOR = 10;  // Records per block

const ENTRY_CLASS_CODES = {
  PPD: 'PPD',  // Prearranged Payment and Deposit (payroll)
  CCD: 'CCD',  // Corporate Credit or Debit
};

const TRANSACTION_CODES = {
  CHECKING_CREDIT: '22',
  CHECKING_DEBIT: '27',
  SAVINGS_CREDIT: '32',
  SAVINGS_DEBIT: '37',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Right-pad a string with spaces to the given length.
 */
function rpad(str, len) {
  const s = String(str || '');
  return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length);
}

/**
 * Left-pad a string with zeros to the given length.
 */
function lpad(str, len) {
  const s = String(str || '');
  return s.length >= len ? s.slice(0, len) : '0'.repeat(len - s.length) + s;
}

/**
 * Format a dollar amount as cents with left-zero padding (10 chars).
 */
function formatAmount(amount) {
  const cents = Math.round(Math.abs(amount) * 100);
  return lpad(String(cents), 10);
}

/**
 * Generate a unique trace number: routing (8 digits) + sequence (7 digits).
 */
function generateTraceNumber(routingNumber, sequence) {
  return lpad(String(routingNumber).replace(/\D/g, '').slice(0, 8), 8) + lpad(String(sequence), 7);
}

/**
 * Get current date in YYMMDD format.
 */
function dateYYMMDD(date) {
  const d = date || new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = lpad(String(d.getMonth() + 1), 2);
  const dd = lpad(String(d.getDate()), 2);
  return yy + mm + dd;
}

/**
 * Get current time in HHMM format.
 */
function timeHHMM(date) {
  const d = date || new Date();
  return lpad(String(d.getHours()), 2) + lpad(String(d.getMinutes()), 2);
}

/**
 * Compute a simple hash for entry hash: sum of routing number first 8 digits.
 */
function computeEntryHash(routingNumbers) {
  let sum = 0;
  for (const rn of routingNumbers) {
    sum += parseInt(String(rn).replace(/\D/g, '').slice(0, 8), 10) || 0;
  }
  // NACHA: use last 10 digits of the sum
  return lpad(String(sum).slice(-10), 10);
}

// ---------------------------------------------------------------------------
// Bank Account Validation
// ---------------------------------------------------------------------------

/**
 * Validate a bank account's routing and account numbers.
 *
 * @param {string} routingNumber - 9-digit ABA routing number
 * @param {string} accountNumber - Account number (1-17 digits)
 * @returns {Object} { valid, errors[] }
 */
function validateBankAccount(routingNumber, accountNumber) {
  const errors = [];

  // --- Routing number ---
  if (!routingNumber) {
    errors.push('Routing number is required');
  } else {
    const rn = String(routingNumber).replace(/\D/g, '');
    if (rn.length !== 9) {
      errors.push(`Routing number must be 9 digits (got ${rn.length})`);
    } else {
      // ABA checksum validation (mod-10 algorithm)
      const d = rn.split('').map(Number);
      const checksum = (3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8])) % 10;
      if (checksum !== 0) {
        errors.push('Routing number fails ABA checksum validation');
      }
    }
  }

  // --- Account number ---
  if (!accountNumber) {
    errors.push('Account number is required');
  } else {
    const an = String(accountNumber).replace(/\D/g, '');
    if (an.length < 1 || an.length > 17) {
      errors.push(`Account number must be 1-17 digits (got ${an.length})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// ACH File Generation (NACHA format)
// ---------------------------------------------------------------------------

/**
 * Generate a NACHA-format ACH file for a payroll run.
 *
 * @param {Object} payRun - {
 *   id, companyName, companyId, ein, originatingDFI, effectiveDate,
 *   bankRoutingNumber, bankAccountNumber,
 *   results: [{ payStub: { employeeId, netPay, ... }, employee: { bankAccount: {...} } }]
 * }
 * @returns {Object} { fileContents, recordCount, totalCredits, totalDebits, entryCount }
 */
function generateACHFile(payRun) {
  if (!payRun) throw new Error('payRun is required');

  const now = new Date();
  const records = [];
  const companyName = (payRun.companyName || 'COMPANY').toUpperCase();
  const companyId = payRun.companyId || payRun.ein || '0000000000';
  const originDFI = String(payRun.bankRoutingNumber || payRun.originatingDFI || '000000000').replace(/\D/g, '').slice(0, 8);
  const effectiveDate = payRun.effectiveDate || dateYYMMDD(now);
  const batchNumber = 1;
  const fileIdModifier = 'A';

  // --- File Header Record (1) ---
  const fileHeader =
    '1' +                              // Record type
    '01' +                             // Priority code
    ' ' + lpad(originDFI, 10) +        // Immediate destination (space + 10 chars)
    lpad(companyId, 10) +              // Immediate origin
    dateYYMMDD(now) +                  // File creation date
    timeHHMM(now) +                    // File creation time
    fileIdModifier +                   // File ID modifier
    '094' +                            // Record size
    lpad(String(BLOCKING_FACTOR), 2) + // Blocking factor
    '1' +                              // Format code
    rpad(payRun.bankName || 'BANK', 23) + // Destination name
    rpad(companyName, 23) +            // Origin name
    rpad(payRun.id || '', 8);          // Reference code

  records.push(rpad(fileHeader, ACH_RECORD_SIZE));

  // --- Batch Header Record (5) ---
  const batchHeader =
    '5' +                              // Record type
    '220' +                            // Service class (220 = credits only)
    rpad(companyName, 16) +            // Company name
    rpad('', 20) +                     // Company discretionary data
    lpad(companyId, 10) +              // Company identification
    ENTRY_CLASS_CODES.PPD +            // Standard entry class
    rpad('PAYROLL', 10) +              // Entry description
    rpad(payRun.companyDescDate || dateYYMMDD(now), 6) + // Company descriptive date
    effectiveDate +                    // Effective entry date
    '   ' +                            // Settlement date (leave blank)
    '1' +                              // Originator status
    lpad(originDFI, 8);                // Originating DFI

  records.push(rpad(batchHeader, ACH_RECORD_SIZE));

  // --- Entry Detail Records (6) ---
  const entries = payRun.results || [];
  let totalCredits = 0;
  let totalDebits = 0;
  let entryCount = 0;
  const routingNumbers = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const stub = entry.payStub || entry;
    const employee = entry.employee || {};
    const bank = employee.bankAccount || {};

    const netPay = stub.netPay || 0;
    if (netPay <= 0) continue;

    const accountType = (bank.accountType || 'checking').toLowerCase();
    const txnCode = accountType === 'savings'
      ? TRANSACTION_CODES.SAVINGS_CREDIT
      : TRANSACTION_CODES.CHECKING_CREDIT;

    const routingNum = String(bank.routingNumber || '000000000').replace(/\D/g, '');
    const accountNum = String(bank.accountNumber || '').replace(/\D/g, '');
    const checkDigit = routingNum.charAt(8) || '0';

    routingNumbers.push(routingNum);
    totalCredits += netPay;
    entryCount++;

    const entryRecord =
      '6' +                                // Record type
      txnCode +                            // Transaction code
      lpad(routingNum.slice(0, 8), 8) +    // Receiving DFI (8 digits)
      checkDigit +                         // Check digit
      rpad(accountNum, 17) +               // DFI account number
      formatAmount(netPay) +               // Amount (10 chars)
      rpad(stub.employeeId || String(i + 1), 15) + // Individual ID
      rpad(
        (employee.lastName || '') + ' ' + (employee.firstName || ''),
        22
      ) +                                  // Individual name
      '  ' +                               // Discretionary data
      '0' +                                // Addenda record indicator
      generateTraceNumber(originDFI, i + 1); // Trace number

    records.push(rpad(entryRecord, ACH_RECORD_SIZE));
  }

  // --- Batch Control Record (8) ---
  const entryHash = computeEntryHash(routingNumbers);
  const batchControl =
    '8' +                              // Record type
    '220' +                            // Service class
    lpad(String(entryCount), 6) +      // Entry/Addenda count
    entryHash +                        // Entry hash
    formatAmount(totalDebits) +        // Total debit
    formatAmount(totalCredits) +       // Total credit
    lpad(companyId, 10) +              // Company identification
    rpad('', 19) +                     // Message authentication code (blank)
    rpad('', 6) +                      // Reserved
    lpad(originDFI, 8);               // Originating DFI

  records.push(rpad(batchControl, ACH_RECORD_SIZE));

  // --- File Control Record (9) ---
  const totalRecords = records.length + 1; // +1 for this record
  const blockCount = Math.ceil(totalRecords / BLOCKING_FACTOR);

  const fileControl =
    '9' +                              // Record type
    lpad(String(batchNumber), 6) +     // Batch count
    lpad(String(blockCount), 6) +      // Block count
    lpad(String(entryCount), 8) +      // Entry/Addenda count
    entryHash +                        // Entry hash
    formatAmount(totalDebits) +        // Total debit
    formatAmount(totalCredits) +       // Total credit
    rpad('', 39);                      // Reserved

  records.push(rpad(fileControl, ACH_RECORD_SIZE));

  // Pad to fill the last block with 9999... records
  while (records.length % BLOCKING_FACTOR !== 0) {
    records.push(rpad('9'.repeat(ACH_RECORD_SIZE), ACH_RECORD_SIZE));
  }

  return {
    fileContents: records.join('\n'),
    recordCount: records.length,
    entryCount,
    totalCredits: Math.round(totalCredits * 100) / 100,
    totalDebits: Math.round(totalDebits * 100) / 100,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Direct Deposit Processing (simulation)
// ---------------------------------------------------------------------------

/**
 * Simulate processing direct deposits for a payroll run.
 * Tracks status progression: initiated -> processing -> completed/failed.
 *
 * @param {Object} payRun - Same shape as generateACHFile input
 * @returns {Object} Processing result with per-employee statuses.
 */
function processDirectDeposit(payRun) {
  if (!payRun) throw new Error('payRun is required');

  const entries = payRun.results || [];
  const payments = [];
  let successCount = 0;
  let failCount = 0;
  let totalAmount = 0;

  for (const entry of entries) {
    const stub = entry.payStub || entry;
    const employee = entry.employee || {};
    const bank = employee.bankAccount || {};
    const netPay = stub.netPay || 0;

    // Validate bank account before processing
    const validation = validateBankAccount(bank.routingNumber, bank.accountNumber);

    const payment = {
      employeeId: stub.employeeId || employee.id || employee.employeeId,
      employeeName: [employee.firstName, employee.lastName].filter(Boolean).join(' '),
      amount: netPay,
      accountType: bank.accountType || 'checking',
      routingNumber: bank.routingNumber ? maskRouting(bank.routingNumber) : null,
      accountLast4: bank.accountNumber ? String(bank.accountNumber).slice(-4) : null,
      initiatedAt: new Date().toISOString(),
    };

    if (netPay <= 0) {
      payment.status = 'skipped';
      payment.reason = 'Net pay is zero or negative';
      failCount++;
    } else if (!validation.valid) {
      payment.status = 'failed';
      payment.reason = `Invalid bank account: ${validation.errors.join('; ')}`;
      failCount++;
    } else {
      // Simulate successful processing
      payment.status = 'completed';
      payment.processingSteps = [
        { status: 'initiated',  timestamp: new Date().toISOString() },
        { status: 'processing', timestamp: new Date(Date.now() + 1000).toISOString() },
        { status: 'completed',  timestamp: new Date(Date.now() + 2000).toISOString() },
      ];
      payment.confirmationNumber = generateConfirmationNumber();
      successCount++;
      totalAmount += netPay;
    }

    payments.push(payment);
  }

  return {
    payRunId: payRun.id || null,
    processedAt: new Date().toISOString(),
    summary: {
      totalPayments: payments.length,
      successCount,
      failCount,
      skippedCount: payments.filter(p => p.status === 'skipped').length,
      totalAmount: Math.round(totalAmount * 100) / 100,
    },
    payments,
  };
}

/**
 * Mask a routing number for display (show first 4 and last 2).
 */
function maskRouting(routingNumber) {
  const rn = String(routingNumber).replace(/\D/g, '');
  if (rn.length < 6) return '****';
  return rn.slice(0, 4) + '***' + rn.slice(-2);
}

/**
 * Generate a pseudo-random confirmation number.
 */
function generateConfirmationNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ACH-${ts}-${rand}`;
}

// ---------------------------------------------------------------------------
// Payment Summary
// ---------------------------------------------------------------------------

/**
 * Generate a human-readable payment summary for a pay run.
 *
 * @param {Object} payRun
 * @returns {Object} Summary with totals and per-method breakdown.
 */
function generatePaymentSummary(payRun) {
  if (!payRun) throw new Error('payRun is required');

  const entries = payRun.results || [];
  let directDepositTotal = 0;
  let directDepositCount = 0;
  let checkTotal = 0;
  let checkCount = 0;
  const employeeSummaries = [];

  for (const entry of entries) {
    const stub = entry.payStub || entry;
    const employee = entry.employee || {};
    const bank = employee.bankAccount || {};
    const netPay = stub.netPay || 0;

    const hasBank = bank.routingNumber && bank.accountNumber;
    const method = hasBank ? 'direct_deposit' : 'check';

    if (method === 'direct_deposit') {
      directDepositTotal += netPay;
      directDepositCount++;
    } else {
      checkTotal += netPay;
      checkCount++;
    }

    employeeSummaries.push({
      employeeId: stub.employeeId || employee.id || employee.employeeId,
      employeeName: [employee.firstName, employee.lastName].filter(Boolean).join(' '),
      netPay,
      paymentMethod: method,
      accountLast4: hasBank ? String(bank.accountNumber).slice(-4) : null,
    });
  }

  return {
    payRunId: payRun.id || null,
    generatedAt: new Date().toISOString(),
    totals: {
      totalPayments: entries.length,
      totalAmount: Math.round((directDepositTotal + checkTotal) * 100) / 100,
    },
    byMethod: {
      directDeposit: {
        count: directDepositCount,
        total: Math.round(directDepositTotal * 100) / 100,
      },
      check: {
        count: checkCount,
        total: Math.round(checkTotal * 100) / 100,
      },
    },
    employees: employeeSummaries,
  };
}

module.exports = {
  generateACHFile,
  validateBankAccount,
  processDirectDeposit,
  generatePaymentSummary,
  // Expose for testing
  TRANSACTION_CODES,
  ENTRY_CLASS_CODES,
};
