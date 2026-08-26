# Allure Reporting — Setup & Usage Guide

How Allure Report is integrated into this Playwright framework, how to run it, and what to do when it misbehaves.

Allure runs **alongside** the built-in Playwright HTML reporter — both are produced from the same test run, neither replaces the other.

---

## Contents

1. [Why both reporters](#1-why-both-reporters)
2. [Prerequisites](#2-prerequisites)
3. [Installation](#3-installation)
4. [Configuration](#4-configuration)
5. [Output directories](#5-output-directories)
6. [The metadata helper](#6-the-metadata-helper)
7. [Using it in a spec](#7-using-it-in-a-spec)
8. [Commands](#8-commands)
9. [What the report shows](#9-what-the-report-shows)
10. [CI publishing](#10-ci-publishing)
11. [Troubleshooting](#11-troubleshooting)
12. [Official documentation](#12-official-documentation)

---

## 1. Why both reporters

| | Playwright HTML | Allure |
|---|---|---|
| Traces, videos, screenshots | first-class | linked as attachments |
| Grouping by feature / story | no | yes |
| Severity levels | no | yes |
| Trend & history across runs | no | yes |
| Environment widget | no | yes |
| Needs a build step | no | yes (`allure generate`) |
| Needs Java | no | yes |

The HTML report is the fast local debugging loop. Allure is the shareable, structured view — the one worth linking from a CV or showing a stakeholder.

---

## 2. Prerequisites

- **Node.js** 18+ (this project is developed on Node 24)
- **Java (JRE) on `PATH`** — required only for report *generation*, not for running tests

`allure-commandline` is a thin Node wrapper around a Java binary. Tests run and write results fine without Java; `allure:generate` / `allure:serve` are the steps that need it.

```bash
java -version     # must print a version, otherwise install a JRE 8+
```

---

## 3. Installation

Already in `package.json`, but for reference:

```bash
npm i -D allure-playwright allure-commandline
```

| Package | Version here | Role |
|---|---|---|
| `allure-playwright` | `3.11.0` | the Playwright **reporter** — writes raw results during the run |
| `allure-commandline` | `2.35.1` | the `allure` **CLI** — turns raw results into the HTML report |

> **Version note:** the adapter is on the Allure 3 line while the CLI is Allure 2. This combination is verified working in this project — labels, severities, steps and attachments all render correctly. The docs site splits `/docs/v2/` and `/docs/v3/` paths if you prefer to align both on one major version.

---

## 4. Configuration

Allure is registered as one entry in the reporter array — `playwright.config.js`:

```js
reporter: [
  ['list'],
  ['html', { outputFolder: 'playwright-report', open: 'never' }],
  [
    'allure-playwright',
    {
      resultsDir: 'allure-results',
      detail: true,
      suiteTitle: false,
      environmentInfo: {
        Application: BASE_URL,
        API: process.env.API_BASE_URL || 'https://learn-automation.onrender.com',
        Framework: 'Playwright Test',
        Node: process.version,
        OS: process.platform,
      },
    },
  ],
  ['junit', { outputFile: 'test-results/junit-results.xml' }],
],
```

| Option | Effect |
|---|---|
| `resultsDir` | where raw results are written |
| `detail` | include Playwright's own internal steps in the step tree |
| `suiteTitle` | `false` lets `feature` / `story` labels drive grouping instead of the file path |
| `environmentInfo` | populates the **Environment** widget on the report's overview page |

Failure artifacts come from the shared `use` block (`trace`, `screenshot`, `video` — all `*-on-failure`) and are attached to the Allure result automatically.

> **Careful:** passing `--reporter=line` on the command line **overrides the whole array**, so no Allure results are written for that run. Use the npm scripts, or `--reporter=line,allure-playwright` if you need a quieter console.

---

## 5. Output directories

```
allure-results/     raw *-result.json + attachments   ← written by the test run
allure-report/      the browsable HTML report          ← written by `allure generate`
```

`allure-results/` is **not** viewable. It is intermediate data. Both directories are git-ignored.

Results **accumulate** — the reporter appends rather than replaces, so a stale failed run left in the folder will still appear in the next report. `npm test` handles this via a `pretest` hook that runs `npm run clean`. If you invoke `npx playwright test` directly, clean first.

---

## 6. The metadata helper

Specs never import the Allure runtime directly. Everything goes through `src/utils/allure-helper.js`:

```js
import { allure } from 'allure-playwright';

async function safe(fn) {
  try {
    await fn();
  } catch {
    /* Allure runtime not active for this run - reporting is best effort. */
  }
}

export async function annotate({ feature, story, severity, testId, tags = [] } = {}) {
  if (feature)  await report.feature(feature);
  if (story)    await report.story(story);
  if (severity) await report.severity(severity);
  if (testId)   await report.testCaseId(testId);
  for (const tag of tags) await report.tag(tag);
  await report.owner('QA Automation');
}
```

Two deliberate decisions in there:

**Every `allure.*` method returns a Promise and must be awaited.** An un-awaited call is silently dropped and the label never reaches the report — the run still passes, the metadata just quietly vanishes. This was a real bug during development: the generated `*-result.json` came back with `labels: []` until every call site was made `await`.

**Every call is guarded.** The same specs run under `--ui` mode and under a `--reporter=line` override, where no Allure runtime is attached and the API throws `no test runtime is found`. Reporting is best-effort and must never fail a test.

### Available helpers

```js
await annotate({ feature, story, severity, testId, tags });  // the standard label set

await report.feature('Cart');
await report.story('Add to cart');
await report.severity('blocker');        // blocker | critical | normal | minor | trivial
await report.testCaseId('TC-CART-01');
await report.owner('QA Automation');
await report.tag('smoke');
await report.link('https://…', 'Ticket');
await report.description('Free-text description shown on the test page');

await report.attachJson('courses added', added);   // pretty-printed JSON attachment
await report.attachText('server error', error);    // plain-text attachment
```

---

## 7. Using it in a spec

```js
import { test, expect } from '../../src/fixtures/test-fixtures.js';
import { annotate, report } from '../../src/utils/allure-helper.js';

test('TC-CART-01 - a course can be added to the cart @smoke @regression', async ({
  authenticatedHome,
  cartPage,
}) => {
  await annotate({
    feature: 'Cart',
    story: 'Add to cart',
    severity: 'blocker',
    testId: 'TC-CART-01',
    tags: ['smoke'],
  });

  const course = await authenticatedHome.card(0).toObject();
  await report.attachJson('course under test', course);

  await test.step('add the first course', async () => {
    await authenticatedHome.card(0).addToCart();
  });

  await test.step('the cart page lists the same course', async () => {
    await authenticatedHome.nav.goToCart();
    expect(await cartPage.itemCount()).toBe(1);
  });
});
```

**`test.step()` needs no Allure-specific code** — Playwright steps map straight onto Allure steps. That is why the E2E journey renders as eight named stages rather than one opaque block, and it is the single highest-value thing you can do for report readability.

Produced result (verified from `allure-results/*-result.json`):

```
name:        TC-CART-01 - a course can be added to the cart @smoke @regression
status:      passed
labels:      feature=Cart, story=Add to cart, severity=blocker,
             testId=TC-CART-01, owner=QA Automation, tag=smoke, tag=regression
steps:       Before Hooks → add the first course →
             the card and the badge both reflect it →
             the cart page lists the same course → After Hooks
attachments: course under test (application/json)
```

---

## 8. Commands

### Run tests, then view

```bash
npm test                  # runs the suite → writes allure-results/
npm run allure:serve      # build + open in a temp dir — fastest loop, no allure-report/
```

### Explicit generate / open

```bash
npm run allure:generate   # allure generate allure-results --clean -o allure-report
npm run allure:open       # allure open allure-report
npm run report:allure     # both of the above
```

### Housekeeping

```bash
npm run clean             # wipe allure-results, allure-report, playwright-report, test-results
npm run report            # the Playwright HTML report (separate from Allure)
```

### Raw CLI, without the npm scripts

```bash
npx allure serve allure-results
npx allure generate allure-results --clean -o allure-report
npx allure open allure-report
```

### Full script reference

| Script | Command |
|---|---|
| `allure:generate` | `allure generate allure-results --clean -o allure-report` |
| `allure:open` | `allure open allure-report` |
| `allure:serve` | `allure serve allure-results` |
| `report:allure` | `allure:generate` then `allure:open` |

`allure open` starts a local web server — the report will not render correctly from `file://` because of browser CORS restrictions on local files.

---

## 9. What the report shows

| View | Content |
|---|---|
| **Overview** | pass/fail totals, duration, the Environment widget from `environmentInfo` |
| **Behaviors** | tests grouped by `feature` → `story` (Cart → Add to cart, Authentication → Login, …) |
| **Suites** | grouped by spec file |
| **Graphs** | severity distribution, status breakdown, duration spread, retries |
| **Timeline** | parallel worker execution over time |
| **Packages** | grouped by directory |
| **Test page** | the step tree, attachments, and on failure the trace, screenshot and video |

Severity assignments in this suite: `blocker` for login, logout, catalogue render, add-to-cart, completed checkout and the E2E journey; `critical` for credential rejection, cart totals, removal and persistence; `normal` / `minor` for the rest.

---

## 10. CI publishing

`.github/workflows/playwright.yml` does four things after the run:

1. Uploads `allure-results/` and `playwright-report/` as workflow artifacts (14-day retention)
2. Checks out the `gh-pages` branch to recover previous Allure **history** — without this, trend graphs reset every run
3. Generates the report with `simple-elf/allure-report-action@v1.7`, keeping the last 20 runs
4. Publishes to GitHub Pages with `peaceiris/actions-gh-pages@v4`, on `main` only

```yaml
- name: Load previous Allure history
  uses: actions/checkout@v4
  continue-on-error: true
  with:
    ref: gh-pages
    path: gh-pages

- name: Generate Allure report
  uses: simple-elf/allure-report-action@v1.7
  with:
    allure_results: allure-results
    allure_history: allure-history
    gh_pages: gh-pages
    keep_reports: 20
```

The report steps use `if: ${{ !cancelled() }}` so a failing suite — precisely when the report matters most — still publishes.

---

## 11. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `allure-results/` is empty after a run | `--reporter=<x>` on the CLI replaced the whole reporter array | drop the flag, or use `--reporter=line,allure-playwright` |
| Report generated, but `labels: []` on every test | `allure.*` calls not awaited — they return Promises | `await annotate(...)` and `await report.attach*(...)` |
| `no test runtime is found` thrown in a test | Allure runtime not attached (`--ui` mode, or reporter overridden) | already handled by the `safe()` guard in `allure-helper.js` |
| `allure: command not found` | `allure-commandline` not installed | `npm i -D allure-commandline`, then use `npx allure …` |
| CLI fails with a Java error | no JRE on `PATH` | install Java 8+; only report generation needs it |
| Report shows tests from an old run | results accumulate in `allure-results/` | `npm run clean` first (`npm test` does this via `pretest`) |
| Blank page when opening the report | opened from `file://` | use `allure open` / `allure serve`, which start a local server |
| Trend graphs always empty in CI | no history carried between runs | restore `gh-pages` before generating (see above) |

---

## 12. Official documentation

| Topic | URL |
|---|---|
| Allure + Playwright — getting started | https://allurereport.org/docs/playwright/ |
| Playwright reporter configuration options | https://allurereport.org/docs/playwright-configuration/ |
| Playwright runtime & metadata API reference | https://allurereport.org/docs/playwright-reference/ |
| Installing the Allure CLI (Node.js) | https://allurereport.org/docs/v2/install-for-nodejs/ |
| Generating a report | https://allurereport.org/docs/v2/generate-report/ |
| How Allure works (results → report) | https://allurereport.org/docs/how-it-works/ |
| Test result file format | https://allurereport.org/docs/how-it-works-test-result-file/ |
| Documentation home | https://allurereport.org/docs/ |
| Adapter source (`allure-js` monorepo) | https://github.com/allure-framework/allure-js |
| `allure-playwright` on npm | https://www.npmjs.com/package/allure-playwright |

Playwright's own reporter documentation, for the multi-reporter setup:
https://playwright.dev/docs/test-reporters
