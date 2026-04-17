// @ts-check
// Custom Playwright Reporter — sends all test results to Mixpanel automatically
// No changes needed in individual test files — this hooks into the test runner.

const Mixpanel = require('mixpanel');

const MIXPANEL_TOKEN = 'c8367a475a78f263cdbd22d8eb561de3';

const mixpanel = Mixpanel.init(MIXPANEL_TOKEN, {
  host: 'api-eu.mixpanel.com',
});

const DISTINCT_ID = 'zimyo-qa-playwright';

/** Detect which Zimyo module a test belongs to based on file path and test name */
function detectModule(filePath, testName) {
  const combined = `${filePath} ${testName}`.toLowerCase();
  if (combined.includes('payroll') || combined.includes('salary') || combined.includes('ctc')) return 'Payroll';
  if (combined.includes('employee') || combined.includes('core-hr') || combined.includes('core_hr')) return 'Core HR';
  if (combined.includes('timesheet') || combined.includes('timelog') || combined.includes('worklog')) return 'Timesheet';
  if (combined.includes('attendance') || combined.includes('leave') || combined.includes('shift')) return 'Leave & Attendance';
  if (combined.includes('workflow') || combined.includes('approval')) return 'Workflows';
  if (combined.includes('login') || combined.includes('auth')) return 'Auth';
  if (combined.includes('ess')) return 'ESS';
  return 'General';
}

class MixpanelReporter {
  constructor() {
    this.suiteStartTime = null;
    this.results = { total: 0, passed: 0, failed: 0, skipped: 0 };
    this.suiteName = '';
  }

  onBegin(config, suite) {
    this.suiteStartTime = Date.now();
    this.suiteName = config.projects?.map(p => p.name).join(', ') || 'playwright-suite';
    const totalTests = suite.allTests().length;

    console.log(`[Mixpanel] Tracking suite: ${this.suiteName} (${totalTests} tests)`);

    mixpanel.track('Test Suite Started', {
      distinct_id: DISTINCT_ID,
      source: 'playwright-tests',
      suite_name: this.suiteName,
      total_tests: totalTests,
      timestamp: new Date().toISOString(),
    });
  }

  onTestBegin(test) {
    const module = detectModule(test.location.file, test.title);

    mixpanel.track('Test Started', {
      distinct_id: DISTINCT_ID,
      source: 'playwright-tests',
      test_name: test.title,
      module: module,
      file: test.location.file.split(/[/\\]/).slice(-2).join('/'),
      timestamp: new Date().toISOString(),
    });
  }

  onTestEnd(test, result) {
    this.results.total++;
    const status = result.status; // 'passed', 'failed', 'timedOut', 'skipped'

    if (status === 'passed') this.results.passed++;
    else if (status === 'failed' || status === 'timedOut') this.results.failed++;
    else if (status === 'skipped') this.results.skipped++;

    const module = detectModule(test.location.file, test.title);
    const duration = result.duration;

    const properties = {
      distinct_id: DISTINCT_ID,
      source: 'playwright-tests',
      test_name: test.title,
      status: status,
      module: module,
      file: test.location.file.split(/[/\\]/).slice(-2).join('/'),
      duration_ms: duration,
      duration_sec: (duration / 1000).toFixed(1),
      retry: result.retry,
      timestamp: new Date().toISOString(),
    };

    // Add error details for failed tests
    if (status === 'failed' || status === 'timedOut') {
      const errorMsg = result.errors?.map(e => e.message?.substring(0, 300)).join('; ') || 'Unknown error';
      properties.error_message = errorMsg;

      // Also track as a separate bug event
      mixpanel.track('Bug Found', {
        distinct_id: DISTINCT_ID,
        source: 'playwright-tests',
        test_name: test.title,
        module: module,
        error_message: errorMsg,
        severity: status === 'timedOut' ? 'high' : 'medium',
        timestamp: new Date().toISOString(),
      });
    }

    mixpanel.track('Test Result', properties);

    const icon = status === 'passed' ? '✓' : status === 'failed' ? '✗' : '○';
    console.log(`[Mixpanel] ${icon} ${test.title} → ${status} (${(duration / 1000).toFixed(1)}s) [${module}]`);
  }

  onEnd(result) {
    const duration = Date.now() - (this.suiteStartTime || Date.now());

    mixpanel.track('Test Suite Completed', {
      distinct_id: DISTINCT_ID,
      source: 'playwright-tests',
      suite_name: this.suiteName,
      total_tests: this.results.total,
      passed: this.results.passed,
      failed: this.results.failed,
      skipped: this.results.skipped,
      duration_ms: duration,
      duration_min: (duration / 60000).toFixed(1),
      pass_rate: this.results.total > 0
        ? ((this.results.passed / this.results.total) * 100).toFixed(1) + '%'
        : '0%',
      overall_status: result.status, // 'passed', 'failed', 'timedout', 'interrupted'
      timestamp: new Date().toISOString(),
    });

    console.log(`[Mixpanel] Suite done: ${this.results.passed}/${this.results.total} passed (${((this.results.passed / this.results.total) * 100).toFixed(0)}%) in ${(duration / 1000).toFixed(0)}s`);
  }
}

module.exports = MixpanelReporter;
