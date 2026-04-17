const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { processCommand, getAllSlugs } = require('./ai-engine');
const { handleChat } = require('./agent-engine');
const { SLUG_CATEGORIES } = require('./slugs');
const { SAMPLE_DATA } = require('./sample-data');

const usPayrollRoutes = require('./us-payroll/routes');

const app = express();
const PORT = 3500;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Mount US Payroll API routes
app.use('/api/us-payroll', usPayrollRoutes);

// Load templates from JSON
const templatesPath = path.join(__dirname, 'templates-data.json');
let templates = JSON.parse(fs.readFileSync(templatesPath, 'utf-8'));

// ── GET /api/templates — list all templates ──
app.get('/api/templates', (req, res) => {
  const list = templates.map(t => ({
    template_id: t.template_id,
    template_name: t.template_name,
    template_slug: t.template_slug,
    status: t.status,
  }));
  res.json({ success: true, templates: list });
});

// ── GET /api/templates/:id — get single template with HTML ──
app.get('/api/templates/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const tmpl = templates.find(t => t.template_id === id);
  if (!tmpl) return res.status(404).json({ success: false, error: 'Template not found' });
  res.json({ success: true, template: tmpl });
});

// ── POST /api/templates/:id/update — save modified HTML ──
app.post('/api/templates/:id/update', (req, res) => {
  const id = parseInt(req.params.id);
  const { template_html } = req.body;
  const idx = templates.findIndex(t => t.template_id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Template not found' });

  templates[idx].template_html = template_html;
  fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2), 'utf-8');
  res.json({ success: true, message: 'Template saved' });
});

// ── POST /api/ai/command — process AI command ──
app.post('/api/ai/command', async (req, res) => {
  const { template_id, command, template_html } = req.body;
  if (!command || !template_html) {
    return res.status(400).json({ success: false, error: 'Command and template_html are required' });
  }

  const result = processCommand(template_html, command);
  if (result.error === 'undo_request') {
    return res.json({ success: true, action: 'undo', description: 'Use Ctrl+Z or click Undo to revert changes.' });
  }
  // Handle create_template action — build a new template and return it
  if (result.action === 'create_template') {
    const sections = result.sections || ['employee_info', 'earnings', 'deductions'];
    const newHtml = buildNewTemplateHtml('Your Company Name', sections);
    return res.json({
      success: true,
      html: newHtml,
      description: result.description,
      action: 'create_template',
    });
  }
  // Handle set_status action — update template status in store
  if (result.action === 'set_status') {
    const id = parseInt(template_id);
    const idx = templates.findIndex(t => t.template_id === id);
    if (idx > -1) {
      templates[idx].status = result.status;
      fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2), 'utf-8');
    }
    return res.json({ success: true, description: result.description, action: 'set_status' });
  }
  // Handle reset_template action — restore default HTML
  if (result.action === 'reset_template') {
    const defaultHtml = buildNewTemplateHtml('Your Company Name', ['employee_info', 'earnings', 'deductions']);
    return res.json({ success: true, html: defaultHtml, description: result.description, action: 'reset_template' });
  }
  // Handle claude_fallback — forward to Claude API for complex commands
  if (result.action === 'claude_fallback') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.json({ success: false, error: `I couldn't understand that command with the built-in parser, and Claude API fallback is not configured.\nSet ANTHROPIC_API_KEY environment variable to enable smart AI fallback.\n\nOtherwise, try simpler commands like:\n• "Add PAN below employee name"\n• "Change font to Arial"\n• "Hide earnings section"` });
    }
    // Call Claude API
    try {
      const claudeResult = await handleClaudeFallback(template_html, command, apiKey);
      return res.json(claudeResult);
    } catch (err) {
      return res.json({ success: false, error: 'Claude API error: ' + err.message });
    }
  }

  if (result.error) {
    return res.json({ success: false, error: result.error });
  }

  res.json({
    success: true,
    html: result.html,
    description: result.description,
    action: result.parsed?.action,
  });
});

// ── GET /api/slugs — all available slugs ──
app.get('/api/slugs', (req, res) => {
  res.json({ success: true, categories: SLUG_CATEGORIES });
});

// ── GET /api/sample-data — sample data for preview ──
app.get('/api/sample-data', (req, res) => {
  res.json({ success: true, data: SAMPLE_DATA });
});

