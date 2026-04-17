// run-test-suite.js
// ═══════════════════════════════════════════════════════════════
// TEST SUITE RUNNER - Run all tests and generate reports
// Usage: node run-test-suite.js [options]
// ═══════════════════════════════════════════════════════════════
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

// Parse command line arguments
const options = {
  module: args.find(a => a.startsWith('--module='))?.split('=')[1] || 'all',
  headed: args.includes('--headed'),
  debug: args.includes('--debug'),
  grep: args.find(a => a.startsWith('--grep='))?.split('=')[1],
};

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           🎭 TIMESHEET ESS TEST SUITE RUNNER                  ║
╠═══════════════════════════════════════════════════════════════╣
║  Module: ${options.module.padEnd(50)}║
║  Headed: ${String(options.headed).padEnd(50)}║
║  Debug:  ${String(options.debug).padEnd(50)}║
╚═══════════════════════════════════════════════════════════════╝
`);

// Build command
let command = 'npx playwright test';

// Filter by module (uses Playwright projects) or file pattern
if (options.module !== 'all') {
  command += ` --project=${options.module}`;
}

// Filter by test name
if (options.grep) {
  command += ` --grep "${options.grep}"`;
}

// Headed mode
if (options.headed) {
  command += ' --headed';
}

// Debug mode
if (options.debug) {
  command += ' --debug';
}

console.log(`\n📋 Running: ${command}\n`);
console.log('─'.repeat(60) + '\n');

try {
  execSync(command, {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }
  });
} catch (error) {
  // Tests might fail, but we still want to generate report
  console.log('\n⚠️ Some tests failed - generating report anyway...\n');
}

// Check if report exists
const reportPath = 'test-results/latest-report.md';
if (fs.existsSync(reportPath)) {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    📊 REPORTS GENERATED                       ║
╠═══════════════════════════════════════════════════════════════╣
║  📄 Markdown: test-results/latest-report.md                   ║
║  🌐 HTML:     npx playwright show-report                      ║
║  📁 JSON:     test-results/results.json                       ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

// Print usage help
console.log(`
💡 Usage Examples:
─────────────────────────────────────────────────────────────────
  node run-test-suite.js                    # Run all tests
  node run-test-suite.js --module=payroll   # Run payroll tests only
  node run-test-suite.js --headed           # Run with browser visible
  node run-test-suite.js --debug            # Run in debug mode
  node run-test-suite.js --grep="Navigate"  # Run tests matching pattern
─────────────────────────────────────────────────────────────────
`);
