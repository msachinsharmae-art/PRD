/* ═══════════════════════════════════════════════════
   PAGE: Configuration > Salary Structure
   ═══════════════════════════════════════════════════ */
window.Page_config_salary = {
  async render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Salary Structure</div>
          <div class="page-subtitle">Salary components and calculation reference</div>
        </div>
      </div>
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><h3>About Salary Components</h3></div>
        <div class="card-body">
          <p style="color:var(--color-text-muted);line-height:1.6;">
            Salary components define how employee compensation is structured and calculated.
            The pay engine automatically applies the correct calculation method for each component
            based on the employee's pay type (hourly or salary), hours worked, and applicable rules.
            These components are used during pay run processing to compute gross pay before taxes and deductions.
          </p>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Compensation Components</h3></div>
        <div class="card-body" style="padding:0;">
          <table class="data-table">
            <thead><tr>
              <th>Component</th>
              <th>Type</th>
              <th>Calculation Method</th>
              <th>Taxable</th>
              <th>Notes</th>
            </tr></thead>
            <tbody id="salary-body"></tbody>
          </table>
        </div>
      </div>
    `;

    const components = [
      {
        name: 'Base Pay',
        type: 'Earning',
        method: 'Hourly: rate x hours worked. Salary: annual / pay periods.',
        taxable: true,
        notes: 'Primary compensation component for all employees.'
      },
      {
        name: 'Overtime Pay',
        type: 'Earning',
        method: 'OT hours x (base rate x multiplier). Multiplier per state OT plan (1.5x or 2x).',
        taxable: true,
        notes: 'Non-exempt employees only. Calculated by OT engine based on state rules.'
      },
      {
        name: 'Shift Differential',
        type: 'Earning',
        method: 'Additional flat rate or percentage added per hour for qualifying shifts.',
        taxable: true,
        notes: 'Applies to evening, night, or weekend shifts if configured.'
      },
      {
        name: 'Holiday Pay',
        type: 'Earning',
        method: 'Hourly: rate x holiday hours (typically 1.5x or 2x). Salary: included in regular pay.',
        taxable: true,
        notes: 'Per company holiday calendar. Premium rate optional.'
      },
      {
        name: 'Sick Pay',
        type: 'Earning',
        method: 'Regular rate x sick hours used from accrued balance.',
        taxable: true,
        notes: 'Subject to state sick leave mandates (e.g., CA, WA, NY).'
      },
      {
        name: 'Vacation Pay',
        type: 'Earning',
        method: 'Regular rate x vacation hours used from accrued balance.',
        taxable: true,
        notes: 'PTO payout on termination required in some states (e.g., CA).'
      },
      {
        name: 'Bonus',
        type: 'Earning',
        method: 'Flat amount or percentage of base pay. Can be discretionary or non-discretionary.',
        taxable: true,
        notes: 'Non-discretionary bonuses must be included in OT regular rate calculation.'
      },
      {
        name: 'Commission',
        type: 'Earning',
        method: 'Percentage of sales or flat amount per unit/deal.',
        taxable: true,
        notes: 'Subject to federal supplemental wage withholding (22% flat or aggregate method).'
      }
    ];

    document.getElementById('salary-body').innerHTML = components.map(c => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td><span class="badge badge-active">${c.type}</span></td>
        <td style="max-width:300px;font-size:12px;">${c.method}</td>
        <td>${c.taxable ? '<span class="badge badge-approved">Yes</span>' : '<span class="badge badge-inactive">No</span>'}</td>
        <td style="max-width:250px;font-size:12px;color:var(--color-text-muted);">${c.notes}</td>
      </tr>
    `).join('');
  }
};
