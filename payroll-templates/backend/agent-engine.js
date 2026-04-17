/**
 * Conversational Agent Engine for Payslip Template Customizer
 *
 * A human-like agent that guides users through template creation
 * and customization using natural, layman-friendly conversation.
 *
 * Maintains session state so multi-turn conversations work naturally.
 */

const { processCommand } = require('./ai-engine');

// ═══════════════════════════════════════════════════════════════════
// SESSION STORE — in-memory conversation state per session
// ═══════════════════════════════════════════════════════════════════

const sessions = new Map();
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      state: 'idle',         // idle | create_name | create_sections | create_section_fields | create_confirm | customizing
      history: [],           // conversation history
      templateName: null,
      selectedSections: [],
      currentSectionIdx: 0,
      sectionFields: {},     // section → selected fields
      lastActivity: Date.now(),
    });
  }
  const s = sessions.get(sessionId);
  s.lastActivity = Date.now();
  return s;
}

// Cleanup stale sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastActivity > SESSION_TTL) sessions.delete(id);
  }
}, 5 * 60 * 1000);


// ═══════════════════════════════════════════════════════════════════
// SECTION & FIELD DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

const SECTIONS = {
  employee_info: {
    label: 'Employee Information',
    description: 'Name, code, designation, department, joining date, etc.',
    fields: [
      { id: 'emp_name', label: 'Employee Name', slug: '{{single.emp_name}}', default: true },
      { id: 'emp_code', label: 'Employee Code', slug: '{{single.emp_code}}', default: true },
      { id: 'designation', label: 'Designation', slug: '{{single.designation_name}}', default: true },
      { id: 'department', label: 'Department', slug: '{{single.department_name}}', default: true },
      { id: 'doj', label: 'Date of Joining', slug: '{{single.joining_date}}', default: true },
      { id: 'location', label: 'Location', slug: '{{single.location_name}}', default: false },
      { id: 'email', label: 'Email', slug: '{{single.emp_email}}', default: false },
      { id: 'mobile', label: 'Mobile Number', slug: '{{single.mobile_no}}', default: false },
      { id: 'dob', label: 'Date of Birth', slug: '{{single.date_of_birth}}', default: false },
      { id: 'gender', label: 'Gender', slug: '{{single.gender}}', default: false },
      { id: 'father_name', label: "Father's Name", slug: '{{single.father_name}}', default: false },
      { id: 'manager', label: 'Reporting Manager', slug: '{{single.REPORTING_MANAGER}}', default: false },
    ],
  },
  earnings: {
    label: 'Earnings',
    description: 'Basic, HRA, allowances and all earning components',
    fields: 'loop', // uses {{#each new_obj.earnings}}
    extraOptions: [
      { id: 'ytd', label: 'Show YTD (Year-to-Date) column' },
      { id: 'arrears', label: 'Show Arrears column' },
    ],
  },
  deductions: {
    label: 'Deductions',
    description: 'PF, ESI, TDS, PT and all deduction components',
    fields: 'loop', // uses {{#each new_obj.deductions}}
    extraOptions: [
      { id: 'ytd', label: 'Show YTD column' },
    ],
  },
  bank_details: {
    label: 'Bank Details',
    description: 'Bank name, account number, IFSC, payment type',
    fields: [
      { id: 'bank_name', label: 'Bank Name', slug: '{{single.BANK_NAME}}', default: true },
      { id: 'account_no', label: 'Account Number', slug: '{{single.ACCOUNT_NUMBER}}', default: true },
      { id: 'ifsc', label: 'IFSC Code', slug: '{{single.IFSC_CODE}}', default: true },
      { id: 'payment_type', label: 'Payment Type', slug: '{{single.PAYMENT_TYPE}}', default: true },
      { id: 'account_holder', label: 'Account Holder Name', slug: '{{single.ACCOUNT_HOLDER_NAME}}', default: false },
      { id: 'account_type', label: 'Account Type', slug: '{{single.ACCOUNT_TYPE}}', default: false },
    ],
  },
  statutory_ids: {
    label: 'Statutory IDs',
    description: 'PAN, Aadhaar, UAN, ESI number, PF number',
    fields: [
      { id: 'pan', label: 'PAN Number', slug: '{{single.PAN_CARD}}', default: true },
      { id: 'aadhaar', label: 'Aadhaar Number', slug: '{{single.AADHAR_CARD}}', default: false },
      { id: 'uan', label: 'UAN Number', slug: '{{single.UAN_NUMBER}}', default: true },
      { id: 'esi_no', label: 'ESI Number', slug: '{{single.ESI_NUMBER}}', default: true },
      { id: 'pf_no', label: 'PF Number', slug: '{{single.PF_NUMBER}}', default: true },
    ],
  },
  attendance: {
    label: 'Attendance / Days',
    description: 'Working days, present days, payable days, LOP',
    fields: [
      { id: 'working', label: 'Working Days', slug: '{{single.WORKING_DAYS}}', default: true },
      { id: 'present', label: 'Present Days', slug: '{{single.PRESENT_DAYS}}', default: true },
      { id: 'payable', label: 'Payable Days', slug: '{{single.PAYABLE_DAYS}}', default: true },
      { id: 'lop', label: 'LOP Days', slug: '{{single.LWP}}', default: true },
      { id: 'absence', label: 'Absence Days', slug: '{{single.ABSENCE_DAYS}}', default: false },
      { id: 'weekly_off', label: 'Weekly Off', slug: '{{single.WEEKLY_OFF}}', default: false },
      { id: 'holidays', label: 'Holidays', slug: '{{single.HOLIDAYS}}', default: false },
    ],
  },
  net_pay: {
    label: 'Net Pay / Summary',
    description: 'Net payable amount, amount in words, gross & total deductions',
    fields: 'auto', // always included with earnings/deductions
  },
  company_header: {
    label: 'Company Header',
    description: 'Company name, address, logo at the top',
    fields: 'auto', // always present
  },
};


