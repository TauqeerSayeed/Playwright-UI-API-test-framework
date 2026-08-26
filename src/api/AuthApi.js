import { request } from '@playwright/test';
import { logger } from '../utils/logger.js';

/**
 * Thin client for the backend the UI talks to.
 *
 * It lets a test set up its preconditions (an account that exists, a token to
 * inject) over HTTP instead of driving the sign-up form every time - the same
 * hybrid API + UI pattern used in real suites to keep runs fast.
 */
export class AuthApi {
  /** @param {import('@playwright/test').APIRequestContext} context */
  constructor(context) {
    this.context = context;
  }

  /** Builds a standalone client when no `request` fixture is available. */
  static async create(baseURL = process.env.API_BASE_URL || 'https://learn-automation.onrender.com') {
    const context = await request.newContext({ baseURL, timeout: 90_000 });
    return new AuthApi(context);
  }

  async dispose() {
    await this.context.dispose();
  }

  /**
   * Registers a user.
   *
   * `state` and `gender` are mandatory server side - omitting either returns
   * 422, so both are defaulted here rather than left to each caller.
   *
   * @param {{name: string, email: string, password: string, state?: string, gender?: string, hobbies?: string[]}} user
   * @returns {Promise<{status: number, body: any}>}
   */
  async signup(user) {
    logger.info('API signup', { email: user.email });

    const response = await this.context.post('/api/signup', {
      data: {
        name: user.name,
        email: user.email,
        password: user.password,
        state: user.state || 'Karnataka',
        gender: user.gender || 'Male',
        hobbies: user.hobbies || [],
      },
    });

    return { status: response.status(), body: await response.json() };
  }

  /**
   * Authenticates a user.
   *
   * @param {{email: string, password: string}} credentials
   * @returns {Promise<{status: number, body: any}>} body carries `token` and `user`
   */
  async signin({ email, password }) {
    logger.info('API signin', { email });

    const response = await this.context.post('/api/signin', {
      data: { email, password },
    });

    return { status: response.status(), body: await response.json() };
  }

  /** Registers a user and fails loudly if the backend rejects it. */
  async createUser(user) {
    const { status, body } = await this.signup(user);

    if (status !== 200) {
      throw new Error(`API signup failed (${status}): ${JSON.stringify(body)}`);
    }

    return { ...user, id: body.user?.id };
  }
}
