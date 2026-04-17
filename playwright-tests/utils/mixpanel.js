// @ts-check
// Mixpanel tracking utility for Playwright test suite
// Tracks: test runs, pass/fail, module interactions, durations, errors

const Mixpanel = require('mixpanel');

const MIXPANEL_TOKEN = 'c8367a475a78f263cdbd22d8eb561de3';

const mixpanel = Mixpanel.init(MIXPANEL_TOKEN, {
  host: 'api-eu.mixpanel.com',
});

const DISTINCT_ID = 'zimyo-qa-playwright';

/**
 * Track a test event in Mixpanel
 * @param {string} eventName
 * @param {Record<string, any>} properties
 */
function track(eventName, properties = {}) {
  try {
    mixpanel.track(eventName, {
      distinct_id: DISTINCT_ID,
      source: 'playwright-tests',
      timestamp: new Date().toISOString(),
      ...properties,
    });
  } catch (err) {
    console.warn('[Mixpanel] Track error:', err.message);
  }
}

/** Track when a test suite starts */
function trackSuiteStart(suiteName, totalTests) {
  track('Test Suite Started', {
    suite_name: suiteName,
    total_tests: totalTests,
  });
}

/** Track when a test suite finishes */
function trackSuiteEnd(suiteName, results) {
  track('Test Suite Completed', {
    suite_name: suiteName,
    total_tests: results.total,
    passed: results.passed,
    failed: results.failed,
    skipped: results.skipped,
    duration_ms: results.duration,
    pass_rate: results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) + '%' : '0%',
  });
}

/** Track individual test start */
function trackTestStart(testName, module, file) {
  track('Test Started', {
    test_name: testName,
    module: module,
    file: file,
  });
}

/** Track individual test result */
function trackTestResult(testName, status, properties = {}) {
  track('Test Result', {
    test_name: testName,
    status: status, // 'passed', 'failed', 'skipped', 'timedOut'
    ...properties,
  });
}

/** Track a portal action (login, navigation, form fill, button click) */
function trackPortalAction(action, details = {}) {
  track('Portal Action', {
    action: action,
    ...details,
  });
}

/** Track an error/bug found during testing */
function trackBugFound(testName, errorMessage, module, severity = 'medium') {
  track('Bug Found', {
    test_name: testName,
    error_message: errorMessage,
    module: module,
    severity: severity,
  });
}

module.exports = {
  track,
  trackSuiteStart,
  trackSuiteEnd,
  trackTestStart,
  trackTestResult,
  trackPortalAction,
  trackBugFound,
  DISTINCT_ID,
};