// ═══════════════════════════════════════════════════════════════════
// INTENT DETECTION — understand what the user wants
// ═══════════════════════════════════════════════════════════════════

function detectIntent(message) {
  const m = message.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy|sup|hola)\b/i.test(m)) {
    return { intent: 'greeting' };
  }

  // Thank you / bye
  if (/^(thanks|thank\s*you|thx|ty|bye|goodbye|see\s*you|that'?s?\s*(all|it)|done|okay\s*thanks)/i.test(m)) {
    return { intent: 'thanks' };
  }

  // Help
  if (/^(help|what\s*can\s*you|how\s*do|what\s*do\s*you|show\s*me\s*what)/i.test(m)) {
    return { intent: 'help' };
  }

  // Create new template
  if (/\b(create|build|make|start|new|generate|design)\b.*(template|payslip|salary\s*slip|slip)/i.test(m) ||
      /\b(template|payslip|salary\s*slip)\b.*(create|build|make|start|new|from\s*scratch)/i.test(m) ||
      /^(create|build|make|start)\s*(a\s*)?(new\s*)?$/i.test(m)) {
    return { intent: 'create' };
  }

  // Yes / confirm / agreement
  if (/^(yes|yeah|yep|yup|sure|ok|okay|go\s*ahead|confirm|do\s*it|looks?\s*good|perfect|great|sounds?\s*good|correct|right|absolutely|definitely|proceed)/i.test(m)) {
    return { intent: 'yes' };
  }

  // No / cancel
  if (/^(no|nah|nope|cancel|never\s*mind|skip|don'?t|stop)/i.test(m)) {
    return { intent: 'no' };
  }

  // "All" / "everything"
  if (/^(all|everything|all\s*of\s*them|every\s*one|include\s*all|add\s*all|select\s*all|the\s*defaults?|default|basics?|basic\s*ones?)\s*$/i.test(m)) {
    return { intent: 'all' };
  }

  // Number selection (e.g., "1, 3, 5" or "1 2 3")
  const numMatch = m.match(/^[\d,\s]+$/);
  if (numMatch) {
    const nums = m.match(/\d+/g).map(Number);
    return { intent: 'selection', numbers: nums };
  }

  // Field/section names as selection (e.g., "employee info, earnings, bank")
  const sectionKeywords = ['employee', 'earning', 'deduction', 'bank', 'statutory', 'attendance', 'net pay', 'company', 'header', 'salary', 'all'];
  const foundSections = sectionKeywords.filter(kw => m.includes(kw));
  if (foundSections.length > 0 && !(/\b(change|modify|update|set|make|add|remove|delete|rename|swap|move|increase|decrease)\b/i.test(m))) {
    return { intent: 'section_selection', keywords: foundSections };
  }

  // Customization command (anything else — pass to AI engine)
  return { intent: 'customize', message };
}


// ═══════════════════════════════════════════════════════════════════
// RESPONSE GENERATORS — human-like, friendly messages
// ═══════════════════════════════════════════════════════════════════

function greetingResponse() {
  const greetings = [
    "Hey there! I'm your payslip template assistant. I can help you create a brand new template from scratch or customize the one you're working on. What would you like to do?",
    "Hi! I'm here to help you with your salary slip template. Want to create a new one or make changes to this one? Just tell me in plain words!",
    "Hello! Think of me as your payslip design buddy. I can build templates from scratch or tweak anything — colors, layout, fields, you name it. What do you need?",
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

function helpResponse() {
  return {
    text: "Here's what I can help you with:",
    options: [
      { label: 'Create a new template from scratch', action: 'create' },
      { label: 'Add or remove fields', action: 'send', value: 'What fields can you add?' },
      { label: 'Change colors & styling', action: 'send', value: 'Change background color to blue' },
      { label: 'Change fonts & sizes', action: 'send', value: 'Change font size to 14px' },
      { label: 'Change borders & spacing', action: 'send', value: 'Add borders to all sections' },
      { label: 'Rename labels', action: 'send', value: 'Rename Basic to Basic Pay' },
    ],
    hint: "Or just type what you want in plain English — like \"make the header bigger\" or \"add PAN number\". I'll figure it out!",
  };
}

function thanksResponse() {
  const responses = [
    "You're welcome! If you need anything else, just ask. Happy to help anytime!",
    "Glad I could help! Your template is looking great. Come back anytime you want to make changes.",
    "No problem! Remember, I'm always here if you want to tweak anything. Just type away!",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}


// ═══════════════════════════════════════════════════════════════════
// CREATE TEMPLATE FLOW — guided step-by-step
// ═══════════════════════════════════════════════════════════════════

function startCreateFlow(session) {
  session.state = 'create_name';
  session.selectedSections = [];
  session.sectionFields = {};
  session.currentSectionIdx = 0;
  session.templateName = null;

  return {
    text: "Let's create a new payslip template together! First things first — what would you like to name this template?",
    hint: "e.g., \"Monthly Salary Slip\", \"Standard Payslip\", or anything you like",
  };
}

function handleCreateName(session, message) {
  session.templateName = message.trim();
  session.state = 'create_sections';

  const sectionList = Object.entries(SECTIONS)
    .filter(([k]) => k !== 'company_header' && k !== 'net_pay')
    .map(([key, sec], i) => ({
      number: i + 1,
      id: key,
      label: sec.label,
      description: sec.description,
    }));

  return {
    text: `Great name — "${session.templateName}"! Now, let's pick the sections you want in your payslip. Here are the available ones:`,
    sections: sectionList,
    hint: "Tell me which ones you want — you can say the numbers (like \"1, 2, 3, 4\"), names (like \"employee info, earnings, bank details\"), or just say \"all\" to include everything.",
    quickReplies: [
      { label: 'All sections', value: 'all' },
      { label: 'Just the basics (Employee + Earnings + Deductions)', value: '1, 2, 3' },
    ],
  };
}

function handleSectionSelection(session, intent, message) {
  const sectionKeys = Object.keys(SECTIONS).filter(k => k !== 'company_header' && k !== 'net_pay');
  let selected = [];

  if (intent.intent === 'all') {
    selected = [...sectionKeys];
  } else if (intent.intent === 'selection' && intent.numbers) {
    selected = intent.numbers
      .filter(n => n >= 1 && n <= sectionKeys.length)
      .map(n => sectionKeys[n - 1]);
  } else if (intent.intent === 'section_selection' && intent.keywords) {
    const keywordMap = {
      'employee': 'employee_info',
      'earning': 'earnings',
      'salary': 'earnings',
      'deduction': 'deductions',
      'bank': 'bank_details',
      'statutory': 'statutory_ids',
      'attendance': 'attendance',
      'net pay': 'net_pay',
      'all': 'ALL',
    };
    for (const kw of intent.keywords) {
      const mapped = keywordMap[kw];
      if (mapped === 'ALL') { selected = [...sectionKeys]; break; }
      if (mapped && sectionKeys.includes(mapped)) selected.push(mapped);
    }
  } else {
    // Try to parse from raw text
    const m = message.toLowerCase();
    for (const key of sectionKeys) {
      const sec = SECTIONS[key];
      if (m.includes(key.replace('_', ' ')) || m.includes(sec.label.toLowerCase())) {
        selected.push(key);
      }
    }
  }

  if (selected.length === 0) {
    return {
      text: "Hmm, I didn't quite catch which sections you want. Could you try again? You can say numbers (1-6), names, or just \"all\".",
      stay: true,
    };
  }

  // Remove duplicates
  session.selectedSections = [...new Set(selected)];

  // Find first section that has customizable fields
  return moveToNextFieldSection(session);
}

function moveToNextFieldSection(session) {
  while (session.currentSectionIdx < session.selectedSections.length) {
    const secKey = session.selectedSections[session.currentSectionIdx];
    const sec = SECTIONS[secKey];

    if (Array.isArray(sec.fields)) {
      session.state = 'create_section_fields';
      const fieldList = sec.fields.map((f, i) => ({
        number: i + 1,
        id: f.id,
        label: f.label,
        isDefault: f.default,
      }));

      const defaultNames = sec.fields.filter(f => f.default).map(f => f.label).join(', ');

      return {
        text: `For **${sec.label}**, which fields do you want to show? Here are the options:`,
        fields: fieldList,
        hint: `The common ones are: ${defaultNames}. You can pick by number, name, say "all", or "defaults" for the common ones.`,
        quickReplies: [
          { label: 'Defaults', value: 'defaults' },
          { label: 'All fields', value: 'all' },
        ],
      };
    }

    // Loop-based or auto sections — skip field selection
    session.sectionFields[secKey] = 'all';
    session.currentSectionIdx++;
  }

  // All sections configured — show summary
  return showCreateSummary(session);
}

function handleFieldSelection(session, intent, message) {
  const secKey = session.selectedSections[session.currentSectionIdx];
  const sec = SECTIONS[secKey];
  const fields = sec.fields;
  let selectedFields = [];

  const m = message.toLowerCase().trim();

  if (intent.intent === 'all') {
    selectedFields = fields.map(f => f.id);
  } else if (m === 'defaults' || m === 'default' || m === 'basic' || m === 'basics' || m === 'common') {
    selectedFields = fields.filter(f => f.default).map(f => f.id);
  } else if (intent.intent === 'selection' && intent.numbers) {
    selectedFields = intent.numbers
      .filter(n => n >= 1 && n <= fields.length)
      .map(n => fields[n - 1].id);
  } else {
    // Try matching field names from message
    for (const f of fields) {
      if (m.includes(f.label.toLowerCase()) || m.includes(f.id.replace('_', ' '))) {
        selectedFields.push(f.id);
      }
    }
    // If still nothing matched but user said yes/sure, use defaults
    if (selectedFields.length === 0 && /^(yes|sure|ok|okay|go|yep)/i.test(m)) {
      selectedFields = fields.filter(f => f.default).map(f => f.id);
    }
  }

  if (selectedFields.length === 0) {
    return {
      text: `I didn't catch which fields you want for ${sec.label}. Could you try again? Say numbers, names, "all", or "defaults".`,
      stay: true,
    };
  }

  session.sectionFields[secKey] = selectedFields;
  session.currentSectionIdx++;

  return moveToNextFieldSection(session);
}

function showCreateSummary(session) {
  session.state = 'create_confirm';

  const summary = session.selectedSections.map(key => {
    const sec = SECTIONS[key];
    const fields = session.sectionFields[key];
    let fieldDesc = '';
    if (fields === 'all') {
      fieldDesc = '(all standard fields)';
    } else if (Array.isArray(fields)) {
      const names = fields.map(fid => {
        const f = sec.fields.find(x => x.id === fid);
        return f ? f.label : fid;
      });
      fieldDesc = names.join(', ');
    }
    return { section: sec.label, fields: fieldDesc };
  });

  return {
    text: `Here's what your template "${session.templateName}" will look like:`,
    summary,
    extras: [
      'Company header with name & address (always included)',
      'Net payable row with amount in words (auto-included with earnings/deductions)',
      'Footer disclaimer',
    ],
    hint: "Does this look good? Say \"yes\" to create it, or tell me what you'd like to change.",
    quickReplies: [
      { label: 'Yes, create it!', value: 'yes' },
      { label: 'Start over', value: 'no' },
    ],
  };
}


// ═══════════════════════════════════════════════════════════════════
// TEMPLATE HTML BUILDER — builds from agent selections
// ═══════════════════════════════════════════════════════════════════

function buildTemplateFromAgent(session) {
  const secs = session.selectedSections;
  const fields = session.sectionFields;

  // Helper to build info rows (2 fields per row)
  function buildInfoRows(secKey) {
    const sec = SECTIONS[secKey];
    const selectedIds = fields[secKey];
    if (!Array.isArray(sec.fields) || !Array.isArray(selectedIds)) return '';

    const selected = selectedIds
      .map(id => sec.fields.find(f => f.id === id))
      .filter(Boolean);

    let rows = '';
    for (let i = 0; i < selected.length; i += 2) {
      const f1 = selected[i];
      const f2 = selected[i + 1];
      rows += `        <tr>\n`;
      rows += `            <td class="bordered-cell"><strong>${f1.label}</strong></td>\n`;
      rows += `            <td class="bordered-cell">${f1.slug}</td>\n`;
      if (f2) {
        rows += `            <td class="bordered-cell"><strong>${f2.label}</strong></td>\n`;
        rows += `            <td class="bordered-cell">${f2.slug}</td>\n`;
      } else {
        rows += `            <td class="bordered-cell"></td>\n`;
        rows += `            <td class="bordered-cell"></td>\n`;
      }
      rows += `        </tr>\n`;
    }
    return rows;
  }

  let employeeRows = secs.includes('employee_info') ? buildInfoRows('employee_info') : '';
  let bankRows = secs.includes('bank_details') ? buildInfoRows('bank_details') : '';
  let statutoryRows = secs.includes('statutory_ids') ? buildInfoRows('statutory_ids') : '';
  let attendanceRows = secs.includes('attendance') ? buildInfoRows('attendance') : '';

  let earningsSection = '';
  if (secs.includes('earnings')) {
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
  if (secs.includes('deductions')) {
    deductionsSection = `
    <tr>
      <td colspan="4" style="padding:0;">
        <table cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
          <thead>
            <tr class="deductions-header earnings-header">
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
  if (secs.includes('earnings') || secs.includes('deductions')) {
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
      </tr>
${employeeRows}${bankRows}${statutoryRows}${attendanceRows}${earningsSection}${deductionsSection}${netPayRow}
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


// ═══════════════════════════════════════════════════════════════════
// MAIN CHAT HANDLER — processes each message
// ═══════════════════════════════════════════════════════════════════

function handleChat(sessionId, message, templateHtml) {
  const session = getSession(sessionId);
  const intent = detectIntent(message);

  // Add to history
  session.history.push({ role: 'user', message });

  let response;

  // ── State machine ──
  switch (session.state) {

    case 'idle':
    case 'customizing':
      if (intent.intent === 'greeting') {
        response = { type: 'text', text: greetingResponse() };
      } else if (intent.intent === 'thanks') {
        response = { type: 'text', text: thanksResponse() };
      } else if (intent.intent === 'help') {
        response = { type: 'help', ...helpResponse() };
      } else if (intent.intent === 'create') {
        response = { type: 'flow', ...startCreateFlow(session) };
      } else {
        // Pass to AI engine for customization
        session.state = 'customizing';
        response = handleCustomization(session, message, templateHtml);
      }
      break;

    case 'create_name':
      if (intent.intent === 'no') {
        session.state = 'idle';
        response = { type: 'text', text: "No worries, cancelled! What else can I help you with?" };
      } else {
        response = { type: 'flow', ...handleCreateName(session, message) };
      }
      break;

    case 'create_sections':
      if (intent.intent === 'no') {
        session.state = 'idle';
        response = { type: 'text', text: "Alright, template creation cancelled. Let me know if you want to start again or customize the current one!" };
      } else {
        const result = handleSectionSelection(session, intent, message);
        if (result.stay) {
          response = { type: 'text', text: result.text };
        } else {
          response = { type: 'flow', ...result };
        }
      }
      break;

    case 'create_section_fields':
      if (intent.intent === 'no' || message.toLowerCase() === 'skip') {
        // Skip this section's field customization, use defaults
        const secKey = session.selectedSections[session.currentSectionIdx];
        const sec = SECTIONS[secKey];
        if (Array.isArray(sec.fields)) {
          session.sectionFields[secKey] = sec.fields.filter(f => f.default).map(f => f.id);
        }
        session.currentSectionIdx++;
        const result = moveToNextFieldSection(session);
        response = { type: 'flow', ...result };
      } else {
        const result = handleFieldSelection(session, intent, message);
        if (result.stay) {
          response = { type: 'text', text: result.text };
        } else {
          response = { type: 'flow', ...result };
        }
      }
      break;

    case 'create_confirm':
      if (intent.intent === 'yes') {
        const html = buildTemplateFromAgent(session);
        const name = session.templateName;
        session.state = 'customizing';
        response = {
          type: 'create',
          text: `Your template "${name}" is ready! I've loaded it into the editor. You can see the preview on the right.\n\nNow you can customize it however you want — change colors, fonts, borders, add/remove fields, resize things... just tell me what you need!`,
          html,
          templateName: name,
          quickReplies: [
            { label: 'Change header color', value: 'Change the header background color to dark blue' },
            { label: 'Add company logo', value: 'Add company logo' },
            { label: 'Increase font size', value: 'Increase font size to 13px' },
            { label: 'Add borders to all cells', value: 'Add solid borders to all table cells' },
          ],
        };
      } else if (intent.intent === 'no') {
        session.state = 'idle';
        session.selectedSections = [];
        session.sectionFields = {};
        session.currentSectionIdx = 0;
        response = { type: 'text', text: "No problem! Let's start fresh. Want to create a new template or customize the current one?" };
      } else {
        response = { type: 'text', text: "Just say \"yes\" to create the template, or \"no\" to start over. You can also tell me what you'd like to change in the plan." };
      }
      break;

    default:
      session.state = 'idle';
      response = { type: 'text', text: "Something went off track. Let's reset — what would you like to do?" };
  }

  session.history.push({ role: 'assistant', message: response.text || '' });
  return response;
}


// ═══════════════════════════════════════════════════════════════════
// CUSTOMIZATION HANDLER — wraps ai-engine with friendly responses
// ═══════════════════════════════════════════════════════════════════

function handleCustomization(session, message, templateHtml) {
  if (!templateHtml) {
    return {
      type: 'text',
      text: "It looks like there's no template loaded. Would you like to create a new one from scratch?",
      quickReplies: [
        { label: 'Yes, create new', value: 'create a new template' },
      ],
    };
  }

  const result = processCommand(templateHtml, message);

  if (result.error === 'undo_request') {
    return {
      type: 'undo',
      text: "Got it! I've reverted your last change. Use Ctrl+Z for quick undo anytime.",
    };
  }

  if (result.action === 'create_template') {
    return {
      type: 'text',
      text: "I can help you create a template! Let me walk you through it step by step so you get exactly what you need.",
      redirect: 'create',
    };
  }

  if (result.error) {
    // Try to give a helpful suggestion
    const suggestions = getSuggestions(message);
    return {
      type: 'error',
      text: `Hmm, I'm not sure how to do that. ${result.error}`,
      suggestions,
      hint: "Try being more specific — like \"change the header background color to navy blue\" or \"add PAN number in employee info section\".",
    };
  }

  // Success! Add a friendly follow-up
  const followUp = getFollowUp(result.parsed?.action, message);

  return {
    type: 'success',
    text: `Done! ${result.description}`,
    html: result.html,
    followUp,
    action: result.parsed?.action,
  };
}

function getSuggestions(message) {
  const m = message.toLowerCase();
  const suggestions = [];

  if (/color|colour/i.test(m)) {
    suggestions.push({ label: 'Change header color', value: 'Change background color of header to blue' });
    suggestions.push({ label: 'Change text color', value: 'Change text color of earnings to dark gray' });
  }
  if (/size|big|small|font/i.test(m)) {
    suggestions.push({ label: 'Increase font size', value: 'Increase font size to 14px' });
    suggestions.push({ label: 'Change header font size', value: 'Set font size of header to 16px' });
  }
  if (/add|field|show/i.test(m)) {
    suggestions.push({ label: 'Add PAN number', value: 'Add PAN number' });
    suggestions.push({ label: 'Add all bank details', value: 'Add all bank details' });
  }
  if (/border|line/i.test(m)) {
    suggestions.push({ label: 'Add borders', value: 'Add borders to earnings section' });
  }
  if (/width|wide|narrow/i.test(m)) {
    suggestions.push({ label: 'Change width', value: 'Set width of employee info to 100%' });
  }

  if (suggestions.length === 0) {
    suggestions.push(
      { label: 'Add a field', value: 'Add PAN number in employee info' },
      { label: 'Change color', value: 'Change header background to blue' },
      { label: 'Change font', value: 'Change font to Poppins' },
    );
  }

  return suggestions;
}

function getFollowUp(action, message) {
  const followUps = {
    style: "Want to change anything else — colors, fonts, borders, spacing?",
    targeted_style: "Looking good! Want to style any other section?",
    color: "Nice color choice! Anything else to adjust?",
    font_size: "Font size updated! Want me to change it for other sections too?",
    add: "Field added! Need any more fields or want to rearrange things?",
    bulk_add: "All fields added! Want to customize their arrangement or styling?",
    remove: "Removed! Anything else you'd like to take out or change?",
    rename: "Renamed! Any other labels to update?",
    border: "Borders updated! Want to adjust their color or thickness?",
    width: "Width changed! How's it looking in the preview?",
    padding: "Spacing adjusted! Check the preview — want more or less?",
    margin: "Margins updated! Anything else?",
    swap: "Swapped! The layout looking right?",
    align: "Alignment changed! Anything else to adjust?",
    bold: "Text is now bold! Any other styling changes?",
  };

  return followUps[action] || "How's that looking? Tell me if you want to tweak anything else!";
}


// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

module.exports = { handleChat };