// ── POST /api/templates/create — create a new template from scratch ──
app.post('/api/templates/create', (req, res) => {
  const { template_name, sections } = req.body;
  const maxId = templates.length > 0 ? Math.max(...templates.map(t => t.template_id)) : 0;
  const newId = maxId + 1;
  const name = template_name || `Custom Template ${newId}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

  // Build template HTML based on requested sections
  const html = buildNewTemplateHtml(name, sections || ['employee_info', 'earnings', 'deductions']);

  const newTemplate = {
    template_id: newId,
    template_name: name,
    template_slug: slug,
    status: 'draft',
    template_html: html,
  };

  templates.push(newTemplate);
  fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2), 'utf-8');
  res.json({ success: true, template: newTemplate });
});

/**
 * Build a new salary slip template HTML from scratch.
 * @param {string} companyName - Name to show in the header
 * @param {string[]} sections - Which sections to include
 */
function buildNewTemplateHtml(companyName, sections = []) {
  const secs = new Set(sections.map(s => s.toLowerCase()));

  let employeeRows = '';
  if (secs.has('employee_info') || secs.has('personal') || secs.has('employee')) {
    employeeRows = `
        <tr>
            <td class="bordered-cell"><strong>Employee Name</strong></td>
            <td class="bordered-cell">{{single.emp_name}}</td>
            <td class="bordered-cell"><strong>Employee Code</strong></td>
            <td class="bordered-cell">{{single.emp_code}}</td>
        </tr>
        <tr>
            <td class="bordered-cell"><strong>Designation</strong></td>
            <td class="bordered-cell">{{single.designation_name}}</td>
            <td class="bordered-cell"><strong>Department</strong></td>
            <td class="bordered-cell">{{single.department_name}}</td>
        </tr>
        <tr>
            <td class="bordered-cell"><strong>Date of Joining</strong></td>
            <td class="bordered-cell">{{single.joining_date}}</td>
            <td class="bordered-cell"><strong>Location</strong></td>
            <td class="bordered-cell">{{single.location_name}}</td>
        </tr>`;
  }

  let bankRows = '';
  if (secs.has('bank') || secs.has('bank_details') || secs.has('banking')) {
    bankRows = `
        <tr>
            <td class="bordered-cell"><strong>Bank Name</strong></td>
            <td class="bordered-cell">{{single.BANK_NAME}}</td>
            <td class="bordered-cell"><strong>Account Number</strong></td>
            <td class="bordered-cell">{{single.ACCOUNT_NUMBER}}</td>
        </tr>
        <tr>
            <td class="bordered-cell"><strong>IFSC Code</strong></td>
            <td class="bordered-cell">{{single.IFSC_CODE}}</td>
            <td class="bordered-cell"><strong>Payment Type</strong></td>
            <td class="bordered-cell">{{single.PAYMENT_TYPE}}</td>
        </tr>`;
  }

  let statutoryRows = '';
  if (secs.has('statutory') || secs.has('statutory_ids') || secs.has('ids')) {
    statutoryRows = `
        <tr>
            <td class="bordered-cell"><strong>PAN Number</strong></td>
            <td class="bordered-cell">{{single.PAN_CARD}}</td>
            <td class="bordered-cell"><strong>UAN Number</strong></td>
            <td class="bordered-cell">{{single.UAN_NUMBER}}</td>
        </tr>
        <tr>
            <td class="bordered-cell"><strong>ESI Number</strong></td>
            <td class="bordered-cell">{{single.ESI_NUMBER}}</td>
            <td class="bordered-cell"><strong>PF Number</strong></td>
            <td class="bordered-cell">{{single.PF_NUMBER}}</td>
        </tr>`;
  }

  let attendanceRows = '';
  if (secs.has('attendance') || secs.has('days') || secs.has('attendance_days')) {
    attendanceRows = `
        <tr>
            <td class="bordered-cell"><strong>Working Days</strong></td>
            <td class="bordered-cell">{{single.WORKING_DAYS}}</td>
            <td class="bordered-cell"><strong>Present Days</strong></td>
            <td class="bordered-cell">{{single.PRESENT_DAYS}}</td>
        </tr>
        <tr>
            <td class="bordered-cell"><strong>Payable Days</strong></td>
            <td class="bordered-cell">{{single.PAYABLE_DAYS}}</td>
            <td class="bordered-cell"><strong>LOP Days</strong></td>
            <td class="bordered-cell">{{single.LWP}}</td>
        </tr>`;
  }

  let earningsSection = '';
  if (secs.has('earnings') || secs.has('salary')) {
    earningsSection = `
    <tr>
      <td colspan="4" style="padding:0;">
        <table cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
          <thead>
            <tr class="earnings-header">
              <th style="text-align:left; padding:8px 10px; border:1px solid lightgray;">Earnings</th>
              <th style="text-align:right; padding:8px 10px; border:1px solid lightgray;">Amount</th>
            </tr>
          </thead>
          <tbody>
            {{#each new_obj.earnings}}
            <tr style="border-bottom:1px solid #eee;">
              <td style="padding:6px 10px; font-weight:bold; border-right:1px solid lightgray;">{{this.HEAD_NAME}}</td>
              <td style="padding:6px 10px; text-align:right;">{{this.monthly_payable}}</td>
            </tr>
            {{/each}}
            <tr style="border-top:2px solid #333; font-weight:bold;">
              <td style="padding:8px 10px; border-right:1px solid lightgray;">Total Earnings</td>
              <td style="padding:8px 10px; text-align:right;">{{new_obj.gross}}</td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>`;
  }

  let deductionsSection = '';
  if (secs.has('deductions') || secs.has('deduction')) {
    deductionsSection = `
    <tr>
      <td colspan="4" style="padding:0;">
        <table cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
          <thead>
            <tr class="earnings-header">
              <th style="text-align:left; padding:8px 10px; border:1px solid lightgray;">Deductions</th>
              <th style="text-align:right; padding:8px 10px; border:1px solid lightgray;">Amount</th>
            </tr>
          </thead>
          <tbody>
            {{#each new_obj.deductions}}
            <tr style="border-bottom:1px solid #eee;">
              <td style="padding:6px 10px; font-weight:bold; border-right:1px solid lightgray;">{{this.HEAD_NAME}}</td>
              <td style="padding:6px 10px; text-align:right;">{{this.monthly_payable}}</td>
            </tr>
            {{/each}}
            <tr style="border-top:2px solid #333; font-weight:bold;">
              <td style="padding:8px 10px; border-right:1px solid lightgray;">Total Deductions</td>
              <td style="padding:8px 10px; text-align:right;">{{new_obj.deduction}}</td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>`;
  }

  let netPayRow = '';
  if (secs.has('earnings') || secs.has('deductions') || secs.has('net_pay') || secs.has('salary')) {
    netPayRow = `
    <tr style="background:#e8f5e9;">
      <td colspan="2" style="padding:12px 10px; font-weight:bold; font-size:14px; border:1px solid lightgray;">Net Payable</td>
      <td colspan="2" style="padding:12px 10px; text-align:right; font-weight:bold; font-size:14px; border:1px solid lightgray;">{{new_obj.net_payable}}</td>
    </tr>
    <tr>
      <td colspan="4" style="padding:8px 10px; font-style:italic; border:1px solid lightgray;">Amount in words: {{single.amount_in_words}}</td>
    </tr>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; padding: 10px; }
  .main-table { width: 100%; border-collapse: collapse; }
  .bordered-cell { padding: 6px 10px; border: 1px solid lightgray; }
  .earnings-header { background-color: #1565c0; color: white; }
  .earnings-header th { font-weight: 600; }
</style>
</head>
<body>
  <table class="main-table" cellpadding="0" cellspacing="0">
    <tbody>
      <tr>
        <td colspan="4" style="padding:12px 10px; text-align:center; border:1px solid lightgray;">
          <strong style="font-size:16px;">{{org_details.ORG_NAME}}</strong><br>
          <span style="font-size:11px; color:#666;">{{org_details.ORG_ADDRESS}}, {{org_details.ORG_CITY}} - {{org_details.ORG_ZIP_CODE}}</span>
        </td>
      </tr>
      <tr>
        <td colspan="4" style="padding:8px 10px; text-align:center; background:#f5f5f5; border:1px solid lightgray; font-weight:bold;">
          Salary Slip for {{month}} {{year}}
        </td>
      </tr>${employeeRows}${bankRows}${statutoryRows}${attendanceRows}${earningsSection}${deductionsSection}${netPayRow}
      <tr>
        <td colspan="4" style="padding:20px 10px; text-align:right; font-size:11px; color:#888; border:1px solid lightgray;">
          This is a system generated payslip and does not require signature.
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
}

// ── POST /api/templates/:id/duplicate — clone a template ──
app.post('/api/templates/:id/duplicate', (req, res) => {
  const id = parseInt(req.params.id);
  const tmpl = templates.find(t => t.template_id === id);
  if (!tmpl) return res.status(404).json({ success: false, error: 'Template not found' });

  const maxId = Math.max(...templates.map(t => t.template_id));
  const newTemplate = {
    ...tmpl,
    template_id: maxId + 1,
    template_name: `${tmpl.template_name} (Copy)`,
    template_slug: `${tmpl.template_slug}_copy_${maxId + 1}`,
  };
  templates.push(newTemplate);
  fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2), 'utf-8');
  res.json({ success: true, template: newTemplate });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.get('/editor', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'editor.html'));
});

app.get('/bot', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'bot.html'));
});

