# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth/login.spec.js >> Authentication - Login >> TC-LOGIN-02 - unregistered email is rejected @regression
- Location: tests/auth/login.spec.js:55:9

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "USER Email Doesn't Exist"
Received string:    "Something went wrong"
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6] [cursor=pointer]:
        - img "logo" [ref=e7]
        - heading "Learn Automation Courses" [level=1] [ref=e8]
      - generic [ref=e9]:
        - img "menu" [ref=e10] [cursor=pointer]
        - generic [ref=e11]:
          - generic [ref=e12]:
            - text: Learn Automation Courses
            - img "delete" [ref=e13] [cursor=pointer]
          - generic [ref=e14]:
            - link "Home" [ref=e15] [cursor=pointer]:
              - /url: /
            - link "Practise" [ref=e17] [cursor=pointer]:
              - /url: /practise
  - generic [ref=e20]:
    - img "Login" [ref=e22]
    - generic [ref=e23]:
      - generic [ref=e25]:
        - heading "Sign In" [level=2] [ref=e26]
        - textbox "Enter Email" [ref=e27]: not.registered.user@mailinator.com
        - textbox "Enter Password" [ref=e28]: Test@12345
        - heading [level=2] [ref=e29]:
          - img "error" [ref=e30]
          - text: Something went wrong
        - button "Sign in" [active] [ref=e31] [cursor=pointer]
        - link "New user? Signup" [ref=e32] [cursor=pointer]:
          - /url: /signup
      - generic [ref=e33]:
        - heading "Connect with us" [level=2] [ref=e34]
        - generic [ref=e35] [cursor=pointer]:
          - link [ref=e36]:
            - /url: https://youtube.com/MukeshOtwani
          - link [ref=e40]:
            - /url: https://twitter.com/MukeshOtwani
          - link [ref=e43]:
            - /url: https://www.linkedin.com/in/mukesh-otwani-93631b99/
          - link [ref=e46]:
            - /url: https://www.facebook.com/groups/256655817858291
          - link [ref=e49]:
            - /url: https://learn-automation/reddit
  - generic [ref=e64]:
    - generic [ref=e65]:
      - heading "Learn Automation By Mukesh Otwani" [level=3] [ref=e66]
      - heading "©2023 All rights reserved" [level=2] [ref=e67]
    - generic [ref=e68] [cursor=pointer]:
      - link [ref=e69]:
        - /url: https://youtube.com/MukeshOtwani
      - link [ref=e73]:
        - /url: https://twitter.com/MukeshOtwani
      - link [ref=e76]:
        - /url: https://www.linkedin.com/in/mukesh-otwani-93631b99/
      - link [ref=e79]:
        - /url: https://www.facebook.com/groups/256655817858291
