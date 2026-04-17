/* ═══════════════════════════════════════════════════
   PAGE: Configuration > Overtime Plans
   ═══════════════════════════════════════════════════ */
window.Page_config_ot_plans = {
  async render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-title">Overtime Plans</div>
          <div class="page-subtitle">State-specific overtime rules and thresholds</div>
        </div>
        <button class="btn btn-outline" disabled title="Coming soon">+ Create Custom OT Plan</button>
      </div>
      <div id="ot-plans-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:20px;"></div>
    `;

    const plans = [
      {
        state: 'Federal (Default)',
        badge: 'active',
        description: 'FLSA default overtime rules apply to all non-exempt employees unless a state provides greater protections.',
        rules: [
          { threshold: '40 hours/week', multiplier: '1.5x', scope: 'Weekly' }
        ],
        notes: 'No daily overtime requirement at the federal level.'
      },
      {
        state: 'California',
        badge: 'approved',
        description: 'California has the most comprehensive OT rules in the nation, including daily overtime and double-time provisions.',
        rules: [
          { threshold: '8 hours/day', multiplier: '1.5x', scope: 'Daily OT' },
          { threshold: '12 hours/day', multiplier: '2.0x', scope: 'Daily DT' },
          { threshold: '40 hours/week', multiplier: '1.5x', scope: 'Weekly OT' },
          { threshold: '7th consecutive day (first 8 hrs)', multiplier: '1.5x', scope: '7th Day OT' },
          { threshold: '7th consecutive day (after 8 hrs)', multiplier: '2.0x', scope: '7th Day DT' }
        ],
        notes: 'Daily and weekly OT do not stack. The higher rate applies.'
      },
      {
        state: 'Texas',
        badge: 'active',
        description: 'Texas follows federal FLSA rules with no additional state overtime requirements.',
        rules: [
          { threshold: '40 hours/week', multiplier: '1.5x', scope: 'Weekly' }
        ],
        notes: 'No state-specific overtime law.'
      },
      {
        state: 'Florida',
        badge: 'active',
        description: 'Florida follows federal FLSA rules with no additional state overtime requirements.',
        rules: [
          { threshold: '40 hours/week', multiplier: '1.5x', scope: 'Weekly' }
        ],
        notes: 'No state-specific overtime law.'
      },
      {
        state: 'Washington',
        badge: 'approved',
        description: 'Washington follows the federal 40-hour weekly threshold but has specific agricultural and seasonal worker provisions.',
        rules: [
          { threshold: '40 hours/week', multiplier: '1.5x', scope: 'Weekly' }
        ],
        notes: 'Agricultural workers phasing in OT by 2024. Domestic workers covered.'
      },
      {
        state: 'New York',
        badge: 'approved',
        description: 'New York follows the 40-hour weekly threshold. Residential employees of covered employers have a 44-hour threshold.',
        rules: [
          { threshold: '40 hours/week', multiplier: '1.5x', scope: 'Weekly' },
          { threshold: '44 hours/week (residential)', multiplier: '1.5x', scope: 'Weekly (residential)' }
        ],
        notes: 'NYC, Long Island, and Westchester may have additional labor rules.'
      },
      {
        state: 'Georgia',
        badge: 'active',
        description: 'Georgia follows federal FLSA rules with no additional state overtime requirements.',
        rules: [
          { threshold: '40 hours/week', multiplier: '1.5x', scope: 'Weekly' }
        ],
        notes: 'No state-specific overtime law.'
      }
    ];

    document.getElementById('ot-plans-grid').innerHTML = plans.map(plan => `
      <div class="card">
        <div class="card-header">
          <h3>${plan.state}</h3>
          <span class="badge badge-${plan.badge}">${plan.rules.length > 1 ? 'Complex' : 'Standard'}</span>
        </div>
        <div class="card-body">
          <p style="font-size:12px;color:var(--color-text-muted);margin-bottom:12px;">${plan.description}</p>
          <table class="data-table" style="margin-bottom:12px;">
            <thead><tr><th>Scope</th><th>Threshold</th><th>Multiplier</th></tr></thead>
            <tbody>
              ${plan.rules.map(r => `
                <tr>
                  <td>${r.scope}</td>
                  <td>${r.threshold}</td>
                  <td><strong>${r.multiplier}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p style="font-size:11px;color:var(--color-text-muted);"><em>${plan.notes}</em></p>
        </div>
      </div>
    `).join('');
  }
};
