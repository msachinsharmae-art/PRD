// @ts-check
// Mixpanel Browser SDK injection for Playwright pages
// Injects the Mixpanel CDN snippet + init into any Playwright page
// This enables Autocapture + Session Replay on every page the tests visit

const MIXPANEL_TOKEN = 'c8367a475a78f263cdbd22d8eb561de3';

const MIXPANEL_SNIPPET = `
(function (f, b) { if (!b.__SV) { var e, g, i, h; window.mixpanel = b; b._i = []; b.init = function (e, f, c) { function g(a, d) { var b = d.split("."); 2 == b.length && ((a = a[b[0]]), (d = b[1])); a[d] = function () { a.push([d].concat(Array.prototype.slice.call(arguments, 0))); }; } var a = b; "undefined" !== typeof c ? (a = b[c] = []) : (c = "mixpanel"); a.people = a.people || []; a.toString = function (a) { var d = "mixpanel"; "mixpanel" !== c && (d += "." + c); a || (d += " (stub)"); return d; }; a.people.toString = function () { return a.toString(1) + ".people (stub)"; }; i = "disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove".split( " "); for (h = 0; h < i.length; h++) g(a, i[h]); var j = "set set_once union unset remove delete".split(" "); a.get_group = function () { function b(c) { d[c] = function () { call2_args = arguments; call2 = [c].concat(Array.prototype.slice.call(call2_args, 0)); a.push([e, call2]); }; } for ( var d = {}, e = ["get_group"].concat( Array.prototype.slice.call(arguments, 0)), c = 0; c < j.length; c++) b(j[c]); return d; }; b._i.push([e, f, c]); }; b.__SV = 1.2; e = f.createElement("script"); e.type = "text/javascript"; e.async = !0; e.src = "undefined" !== typeof MIXPANEL_CUSTOM_LIB_URL ? MIXPANEL_CUSTOM_LIB_URL : "file:" === f.location.protocol && "//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js".match(/^\\/\\//) ? "https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js" : "//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js"; g = f.getElementsByTagName("script")[0]; g.parentNode.insertBefore(e, g); } })(document, window.mixpanel || []);

mixpanel.init("${MIXPANEL_TOKEN}", {
  debug: true,
  track_pageview: true,
  persistence: "localStorage",
  autocapture: true,
  record_sessions_percent: 100,
});

mixpanel.identify('zimyo-qa-tester');
mixpanel.people.set({
  '$name': 'QA Playwright',
  '$email': 'qa@zimyo.com',
  'role': 'QA Automation',
});
`;

/**
 * Inject Mixpanel browser SDK into a Playwright page.
 * Call this once per page/context — it runs before every page load via addInitScript.
 * @param {import('@playwright/test').Page} page
 */
async function injectMixpanel(page) {
  await page.addInitScript(MIXPANEL_SNIPPET);
}

/**
 * Track a custom event in the browser via Mixpanel from a Playwright page.
 * Waits for the Mixpanel library to fully load before tracking.
 * @param {import('@playwright/test').Page} page
 * @param {string} eventName
 * @param {Record<string, any>} properties
 */
async function trackInBrowser(page, eventName, properties = {}) {
  await page.evaluate(async ({ name, props }) => {
    // Wait up to 10s for the real mixpanel lib to load (not just the stub)
    for (let i = 0; i < 40; i++) {
      if (window.mixpanel && window.mixpanel.__loaded) break;
      await new Promise(r => setTimeout(r, 250));
    }
    if (window.mixpanel && typeof window.mixpanel.track === 'function') {
      window.mixpanel.track(name, props);
    }
  }, { name: eventName, props: properties });
}

module.exports = { injectMixpanel, trackInBrowser };
