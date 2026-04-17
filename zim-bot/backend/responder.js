// Natural Language Response Builder for Zim bot
// Focused, path-based answers from the correct module only

// Keywords that indicate which module the question belongs to
const CORE_HR_KEYWORDS = [
  'employee', 'add employee', 'new employee', 'employee master', 'employee profile',
  'transfer', 'separation', 'resign', 'termination', 'probation', 'confirmation',
  'id card', 'suspend', 'bulk upload employee', 'org chart', 'organization chart',
  'roles', 'permissions', 'role',
  'leave', 'attendance', 'shift', 'roster', 'holiday', 'regularization',
  'on-duty', 'on duty', 'wfh', 'work from home', 'geo-fence', 'geofencing', 'geo fence',
  'leave rule', 'leave type', 'casual leave', 'sick leave', 'earned leave', 'sandwich rule',
  'clubbing rule', 'carry forward', 'negative balance', 'half day', 'short leave',
  'workflow', 'approval', 'approval level', 'email template', 'email trigger',
  'document', 'document library', 'hr docs',
  'entity', 'location', 'department', 'designation', 'organization structure',
  'employee code', 'property library', 'teams', 'mobile settings',
  'core hr', 'core-hr',
];

const PAYROLL_KEYWORDS = [
  'payroll', 'salary', 'ctc', 'gross', 'net pay', 'salary slip', 'payslip', 'pay slip',
  'run payroll', 'process payroll', 'salary processing',
  'pf', 'provident fund', 'epf', 'esi', 'esic', 'pt', 'professional tax',
  'lwf', 'labour welfare', 'labor welfare', 'tds', 'income tax', 'tax',
  'minimum wage', 'compliance',
  'arrear', 'arrears', 'fnf', 'f&f', 'full and final', 'full & final', 'final settlement',
  'gratuity', 'notice period', 'penalty',
  'loan', 'advance', 'emi', 'reimbursement', 'expense', 'claim',
  'salary structure', 'salary component', 'salary head', 'earnings', 'deduction',
  'bonus', 'overtime', 'ot plan', 'miscellaneous head',
  'investment declaration', 'tax declaration', 'form 16', 'tax regime',
  'restructure', 'freeze restructure', 'salary approval', 'payroll approver',
  'entity registration', 'entity settings', 'payroll settings', 'global settings',
  'tally', 'zoho', 'integration', 'custom report', 'draft report', 'bank sheet',
  'vehicle perquisite', 'previous employer', 'action log',
  'pay frequency', 'attendance cycle', 'pay days',
  'copilot mode', 'email library',
];

const GREETINGS = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening', 'namaste'];
const THANKS = ['thanks', 'thank you', 'thankyou', 'thx', 'appreciate'];
const FAREWELLS = ['bye', 'goodbye', 'see you', 'later', 'take care'];

/** Detect which module the question is about */
function detectModule(query) {
  const q = query.toLowerCase().trim();

  let coreScore = 0;
  let payrollScore = 0;

  for (const kw of CORE_HR_KEYWORDS) {
    if (q.includes(kw)) coreScore += kw.split(' ').length; // multi-word matches score higher
  }
  for (const kw of PAYROLL_KEYWORDS) {
    if (q.includes(kw)) payrollScore += kw.split(' ').length;
  }

  // Strong signal: explicit module mention
  if (q.includes('core hr') || q.includes('core-hr')) coreScore += 10;
  if (q.includes('payroll')) payrollScore += 10;
  if (q.includes('workflow')) coreScore += 5;

  // If one module clearly wins, filter to that module
  if (coreScore > 0 && payrollScore === 0) return 'Core HR & Workflows';
  if (payrollScore > 0 && coreScore === 0) return 'Payroll';
  if (coreScore > payrollScore * 2) return 'Core HR & Workflows';
  if (payrollScore > coreScore * 2) return 'Payroll';

  // Ambiguous or no match — return null (search both)
  return null;
}

/** Extract the Path: line from chunk text */
function extractPath(text) {
  const match = text.match(/Path:\s*(.+?)(?:\n|$)/);
  return match ? match[1].trim() : null;
}

/** Clean up chunk text for display — remove the Path: line since we show it separately */
function cleanText(text) {
  return text
    .replace(/^Path:\s*.+?\n/m, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Truncate text to reasonable length */
function truncate(text, maxLen = 700) {
  if (text.length <= maxLen) return text;
  const cut = text.substring(0, maxLen);
  const lastPeriod = cut.lastIndexOf('.');
  const lastNewline = cut.lastIndexOf('\n');
  const breakPoint = Math.max(lastPeriod, lastNewline);
  return (breakPoint > maxLen * 0.4 ? cut.substring(0, breakPoint + 1) : cut) + '...';
}

/** Build a natural language response from search results */
function buildResponse(query, results) {
  const q = query.toLowerCase().trim();

  // Handle greetings
  if (GREETINGS.some(g => q.includes(g)) && q.length < 30) {
    return {
      answer: "Hey there! I'm **Zim**, your Zimyo knowledge assistant.\n\nI can help you with:\n\n• **Core HR** — Employee masters, profiles, transfers, separation, probation\n• **Leave & Attendance** — Leave rules, shifts, rosters, attendance tracking\n• **Workflows** — Approval chains, email templates\n• **Payroll** — Run payroll, salary structure, CTC, compliance (PF, ESI, PT, LWF)\n• **F&F Settlement** — Full & Final, gratuity, leave encashment\n• **Reports & Config** — Custom reports, integrations, settings\n\nAsk me anything — I'll give you the exact path and steps!",
      sources: [],
    };
  }

  // Handle thanks
  if (THANKS.some(t => q.includes(t)) && q.length < 30) {
    return {
      answer: "You're welcome! Feel free to ask anything else about Core HR or Payroll.",
      sources: [],
    };
  }

  // Handle farewells
  if (FAREWELLS.some(f => q.includes(f)) && q.length < 20) {
    return {
      answer: "Goodbye! I'm always here when you need help with Zimyo.",
      sources: [],
    };
  }

  // No results
  if (!results || results.length === 0) {
    return {
      answer: "I couldn't find specific information about that.\n\nTry asking about:\n• **Core HR** — \"How to add employee?\", \"Leave rules setup\", \"Shift management\"\n• **Payroll** — \"How to run payroll?\", \"PF configuration\", \"F&F process\"\n• **Workflows** — \"Approval workflow setup\", \"Email templates\"\n\nBe specific — mention the feature name and I'll give you the exact path!",
      sources: [],
    };
  }

  // Build focused response from the TOP result
  const top = results[0];
  const navPath = extractPath(top.chunk.text);
  const mainText = cleanText(top.chunk.text);
  const source = top.chunk.source;

  let answer = '';

  // Module badge
  answer += `**${source}**\n\n`;

  // Navigation path (the key improvement)
  if (navPath) {
    answer += `**Path:** \`${navPath}\`\n\n`;
  }

  // Main content
  answer += truncate(mainText, 800);

  // If there's a second result FROM THE SAME MODULE and it's closely related, add it
  if (results.length > 1 && results[1].chunk.source === source && results[1].score > results[0].score * 0.5) {
    const extraPath = extractPath(results[1].chunk.text);
    const extraText = cleanText(results[1].chunk.text);
    answer += '\n\n---\n\n';
    if (extraPath) answer += `**Also see:** \`${extraPath}\`\n\n`;
    answer += truncate(extraText, 400);
  }

  return {
    answer,
    sources: [source],
  };
}

module.exports = { buildResponse, detectModule };