// US Payroll SPA — all routes serve the single shell index.html
app.get('/us-payroll', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'us-payroll', 'index.html'));
});
app.get('/us-payroll/*', (req, res) => {
  // Serve actual static files (css, js, images), fallback to SPA shell
  const filePath = path.join(__dirname, '..', 'frontend', req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  res.sendFile(path.join(__dirname, '..', 'frontend', 'us-payroll', 'index.html'));
});

// ── POST /api/bot/chat — proxy to Claude API for payslip bot ──
app.post('/api/bot/chat', async (req, res) => {
  const { system, message } = req.body;
  if (!message) return res.status(400).json({ success: false, error: 'Message is required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'ANTHROPIC_API_KEY not set. Run: set ANTHROPIC_API_KEY=your-key' });
  }

  try {
    const https = require('https');
    const payload = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system: system || '',
      messages: [{ role: 'user', content: message }],
    });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(payload),
        },
      };
      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { reject(new Error('Invalid API response')); }
        });
      });
      request.on('error', reject);
      request.write(payload);
      request.end();
    });

    if (result.error) {
      return res.json({ success: false, error: result.error.message || 'API error' });
    }

    const reply = result.content?.[0]?.text || '';
    res.json({ success: true, reply });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// CLAUDE API FALLBACK — handles complex commands the regex parser can't
