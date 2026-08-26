import { allure } from 'allure-playwright';

/**
 * Thin wrapper around the Allure runtime API.
 *
 * Every method on `allure` returns a promise, so each call has to be awaited -
 * a fire-and-forget call is dropped and the label never reaches the report.
 *
 * The calls are also guarded, because the same specs run under the plain HTML
 * reporter and in `--ui` mode, where no Allure runtime is attached and the API
 * throws "no test runtime is found".
 */
async function safe(fn) {
  try {
    await fn();
  } catch {
    /* Allure runtime not active for this run - reporting is best effort. */
  }
}

export const report = {
  /** Business area, e.g. "Authentication". */
  feature: (name) => safe(() => allure.feature(name)),
  /** Sub-area, e.g. "Login". */
  story: (name) => safe(() => allure.story(name)),
  /** blocker | critical | normal | minor | trivial */
  severity: (level) => safe(() => allure.severity(level)),
  /** Test case id from the test-data files, shown as an Allure label. */
  testCaseId: (id) => safe(() => allure.label('testId', id)),
  owner: (name) => safe(() => allure.owner(name)),
  tag: (name) => safe(() => allure.tag(name)),
  link: (url, label) => safe(() => allure.link(url, label)),
  description: (text) => safe(() => allure.description(text)),
  /** Attaches arbitrary JSON (test data, API payloads) to the report. */
  attachJson: (name, value) =>
    safe(() => allure.attachment(name, JSON.stringify(value, null, 2), 'application/json')),
  attachText: (name, value) => safe(() => allure.attachment(name, String(value), 'text/plain')),
};

/**
 * Applies the standard label set in one call.
 *
 * @param {{feature?: string, story?: string, severity?: string, testId?: string, tags?: string[]}} labels
 */
export async function annotate({ feature, story, severity, testId, tags = [] } = {}) {
  if (feature) await report.feature(feature);
  if (story) await report.story(story);
  if (severity) await report.severity(severity);
  if (testId) await report.testCaseId(testId);
  for (const tag of tags) {
    await report.tag(tag);
  }
  await report.owner('QA Automation');
}