```

# Test source

```ts
  1   | import { test, expect } from '../../src/fixtures/test-fixtures.js';
  2   | import { annotate, report } from '../../src/utils/allure-helper.js';
  3   | import { testData } from '../../src/utils/data-reader.js';
  4   | 
  5   | // Loaded at module scope so the scenarios can be turned into real, individually
  6   | // reported tests rather than a single loop inside one test body.
  7   | const { negative, requiredFieldValidation } = testData.loginScenarios;
  8   | 
  9   | /**
  10  |  * Login coverage.
  11  |  *
  12  |  * This project runs without the saved storage state, so each test starts from
  13  |  * a genuinely signed-out browser and drives the real form.
  14  |  */
  15  | test.describe('Authentication - Login', () => {
  16  |   test.beforeEach(async ({ loginPage }) => {
  17  |     await loginPage.open();
  18  |   });
  19  | 
  20  |   test('TC-LOGIN-01 - a registered user can sign in @smoke @regression', async ({
  21  |     loginPage,
  22  |     homePage,
  23  |     validUser,
  24  |   }) => {
  25  |     await annotate({
  26  |       feature: 'Authentication',
  27  |       story: 'Login',
  28  |       severity: 'blocker',
  29  |       testId: 'TC-LOGIN-01',
  30  |       tags: ['smoke'],
  31  |     });
  32  |     await report.attachJson('credentials used', { email: validUser.email });
  33  | 
  34  |     await test.step('submit valid credentials', async () => {
  35  |       await loginPage.loginAs(validUser);
  36  |     });
  37  | 
  38  |     await test.step('the app lands on the course listing', async () => {
  39  |       await homePage.expectWelcomeFor(validUser.name);
  40  |       await expect(homePage.courseCards.first()).toBeVisible();
  41  |     });
  42  | 
  43  |     await test.step('a session token is persisted', async () => {
  44  |       expect(await homePage.isAuthenticated()).toBe(true);
  45  |       await expect(homePage.nav.cartButton).toBeVisible();
  46  |     });
  47  |   });
  48  | 
  49  |   /**
  50  |    * Data-driven negative cases. The scenarios - and the message each one is
  51  |    * expected to produce - come straight from test-data/login-scenarios.json,
  52  |    * so a new case needs no code change.
  53  |    */
  54  |   for (const scenario of negative) {
  55  |     test(`${scenario.id} - ${scenario.title} @regression`, async ({ loginPage }) => {
  56  |       await annotate({
  57  |         feature: 'Authentication',
  58  |         story: 'Login',
  59  |         severity: 'critical',
  60  |         testId: scenario.id,
  61  |         tags: ['negative', 'data-driven'],
  62  |       });
  63  |       await report.attachJson('scenario', scenario);
  64  | 
  65  |       const error = await loginPage.loginExpectingFailure(scenario);
  66  | 
> 67  |       expect(error).toContain(scenario.expectedError);
      |                     ^ Error: expect(received).toContain(expected) // indexOf
  68  |       await expect(loginPage.page).toHaveURL(/\/login/);
  69  |       expect(await loginPage.isAuthenticated()).toBe(false);
  70  |     });
  71  |   }
  72  | 
  73  |   for (const scenario of requiredFieldValidation) {
  74  |     test(`${scenario.id} - ${scenario.title} is reported to the user @regression`, async ({
  75  |       loginPage,
  76  |     }) => {
  77  |       await annotate({
  78  |         feature: 'Authentication',
  79  |         story: 'Login validation',
  80  |         severity: 'normal',
  81  |         testId: scenario.id,
  82  |         tags: ['negative', 'data-driven'],
  83  |       });
  84  |       await report.attachJson('scenario', scenario);
  85  | 
  86  |       const error = await loginPage.loginExpectingFailure(scenario);
  87  | 
  88  |       // The app validates before authenticating, so a missing field produces
  89  |       // its own message rather than a credential error.
  90  |       expect(error).toContain(scenario.expectedError);
  91  |       await expect(loginPage.page).toHaveURL(/\/login/);
  92  |       expect(await loginPage.isAuthenticated()).toBe(false);
  93  |     });
  94  |   }
  95  | 
  96  |   test('TC-LOGIN-07 - the password field masks what is typed @regression', async ({
  97  |     loginPage,
  98  |     validUser,
  99  |   }) => {
  100 |     await annotate({ feature: 'Authentication', story: 'Login', severity: 'minor', testId: 'TC-LOGIN-07' });
  101 | 
  102 |     await loginPage.passwordInput.fill(validUser.password);
  103 | 
  104 |     await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  105 |     await expect(loginPage.passwordInput).toHaveValue(validUser.password);
  106 |   });
  107 | 
  108 |   test('TC-LOGIN-08 - the signup link opens the registration form @regression', async ({
  109 |     loginPage,
  110 |     signupPage,
  111 |   }) => {
  112 |     await annotate({ feature: 'Authentication', story: 'Navigation', severity: 'normal', testId: 'TC-LOGIN-08' });
  113 | 
  114 |     await loginPage.goToSignUp();
  115 | 
  116 |     await expect(signupPage.heading).toHaveText('Sign Up');
  117 |   });
  118 | 
  119 |   test('TC-LOGIN-09 - a signed-out visitor sees no cart control @regression', async ({
  120 |     loginPage,
  121 |   }) => {
  122 |     await annotate({ feature: 'Authentication', story: 'Access control', severity: 'normal', testId: 'TC-LOGIN-09' });
  123 | 
  124 |     await expect(loginPage.nav.cartButton).toBeHidden();
  125 |     expect(await loginPage.nav.isUserSignedIn()).toBe(false);
  126 |   });
  127 | });
  128 | 
```