// ═══════════════════════════════════════════════════════════════════

function buildSlugSummary() {
  return Object.entries(SLUG_CATEGORIES).map(([key, cat]) => {
    const slugs = (cat.slugs || []).map(s => `${s.slug} (${s.description || ''})`).join(', ');
    return `${cat.label || key}: ${slugs}`;
  }).join('\n');
}

function getClaudeSystemPrompt() {
  return `You are an expert salary slip HTML template editor. You receive a Handlebars HTML template and a user command. You must modify the HTML and return the result.

RULES:
1. Return ONLY a JSON object: {"html": "...modified HTML...", "description": "what you did"}
2. NO markdown fences, NO explanation outside JSON
3. Preserve ALL existing template structure, classes, styles
4. Use the exact Handlebars slugs from the slug list below
5. When adding fields to employee info sections, match the existing row format (same <td> classes, same structure)
6. For templates with two-column employee sections (left table + right table inside <table class="emp_details">), balance fields between left and right inner tables
7. When user says "fix alignment" or "balance", redistribute fields evenly between left and right columns
8. Earnings use {{#each new_obj.earnings}}...{{/each}} loops with {{this.HEAD_NAME}} and {{this.monthly_payable}}
9. Deductions use {{#each new_obj.deductions}}...{{/each}} loops
10. Single-value fields use {{single.FIELD_NAME}} format
11. Organization fields use {{org_details.FIELD_NAME}} format
12. NEVER remove or modify {{#each}} loops unless explicitly asked
13. NEVER invent slugs — only use ones from the provided list
14. When moving fields between left/right columns, remove from source and add to target
15. Always return the COMPLETE modified HTML, not just a snippet

AVAILABLE SLUGS:
${buildSlugSummary()}`;
}

async function handleClaudeFallback(templateHtml, command, apiKey) {
  const https = require('https');

  // Truncate template if too long to fit in context
  const maxLen = 15000;
  const tmplForPrompt = templateHtml.length > maxLen
    ? templateHtml.slice(0, maxLen) + '\n<!-- ... truncated ... -->'
    : templateHtml;

  const userMessage = `CURRENT TEMPLATE HTML:\n\`\`\`html\n${tmplForPrompt}\n\`\`\`\n\nUSER COMMAND: "${command}"\n\nReturn the modified HTML as JSON: {"html": "...", "description": "..."}`;

  const payload = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    system: getClaudeSystemPrompt(),
    messages: [{ role: 'user', content: userMessage }],
  });

  const result = await new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Invalid API response')); }
      });
    });
    request.on('error', reject);
    request.write(payload);
    request.end();
  });

  if (result.error) {
    throw new Error(result.error.message || 'Claude API error');
  }

  const raw = (result.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = raw.match(/\{[\s\S]*"html"[\s\S]*\}/);
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]); } catch {}
    }
    if (!parsed) {
      return { success: false, error: 'Claude returned an unparseable response. Try rephrasing your command.' };
    }
  }

  if (parsed.html) {
    // If template was truncated, apply only the changes Claude made to the visible part
    // For safety, if Claude returned full HTML, use it
    return {
      success: true,
      html: parsed.html,
      description: parsed.description || 'Modified by AI',
      action: 'claude_fallback',
    };
  }

  return { success: false, error: parsed.description || parsed.message || 'Claude could not process that command.' };
}

app.listen(PORT, () => {
  console.log(`\n  Payroll Template Customizer running at:`);
  console.log(`  → http://localhost:${PORT}\n`);
});
