# Learn Automation — Playwright Test Framework

End-to-end UI **and** API test automation for [Learn Automation Courses](https://freelance-learn-automation.vercel.app/login), built with **Playwright (JavaScript)** on a **Page Object Model** architecture, JSON-driven test data, and dual **HTML + Allure** reporting.

**48 tests**, covering the whole journey: sign up → sign in → browse courses → cart management → checkout/enrollment → sign out, plus a set of advanced UI interactions and direct API contract checks.

---

## Quick start

```bash
npm install
npx playwright install     # one-time browser download

npm test                   # full suite (chromium + auth)
npm run report             # open the Playwright HTML report
npm run report:allure      # generate + open the Allure report
```

---

## Application under test

| | |
|---|---|
| **App** | https://freelance-learn-automation.vercel.app |
| **API** | https://learn-automation.onrender.com |
| **Type** | React SPA — course catalogue with auth, cart and enrollment |

The default test account lives in `test-data/users.json` and can be overridden with `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` (see `.env.example`).

---

## Project structure

```
AutomationProject1/
├── src/
│   ├── pages/                       # Page Object Model
│   │   ├── BasePage.js              # shared navigation, storage & dialog helpers
│   │   ├── LoginPage.js
│   │   ├── SignupPage.js
│   │   ├── HomePage.js              # course catalogue
│   │   ├── CartPage.js
│   │   ├── PractisePage.js          # interaction playground
│   │   └── components/              # reusable UI components
│   │       ├── NavBar.js            # header, sidebar, cart badge, sign out
│   │       ├── CourseCard.js        # one course tile (shared by home + cart)
│   │       └── EnrollModal.js       # checkout dialog
│   ├── fixtures/
│   │   └── test-fixtures.js         # custom fixtures: page objects, data, API, auth
│   ├── api/
│   │   └── AuthApi.js               # API client used for fast test setup
│   └── utils/
│       ├── data-reader.js           # JSON test-data loader (cached, deep-copied)
│       ├── data-generator.js        # unique users per run
│       ├── allure-helper.js         # Allure labels, severities, attachments
│       └── logger.js                # levelled console logger
│
├── test-data/                       # all test data — no hard-coded values in specs
│   ├── users.json                   # valid user + new-user template
│   ├── login-scenarios.json         # data-driven negative & validation cases
│   ├── courses.json                 # expected catalogue entries
│   ├── checkout.json                # enrollment address / phone
│   └── practise.json                # expected texts for the playground
│
├── tests/
│   ├── setup/auth.setup.js          # signs in once, saves the session
│   ├── auth/                        # login, signup, logout
│   ├── courses/                     # catalogue rendering & navigation
│   ├── cart/                        # add, remove, totals, checkout
│   ├── practise/                    # waits, alerts, drag & drop
│   ├── api/                         # API contract tests
│   └── e2e/                         # full shopping journey
│
├── playwright.config.js             # projects, timeouts, reporters
├── .env.example
├── ALLURE.md                        # Allure setup, commands & troubleshooting
└── .github/workflows/playwright.yml # CI + Allure publishing
```

---

## Architecture

### 1. Page Object Model

Every screen is a class extending `BasePage`, which supplies navigation, readiness waits, `localStorage` access and native-dialog handling. Locators are declared once in the constructor; specs never contain a selector.

Repeated UI is extracted into **components** rather than duplicated — `CourseCard` is used by both the home page and the cart, and `NavBar` is available on every page as `page.nav`.

```js
// A spec reads as plain intent, not as selectors:
const added = await homePage.addCoursesToCart(2);
await homePage.nav.goToCart();
expect(await cartPage.getTotal()).toBe(added.reduce((s, c) => s + c.price, 0));
```

### 2. Custom fixtures

`src/fixtures/test-fixtures.js` injects everything a test needs, so there is no `beforeEach` boilerplate:

| Fixture | What it gives you |
|---|---|
| `loginPage`, `signupPage`, `homePage`, `cartPage`, `practisePage` | ready-made page objects |
| `data` | all JSON test data |
| `validUser` | the shared account (env-overridable) |
| `newUser` | a freshly generated, unique user |
| `authApi` | API client for fast setup |
| `authenticatedHome` | signed-in home page with a **reset cart** |

### 3. Authentication via storage state

`tests/setup/auth.setup.js` runs first as a **setup project**: it signs in through the real UI once, then saves the session to `playwright/.auth/user.json`. Every other project reuses it, so login is exercised deliberately in the auth specs and skipped everywhere else — a big speed win.

The `auth/` specs and the E2E journey deliberately opt **out** of that state to drive the real forms.

### 4. Data-driven testing

No literals in specs — everything comes from `test-data/*.json`. Negative login cases become individually reported tests generated from the data file:

```js
const { negative } = testData.loginScenarios;

for (const scenario of negative) {
  test(`${scenario.id} - ${scenario.title}`, async ({ loginPage }) => {
    const error = await loginPage.loginExpectingFailure(scenario);
    expect(error).toContain(scenario.expectedError);
  });
}
```

Adding a new case means editing JSON — no code change.

### 5. Hybrid API + UI

`AuthApi` creates accounts over HTTP so the E2E journey does not have to fill the sign-up form first, and `tests/api/` checks the backend contract directly. When a UI login test fails, the API tests say whether the fault is in the browser layer or the service behind it.

---

## Reporting

Four reporters run together, configured in `playwright.config.js`:

| Reporter | Output | Purpose |
|---|---|---|
| `list` | console | live feedback |
| `html` | `playwright-report/` | traces, videos, screenshots |
| `allure-playwright` | `allure-results/` | rich, shareable, historical |
| `junit` | `test-results/junit-results.xml` | CI ingestion |

```bash
npm run report            # Playwright HTML report
npm run allure:serve      # Allure, no build step
npm run report:allure     # generate + open Allure
```

> Full Allure setup, commands, CI publishing and troubleshooting: **[ALLURE.md](ALLURE.md)**

Every test carries Allure metadata via `src/utils/allure-helper.js` — **feature**, **story**, **severity**, **test-case id**, **owner** and **tags** — plus JSON attachments of the data under test:

```js
await annotate({
  feature: 'Cart', story: 'Add to cart',
  severity: 'blocker', testId: 'TC-CART-01', tags: ['smoke'],
});
await report.attachJson('course under test', course);
```

`test.step()` is used throughout, so both reports show a readable breakdown of each journey rather than one opaque block.

On failure the config keeps a **trace**, **screenshot** and **video**; a green run keeps none of them.

---

## Test coverage

| Area | Tests | Highlights |
|---|---|---|
| **Login** (`TC-LOGIN-01…09`) | 9 | valid login, data-driven invalid credentials, required-field validation, masked password, signed-out access control |
| **Signup** (`TC-SIGNUP-01…06`) | 6 | full form (text, checkbox, radio, dropdown, multi-select), progressive submit-button enabling, duplicate email |
| **Logout** (`TC-LOGOUT-01…03`) | 3 | sign out, session + cart cleared, guest cart state |
| **Courses** (`TC-HOME-01…05`) | 5 | catalogue rendering, full card detail set, seeded courses, sidebar navigation, mobile viewport |
| **Cart** (`TC-CART-01…12`) | 12 | add, remove, toggle, badge count, total arithmetic, persistence, storage, checkout dialog, cancel, validation, full enrollment |
| **Practise** (`TC-PRAC-01…06`) | 6 | delayed enabling, hide/show, double-click & right-click alerts, HTML5 drag & drop |
| **API** (`TC-API-01…05`) | 5 | signin 200/400/401, signup 200, duplicate 422 |
| **End to end** (`TC-E2E-01`) | 1 | register → login → browse → cart → remove → enroll → logout |
| | **48** | |

### Techniques demonstrated

- Page Object Model with reusable components and inheritance
- Custom fixtures & dependency injection
- Storage-state authentication with a setup project
- JSON-driven / parameterised tests
- Hybrid API + UI testing
- Web-first auto-retrying assertions (`expect.poll`, `toBeEnabled({ timeout })`) — **no hard sleeps anywhere**
- Native alert/dialog handling
- HTML5 drag & drop via synthetic `DataTransfer` events
- `localStorage` state assertions and reset
- Cross-browser (Chromium / Firefox / WebKit) and mobile-viewport execution
- Tag-based selective runs, trace/video/screenshot on failure, CI with published Allure history

---

## Running tests

```bash
npm test                    # chromium + auth projects (default)
npm run test:headed         # watch it run
npm run test:ui             # Playwright UI mode
npm run test:debug          # step-through debugger

npm run test:smoke          # @smoke only
npm run test:regression     # @regression only

npm run test:auth           # login / signup / logout
npm run test:cart           # cart management
npm run test:api            # API only
npm run test:e2e            # full journey

npm run test:cross-browser  # chromium + firefox + webkit
npm run test:mobile         # Pixel 5 viewport

npm run codegen             # record new steps
npm run clean               # wipe all report output
```

### Projects

| Project | Purpose |
|---|---|
| `setup` | signs in once, saves storage state |
| `auth-chromium` | auth specs, no saved session |
| `chromium` | everything else, session restored |
| `firefox` / `webkit` | cross-browser |
| `mobile-chrome` | Pixel 5 viewport |

---

## CI

`.github/workflows/playwright.yml` runs the suite on every push and PR, plus nightly, and:

- uploads the Playwright HTML report and raw Allure results as artifacts
- keeps Allure **history** across runs so trends are visible
- publishes the Allure report to GitHub Pages from `main`

Credentials come from the `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` repository secrets.

---

## Notes on the application

A few behaviours were discovered while building this suite and are handled explicitly in the page objects — they are the kind of detail that makes a suite flaky if missed:

- **The cart is client-side only.** It lives in `localStorage.cart` and is never sent to the server, so the `authenticatedHome` fixture resets it before each test to keep specs independent.
- **The welcome banner only renders straight after a UI login.** It is absent when a session is restored from storage state, so `HomePage.waitUntilLoaded()` waits on the catalogue instead and `expectWelcomeFor()` is used only by the login specs.
- **Course titles are uppercased by CSS on the home page but not in the cart.** `CourseCard.getName()` reads `textContent`, not `innerText`, so cross-page comparisons hold.
- **Interest checkbox ids start with a digit**, which is invalid CSS — they are located by their label text.
- **The signup button unlocks only after every mandatory field is answered**, hobbies last.
- **`/api/signup` requires `state` and `gender`**, otherwise it answers `422`.
- **The enrollment dialog stays mounted after a successful checkout** and its backdrop blocks the page, so `EnrollModal.dismiss()` closes it before the test continues.
- The backend is free-tier hosted and can cold-start slowly, hence the generous timeouts and CI retries.
