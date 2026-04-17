/* ═══════════════════════════════════════════════════
   PAGE: Configuration > Deductions
   ═══════════════════════════════════════════════════ */
window.Page_config_deductions = {
  async render(container) {
    const { fmt } = window.Utils;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Deduction Types</div>
          <div class="page-subtitle">Available deduction types and 2026 annual limits</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Pre-Tax Deductions</h3></div>
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead><tr>
              <th>Name</th>
              <th>Tax Treatment</th>
              <th>Annual Limit</th>
              <th>FICA Exempt</th>
              <th>Notes</th>
            </tr></thead>
            <tbody id="pretax-body"></tbody>
          </table>
        </div>
      </div>
      <div class="card" style="margin-top:20px;">
        <div class="card-header"><h3>Post-Tax Deductions</h3></div>
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead><tr>
              <th>Name</th>
              <th>Tax Treatment</th>
              <th>Annual Limit</th>
              <th>FICA Exempt</th>
              <th>Notes</th>
            </tr></thead>
            <tbody id="posttax-body"></tbody>
          </table>
        </div>
      </div>
    `;

    const preTax = [
      {
        name: '401(k) Traditional',
        treatment: 'Pre-tax',
        limit: '$23,500',
        ficaExempt: false,
        notes: 'Reduces federal and state taxable income. Catch-up: $7,500 (age 50+). Subject to FICA.'
      },
      {
        name: 'Health Insurance',
        treatment: 'Pre-tax (Section 125)',
        limit: 'No statutory limit',
        ficaExempt: true,
        notes: 'Employer-sponsored plan under cafeteria plan. Exempt from federal income tax and FICA.'
      },
      {
        name: 'Dental Insurance',
        treatment: 'Pre-tax (Section 125)',
        limit: 'No statutory limit',
        ficaExempt: true,
        notes: 'Employer-sponsored dental plan under cafeteria plan.'
      },
      {
        name: 'Vision Insurance',
        treatment: 'Pre-tax (Section 125)',
        limit: 'No statutory limit',
        ficaExempt: true,
        notes: 'Employer-sponsored vision plan under cafeteria plan.'
      },
      {
        name: 'HSA (Health Savings Account)',
        treatment: 'Pre-tax',
        limit: '$4,300 individual / $8,550 family',
        ficaExempt: true,
        notes: 'Must have HDHP. Catch-up: $1,000 (age 55+). Triple tax advantage.'
      },
      {
        name: 'FSA (Flexible Spending Account)',
        treatment: 'Pre-tax',
        limit: '$3,200',
        ficaExempt: true,
        notes: 'Use-it-or-lose-it (up to $640 rollover allowed). Cannot combine with HSA for medical.'
      }
    ];

    const postTax = [
      {
        name: 'Roth 401(k)',
        treatment: 'Post-tax (Roth)',
        limit: '$23,500 (combined with Traditional 401k)',
        ficaExempt: false,
        notes: 'Contributions from after-tax dollars. Qualified distributions are tax-free.'
      },
      {
        name: 'Garnishments — Child Support',
        treatment: 'Post-tax (involuntary)',
        limit: '50-65% of disposable earnings',
        ficaExempt: false,
        notes: '50% if supporting another family, 60% if not. Add 5% if 12+ weeks in arrears.'
      },
      {
        name: 'Garnishments — Consumer Debt',
        treatment: 'Post-tax (involuntary)',
        limit: '25% of disposable earnings',
        ficaExempt: false,
        notes: 'Lesser of 25% disposable earnings or amount exceeding 30x federal minimum wage.'
      }
    ];

    function renderRows(items) {
      return items.map(d => `
        <tr>
          <td><strong>${d.name}</strong></td>
          <td><span class="badge ${d.treatment.includes('Pre-tax') ? 'badge-approved' : 'badge-review'}">${d.treatment}</span></td>
          <td style="white-space:nowrap;">${d.limit}</td>
          <td>${d.ficaExempt ? '<span class="badge badge-approved">Yes</span>' : '<span class="badge badge-inactive">No</span>'}</td>
          <td style="max-width:300px;font-size:12px;color:var(--color-text-muted);">${d.notes}</td>
        </tr>
      `).join('');
    }

    document.getElementById('pretax-body').innerHTML = renderRows(preTax);
    document.getElementById('posttax-body').innerHTML = renderRows(postTax);
  }
};
