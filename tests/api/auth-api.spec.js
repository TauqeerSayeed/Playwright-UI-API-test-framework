import { test, expect } from '../../src/fixtures/test-fixtures.js';
import { annotate, report } from '../../src/utils/allure-helper.js';
import { buildUser } from '../../src/utils/data-generator.js';

/**
 * API-level checks against the same backend the UI calls.
 *
 * Running these alongside the UI specs gives fast, precise feedback on the
 * contract - when a UI login test fails, these say whether the fault is in the
 * browser layer or in the service behind it.
 */
test.describe('API - authentication endpoints', () => {
  test('TC-API-01 - POST /api/signin returns a token for valid credentials @api @smoke', async ({
    authApi,
    validUser,
  }) => {
    await annotate({
      feature: 'API',
      story: 'Signin',
      severity: 'blocker',
      testId: 'TC-API-01',
      tags: ['api', 'smoke'],
    });

    const { status, body } = await authApi.signin(validUser);
    await report.attachJson('response', { status, user: body.user?.email });

    expect(status).toBe(200);
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe(validUser.email);
    expect(body.user).toHaveProperty('_id');
  });

  test('TC-API-02 - POST /api/signin rejects an unknown email @api @regression', async ({
    authApi,
    data,
  }) => {
    await annotate({ feature: 'API', story: 'Signin', severity: 'critical', testId: 'TC-API-02', tags: ['api'] });

    const scenario = data.loginScenarios.negative[0];
    const { status, body } = await authApi.signin(scenario);

    expect(status).toBe(400);
    expect(body.message).toContain(scenario.expectedError);
    expect(body.token).toBeUndefined();
  });

  test('TC-API-03 - POST /api/signin rejects a wrong password @api @regression', async ({
    authApi,
    validUser,
  }) => {
    await annotate({ feature: 'API', story: 'Signin', severity: 'critical', testId: 'TC-API-03', tags: ['api'] });

    const { status, body } = await authApi.signin({
      email: validUser.email,
      password: 'DefinitelyNotThePassword@1',
    });
    await report.attachJson('response', body);

    // A known user with a bad password is 401, while an unknown email is 400 -
    // the endpoint distinguishes the two cases.
    expect(status).toBe(401);
    expect(body.message).toContain("Doesn't match");
    expect(body.token).toBeUndefined();
  });

  test('TC-API-04 - POST /api/signup creates an account @api @regression', async ({ authApi }) => {
    await annotate({ feature: 'API', story: 'Signup', severity: 'critical', testId: 'TC-API-04', tags: ['api'] });

    const user = buildUser();
    const { status, body } = await authApi.signup(user);

    expect(status).toBe(200);
    expect(body.message).toContain('created');
    expect(body.user.email).toBe(user.email);

    await test.step('and the new account can immediately sign in', async () => {
      const signin = await authApi.signin(user);

      expect(signin.status).toBe(200);
      expect(signin.body.token).toBeTruthy();
    });
  });

  test('TC-API-05 - POST /api/signup refuses a duplicate email @api @regression', async ({
    authApi,
    validUser,
  }) => {
    await annotate({ feature: 'API', story: 'Signup', severity: 'normal', testId: 'TC-API-05', tags: ['api'] });

    const { status, body } = await authApi.signup({
      name: validUser.name,
      email: validUser.email,
      password: validUser.password,
    });
    await report.attachJson('response', body);

    expect(status).toBe(422);
    expect(body.message).toContain('Email already registered');
  });
});
