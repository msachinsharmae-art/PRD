/* ═══════════════════════════════════════════════════
   PAGE: Configuration > Pay Frequency Rules
   ═══════════════════════════════════════════════════ */
window.Page_config_pay_frequency = {
  async render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Pay Frequency Rules</div>
          <div class="page-subtitle">State-mandated pay frequency requirements and final pay rules</div>
        </div>
      </div>
      <div class="card">
        <div class="card-body" style="padding:0;">
          <table class="data-table" id="freq-table">
            <thead><tr>
              <th>State</th>
              <th>Allowed Frequencies</th>
              <th>Final Pay (Termination)</th>
              <th>Final Pay (Resignation)</th>
              <th>PTO Payout</th>
            </tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
      <div class="card" style="margin-top:20px;">
        <div class="card-header"><h3>Notes</h3></div>
        <div class="card-body">
          <ul style="font-size:12px;color:var(--color-text-muted);line-height:1.8;margin:0;padding-left:20px;">
            <li>Final pay deadlines are statutory minimums. Employers may pay sooner.</li>
            <li>Some states impose penalties for late final pay (e.g., CA: waiting time penalties of full daily wages per day late, up to 30 days).</li>
            <li>PTO payout requirements depend on whether the state considers PTO as earned wages.</li>
            <li>Check local ordinances for additional requirements (e.g., city-specific rules).</li>
          </ul>
        </div>
      </div>
    `;

    const stateRules = [
      {
        state: 'CA',
        frequencies: 'Semi-monthly required for non-exempt; monthly for exempt if paid by 26th',
        termination: 'Immediately on last day of work',
        resignation: '72 hours (no notice); last day of work (72+ hrs notice)',
        pto: 'Required — PTO is earned wages, must be paid out'
      },
      {
        state: 'TX',
        frequencies: 'Semi-monthly (twice per month) or more frequently',
        termination: 'Within 6 calendar days',
        resignation: 'Next regular payday',
        pto: 'Only if company policy promises payout'
      },
      {
        state: 'FL',
        frequencies: 'No mandate — employer discretion',
        termination: 'Next regular payday',
        resignation: 'Next regular payday',
        pto: 'Only if company policy promises payout'
      },
      {
        state: 'WA',
        frequencies: 'Monthly required (at minimum)',
        termination: 'Next regular payday',
        resignation: 'Next regular payday',
        pto: 'Required if company policy provides PTO'
      },
      {
        state: 'NY',
        frequencies: 'Weekly required for manual/hourly workers; semi-monthly for clerical/other',
        termination: 'Next regular payday',
        resignation: 'Next regular payday',
        pto: 'Required if company policy promises payout'
      },
      {
        state: 'GA',
        frequencies: 'No mandate — employer discretion',
        termination: 'Next regular payday',
        resignation: 'Next regular payday',
        pto: 'Only if company policy promises payout'
      }
    ];

    document.querySelector('#freq-table tbody').innerHTML = stateRules.map(r => `
      <tr>
        <td><strong>${r.state}</strong></td>
        <td style="max-width:220px;font-size:12px;">${r.frequencies}</td>
        <td style="max-width:200px;font-size:12px;">${r.termination}</td>
        <td style="max-width:200px;font-size:12px;">${r.resignation}</td>
        <td style="max-width:200px;font-size:12px;">${r.pto}</td>
      </tr>
    `).join('');
  }
};
