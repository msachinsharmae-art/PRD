/* ========================================
   Module: Employees
   ======================================== */
(function () {
  'use strict';
  var P = window.PayrollApp;

  var employees = [];
  var wizardStep = 1;
  var wizardData = {};

  function stateOptions() {
    return '<option value="">Select state</option>' +
      Object.keys(P.STATES).map(function (c) {
        return '<option value="' + c + '">' + P.STATES[c] + '</option>';
      }).join('');
  }

  window.PayrollModules.employees = {
    render: function () {
      return '' +
        '<div class="page-header">' +
          '<h3>Employees</h3>' +
          '<button class="btn btn-primary" id="btn-add-employee">+ Add Employee</button>' +
        '</div>' +

        '<div class="card">' +
          '<div class="table-wrapper">' +
            '<table class="data-table">' +
              '<thead><tr>' +
                '<th>Name</th><th>State</th><th>Department</th><th>Pay Type</th><th>Rate</th><th>Status</th>' +
              '</tr></thead>' +
              '<tbody id="employees-body">' +
                '<tr><td colspan="6" class="empty-state">Loading...</td></tr>' +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>' +

        // Modal overlay
        '<div class="modal-overlay" id="emp-modal-overlay">' +
          '<div class="modal" style="max-width:640px">' +
            '<div class="modal-header">' +
              '<h3 class="modal-title" id="emp-modal-title">Add Employee - Step 1 of 5</h3>' +
              '<button class="modal-close" id="emp-modal-close">&times;</button>' +
            '</div>' +
            '<div class="modal-body" id="emp-modal-body"></div>' +
            '<div class="modal-footer">' +
              '<button class="btn btn-secondary" id="emp-prev-btn" style="display:none">Back</button>' +
              '<div style="flex:1"></div>' +
              '<button class="btn btn-secondary" id="emp-cancel-btn">Cancel</button>' +
              '<button class="btn btn-primary" id="emp-next-btn">Next</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    },

    init: function () {
      loadEmployees();

      // Add employee button
      var addBtn = document.getElementById('btn-add-employee');
      if (addBtn) addBtn.addEventListener('click', openWizard);

      var closeBtn = document.getElementById('emp-modal-close');
      var cancelBtn = document.getElementById('emp-cancel-btn');
      if (closeBtn) closeBtn.addEventListener('click', closeWizard);
      if (cancelBtn) cancelBtn.addEventListener('click', closeWizard);

      var overlay = document.getElementById('emp-modal-overlay');
      if (overlay) overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeWizard();
      });

      var nextBtn = document.getElementById('emp-next-btn');
      var prevBtn = document.getElementById('emp-prev-btn');
      if (nextBtn) nextBtn.addEventListener('click', handleNext);
      if (prevBtn) prevBtn.addEventListener('click', handlePrev);
    }
  };

  function loadEmployees() {
    P.apiFetch('/employees')
      .then(function (data) {
        employees = Array.isArray(data) ? data : (data.employees || []);
        renderTable();
      })
      .catch(function (err) {
        console.error('Employees error:', err);
        var tbody = document.getElementById('employees-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Failed to load employees.</td></tr>';
      });
  }

  function renderTable() {
    var tbody = document.getElementById('employees-body');
    if (!tbody) return;
    if (!employees.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No employees yet. Click "+ Add Employee" to get started.</td></tr>';
      return;
    }
    tbody.innerHTML = employees.map(function (emp) {
      var name = (emp.firstName || '') + ' ' + (emp.lastName || '');
      var status = emp.status || (emp.isActive === false ? 'Inactive' : 'Active');
      return '<tr>' +
        '<td>' + P.escapeHtml(name.trim()) + '</td>' +
        '<td>' + P.stateName(emp.state) + '</td>' +
        '<td>' + P.escapeHtml(emp.department || '--') + '</td>' +
        '<td style="text-transform:capitalize">' + (emp.payType || '--') + '</td>' +
        '<td>' + P.formatCurrency(emp.payRate) + (emp.payType === 'hourly' ? '/hr' : '/yr') + '</td>' +
        '<td>' + P.badgeHtml(status) + '</td>' +
      '</tr>';
    }).join('');
  }

  function openWizard() {
    wizardStep = 1;
    wizardData = {};
    var overlay = document.getElementById('emp-modal-overlay');
    if (overlay) overlay.classList.add('open');
    renderWizardStep();
  }

  function closeWizard() {
    var overlay = document.getElementById('emp-modal-overlay');
    if (overlay) overlay.classList.remove('open');
    wizardStep = 1;
    wizardData = {};
  }

  function renderWizardStep() {
    var title = document.getElementById('emp-modal-title');
    var body = document.getElementById('emp-modal-body');
    var nextBtn = document.getElementById('emp-next-btn');
    var prevBtn = document.getElementById('emp-prev-btn');

    var stepNames = ['Personal Info', 'Employment', 'Tax Info', 'Banking', 'Review & Submit'];
    if (title) title.textContent = 'Add Employee - Step ' + wizardStep + ' of 5: ' + stepNames[wizardStep - 1];
    if (prevBtn) prevBtn.style.display = wizardStep > 1 ? '' : 'none';
    if (nextBtn) nextBtn.textContent = wizardStep === 5 ? 'Submit' : 'Next';

    var html = '';

    if (wizardStep === 1) {
      html = '<div class="form-grid">' +
        '<div class="form-group"><label class="form-label">First Name *</label>' +
          '<input type="text" class="form-input" id="wiz-first-name" value="' + P.escapeHtml(wizardData.firstName || '') + '" required></div>' +
        '<div class="form-group"><label class="form-label">Last Name *</label>' +
          '<input type="text" class="form-input" id="wiz-last-name" value="' + P.escapeHtml(wizardData.lastName || '') + '" required></div>' +
        '<div class="form-group"><label class="form-label">Email *</label>' +
          '<input type="email" class="form-input" id="wiz-email" value="' + P.escapeHtml(wizardData.email || '') + '" required></div>' +
        '<div class="form-group"><label class="form-label">SSN</label>' +
          '<input type="text" class="form-input" id="wiz-ssn" value="' + P.escapeHtml(wizardData.ssn || '') + '" placeholder="XXX-XX-XXXX"></div>' +
        '<div class="form-group"><label class="form-label">Date of Birth</label>' +
          '<input type="date" class="form-input" id="wiz-dob" value="' + (wizardData.dob || '') + '"></div>' +
        '<div class="form-group"><label class="form-label">Address</label>' +
          '<input type="text" class="form-input" id="wiz-address" value="' + P.escapeHtml(wizardData.address || '') + '" placeholder="Street address"></div>' +
        '<div class="form-group"><label class="form-label">City</label>' +
          '<input type="text" class="form-input" id="wiz-city" value="' + P.escapeHtml(wizardData.city || '') + '"></div>' +
        '<div class="form-group"><label class="form-label">ZIP Code</label>' +
          '<input type="text" class="form-input" id="wiz-zip" value="' + P.escapeHtml(wizardData.zip || '') + '"></div>' +
      '</div>';
    } else if (wizardStep === 2) {
      html = '<div class="form-grid">' +
        '<div class="form-group"><label class="form-label">Job Title</label>' +
          '<input type="text" class="form-input" id="wiz-title" value="' + P.escapeHtml(wizardData.jobTitle || '') + '"></div>' +
        '<div class="form-group"><label class="form-label">Department</label>' +
          '<input type="text" class="form-input" id="wiz-department" value="' + P.escapeHtml(wizardData.department || '') + '"></div>' +
        '<div class="form-group"><label class="form-label">Pay Type *</label>' +
          '<select class="form-input" id="wiz-pay-type">' +
            '<option value="hourly"' + (wizardData.payType === 'hourly' ? ' selected' : '') + '>Hourly</option>' +
            '<option value="salary"' + (wizardData.payType === 'salary' ? ' selected' : '') + '>Salary</option>' +
          '</select></div>' +
        '<div class="form-group"><label class="form-label">Pay Rate *</label>' +
          '<input type="number" step="0.01" class="form-input" id="wiz-pay-rate" value="' + (wizardData.payRate || '') + '" placeholder="0.00"></div>' +
        '<div class="form-group"><label class="form-label">Pay Frequency</label>' +
          '<select class="form-input" id="wiz-frequency">' +
            '<option value="biweekly"' + (wizardData.payFrequency === 'biweekly' ? ' selected' : '') + '>Bi-Weekly</option>' +
            '<option value="weekly"' + (wizardData.payFrequency === 'weekly' ? ' selected' : '') + '>Weekly</option>' +
            '<option value="semimonthly"' + (wizardData.payFrequency === 'semimonthly' ? ' selected' : '') + '>Semi-Monthly</option>' +
            '<option value="monthly"' + (wizardData.payFrequency === 'monthly' ? ' selected' : '') + '>Monthly</option>' +
          '</select></div>' +
        '<div class="form-group"><label class="form-label">Start Date *</label>' +
          '<input type="date" class="form-input" id="wiz-start-date" value="' + (wizardData.startDate || '') + '"></div>' +
        '<div class="form-group"><label class="form-label">Work State *</label>' +
          '<select class="form-input" id="wiz-state">' + stateOptions() + '</select></div>' +
        '<div class="form-group"><label class="form-label">FLSA Status</label>' +
          '<select class="form-input" id="wiz-flsa">' +
            '<option value="non-exempt"' + (wizardData.flsaStatus === 'non-exempt' ? ' selected' : '') + '>Non-Exempt</option>' +
            '<option value="exempt"' + (wizardData.flsaStatus === 'exempt' ? ' selected' : '') + '>Exempt</option>' +
          '</select></div>' +
      '</div>';
    } else if (wizardStep === 3) {
      html = '<div class="form-grid">' +
        '<div class="form-group"><label class="form-label">Federal Filing Status</label>' +
          '<select class="form-input" id="wiz-filing-status">' +
            '<option value="single"' + (wizardData.filingStatus === 'single' ? ' selected' : '') + '>Single</option>' +
            '<option value="married"' + (wizardData.filingStatus === 'married' ? ' selected' : '') + '>Married Filing Jointly</option>' +
            '<option value="married_separate"' + (wizardData.filingStatus === 'married_separate' ? ' selected' : '') + '>Married Filing Separately</option>' +
            '<option value="head_of_household"' + (wizardData.filingStatus === 'head_of_household' ? ' selected' : '') + '>Head of Household</option>' +
          '</select></div>' +
        '<div class="form-group"><label class="form-label">Federal Allowances</label>' +
          '<input type="number" class="form-input" id="wiz-allowances" value="' + (wizardData.federalAllowances || 0) + '" min="0"></div>' +
        '<div class="form-group"><label class="form-label">Additional Federal Withholding</label>' +
          '<input type="number" step="0.01" class="form-input" id="wiz-add-withholding" value="' + (wizardData.additionalWithholding || 0) + '" min="0" placeholder="0.00"></div>' +
        '<div class="form-group"><label class="form-label">State Filing Status</label>' +
          '<select class="form-input" id="wiz-state-filing">' +
            '<option value="single"' + (wizardData.stateFilingStatus === 'single' ? ' selected' : '') + '>Single</option>' +
            '<option value="married"' + (wizardData.stateFilingStatus === 'married' ? ' selected' : '') + '>Married</option>' +
          '</select></div>' +
      '</div>';
    } else if (wizardStep === 4) {
      html = '<div class="form-grid">' +
        '<div class="form-group"><label class="form-label">Bank Routing Number</label>' +
          '<input type="text" class="form-input" id="wiz-routing" value="' + P.escapeHtml(wizardData.routingNumber || '') + '" placeholder="9 digits"></div>' +
        '<div class="form-group"><label class="form-label">Account Number</label>' +
          '<input type="text" class="form-input" id="wiz-account" value="' + P.escapeHtml(wizardData.accountNumber || '') + '"></div>' +
        '<div class="form-group"><label class="form-label">Account Type</label>' +
          '<select class="form-input" id="wiz-account-type">' +
            '<option value="checking"' + (wizardData.accountType === 'checking' ? ' selected' : '') + '>Checking</option>' +
            '<option value="savings"' + (wizardData.accountType === 'savings' ? ' selected' : '') + '>Savings</option>' +
          '</select></div>' +
      '</div>' +
      '<p style="color:var(--color-gray-500);margin-top:var(--space-md);font-size:var(--font-size-sm)">Banking information is optional and can be added later.</p>';
    } else if (wizardStep === 5) {
      html = '<div class="review-section">' +
        '<h4 style="margin-bottom:var(--space-md);color:var(--color-navy)">Review Employee Details</h4>' +
        '<div class="form-grid" style="gap:var(--space-sm)">' +
          reviewRow('Name', (wizardData.firstName || '') + ' ' + (wizardData.lastName || '')) +
          reviewRow('Email', wizardData.email) +
          reviewRow('State', P.stateName(wizardData.state || '')) +
          reviewRow('Department', wizardData.department) +
          reviewRow('Job Title', wizardData.jobTitle) +
          reviewRow('Pay Type', wizardData.payType) +
          reviewRow('Pay Rate', P.formatCurrency(wizardData.payRate)) +
          reviewRow('Pay Frequency', wizardData.payFrequency) +
          reviewRow('Start Date', P.formatDate(wizardData.startDate)) +
          reviewRow('FLSA Status', wizardData.flsaStatus) +
          reviewRow('Filing Status', wizardData.filingStatus) +
          reviewRow('Allowances', wizardData.federalAllowances) +
          reviewRow('Bank Account', wizardData.accountNumber ? '****' + (wizardData.accountNumber || '').slice(-4) : 'Not provided') +
        '</div>' +
      '</div>';
    }

    if (body) body.innerHTML = html;

    // Set select values that need post-render setting
    if (wizardStep === 2 && wizardData.state) {
      var stateEl = document.getElementById('wiz-state');
      if (stateEl) stateEl.value = wizardData.state;
    }
  }

  function reviewRow(label, value) {
    return '<div style="display:flex;justify-content:space-between;padding:var(--space-xs) 0;border-bottom:1px solid var(--color-gray-200)">' +
      '<span style="color:var(--color-gray-500)">' + label + '</span>' +
      '<span style="font-weight:500">' + P.escapeHtml(String(value || '--')) + '</span>' +
    '</div>';
  }

  function collectStepData() {
    var el = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; };

    if (wizardStep === 1) {
      wizardData.firstName = el('wiz-first-name');
      wizardData.lastName = el('wiz-last-name');
      wizardData.email = el('wiz-email');
      wizardData.ssn = el('wiz-ssn');
      wizardData.dob = el('wiz-dob');
      wizardData.address = el('wiz-address');
      wizardData.city = el('wiz-city');
      wizardData.zip = el('wiz-zip');
    } else if (wizardStep === 2) {
      wizardData.jobTitle = el('wiz-title');
      wizardData.department = el('wiz-department');
      wizardData.payType = el('wiz-pay-type');
      wizardData.payRate = parseFloat(el('wiz-pay-rate')) || 0;
      wizardData.payFrequency = el('wiz-frequency');
      wizardData.startDate = el('wiz-start-date');
      wizardData.state = el('wiz-state');
      wizardData.flsaStatus = el('wiz-flsa');
    } else if (wizardStep === 3) {
      wizardData.filingStatus = el('wiz-filing-status');
      wizardData.federalAllowances = parseInt(el('wiz-allowances'), 10) || 0;
      wizardData.additionalWithholding = parseFloat(el('wiz-add-withholding')) || 0;
      wizardData.stateFilingStatus = el('wiz-state-filing');
    } else if (wizardStep === 4) {
      wizardData.routingNumber = el('wiz-routing');
      wizardData.accountNumber = el('wiz-account');
      wizardData.accountType = el('wiz-account-type');
    }
  }

  function validateStep() {
    if (wizardStep === 1) {
      if (!wizardData.firstName || !wizardData.lastName) {
        P.showToast('First name and last name are required.', 'warning');
        return false;
      }
      if (!wizardData.email) {
        P.showToast('Email is required.', 'warning');
        return false;
      }
    } else if (wizardStep === 2) {
      if (!wizardData.payRate || wizardData.payRate <= 0) {
        P.showToast('Pay rate is required.', 'warning');
        return false;
      }
      if (!wizardData.state) {
        P.showToast('Work state is required.', 'warning');
        return false;
      }
    }
    return true;
  }

  function handleNext() {
    collectStepData();
    if (!validateStep()) return;

    if (wizardStep === 5) {
      submitEmployee();
      return;
    }
    wizardStep++;
    renderWizardStep();
  }

  function handlePrev() {
    collectStepData();
    if (wizardStep > 1) {
      wizardStep--;
      renderWizardStep();
    }
  }

  function submitEmployee() {
    var nextBtn = document.getElementById('emp-next-btn');
    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.textContent = 'Submitting...';
    }

    P.apiFetch('/employees', { method: 'POST', body: wizardData })
      .then(function () {
        P.showToast('Employee added successfully!', 'success');
        closeWizard();
        loadEmployees();
      })
      .catch(function (err) {
        P.showToast('Failed to add employee: ' + err.message, 'error');
      })
      .finally(function () {
        if (nextBtn) {
          nextBtn.disabled = false;
          nextBtn.textContent = 'Submit';
        }
      });
  }
})();
