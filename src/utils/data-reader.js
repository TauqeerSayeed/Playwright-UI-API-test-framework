import fs from 'fs';
import path from 'path';

/**
 * Resolves the project root regardless of whether this module is executed as
 * CommonJS (Playwright's default transform) or as native ESM.
 */
const projectRoot =
  typeof __dirname !== 'undefined' ? path.resolve(__dirname, '..', '..') : process.cwd();

const dataDir = path.join(projectRoot, 'test-data');
const cache = new Map();

/**
 * Reads a JSON file from /test-data and caches it for the worker's lifetime.
 *
 * @param {string} fileName file name with or without the .json extension
 * @returns {any} parsed JSON content
 */
export function readJson(fileName) {
  const file = fileName.endsWith('.json') ? fileName : `${fileName}.json`;

  if (!cache.has(file)) {
    const filePath = path.join(dataDir, file);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Test data file not found: ${filePath}`);
    }

    cache.set(file, JSON.parse(fs.readFileSync(filePath, 'utf-8')));
  }

  // Hand back a deep copy so a mutating test can never leak into another test.
  return structuredClone(cache.get(file));
}

export const testData = {
  get users() {
    return readJson('users');
  },
  get courses() {
    return readJson('courses');
  },
  get loginScenarios() {
    return readJson('login-scenarios');
  },
  get practise() {
    return readJson('practise');
  },
  get checkout() {
    return readJson('checkout');
  },
};

/**
 * The account used by tests that just need "any logged-in user".
 * Credentials can be overridden from the environment so the same suite can run
 * against a private account in CI without editing the JSON file.
 */
export function getValidUser() {
  const { validUser } = testData.users;

  return {
    ...validUser,
    email: process.env.TEST_USER_EMAIL || validUser.email,
    password: process.env.TEST_USER_PASSWORD || validUser.password,
  };
}
