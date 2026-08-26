import { testData } from './data-reader.js';

/** Random alphanumeric suffix used to keep generated data unique per run. */
function uniqueSuffix() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Builds a brand new user from the template in test-data/users.json.
 * Every field except the email comes from the JSON file, so the data stays
 * editable without touching code.
 *
 * @param {Partial<{name: string, email: string, password: string}>} overrides
 */
export function buildUser(overrides = {}) {
  const template = testData.users.newUserTemplate;

  return {
    name: template.name,
    email: `${template.emailPrefix}.${uniqueSuffix()}@${template.emailDomain}`,
    password: template.password,
    interest: template.interest,
    gender: template.gender,
    state: template.state,
    hobbies: template.hobbies,
    ...overrides,
  };
}
