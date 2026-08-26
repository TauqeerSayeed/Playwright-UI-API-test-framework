import { test, expect } from '../../src/fixtures/test-fixtures.js';
import { annotate, report } from '../../src/utils/allure-helper.js';

/**
 * The /practise playground.
 *
 * These specs exercise the interaction types a UI suite has to handle beyond
 * plain clicks and typing: delayed enabling, visibility toggles, double and
 * right clicks that raise native alerts, and HTML5 drag and drop.
 *
 * All expectations are read from test-data/practise.json.
 */
test.describe('Practise - interactions', () => {
  test.beforeEach(async ({ practisePage }) => {
    await practisePage.open();
  });

  test('TC-PRAC-01 - a disabled field becomes editable after the delay @regression', async ({
    practisePage,
    data,
  }) => {
    await annotate({
      feature: 'Practise',
      story: 'Waits',
      severity: 'normal',
      testId: 'TC-PRAC-01',
      tags: ['data-driven'],
    });

    const { heading, buttonLabel, waitMs, typedText } = data.practise.enableField;
    const input = practisePage.enableFieldInput(heading);

    await expect(input).toBeDisabled();

    await practisePage.clickEnableField(heading, buttonLabel);

    // Web-first assertion polls until the app flips the attribute - no sleep.
    await practisePage.waitForFieldEnabled(heading, waitMs);

    await input.fill(typedText);
    await expect(input).toHaveValue(typedText);
  });

  test('TC-PRAC-02 - a field can be hidden and shown again @regression', async ({
    practisePage,
    data,
  }) => {
    await annotate({ feature: 'Practise', story: 'Visibility', severity: 'normal', testId: 'TC-PRAC-02' });

    const { heading, typedText } = data.practise.hideShow;
    const input = practisePage.hideShowInput(heading);

    await expect(input).toBeVisible();

    await practisePage.hideField(heading);
    await expect(input).toBeHidden();

    await practisePage.showField(heading);
    await expect(input).toBeVisible();

    await input.fill(typedText);
    await expect(input).toHaveValue(typedText);
  });

  test('TC-PRAC-03 - double clicking raises the expected alert @regression', async ({
    practisePage,
    data,
  }) => {
    await annotate({ feature: 'Practise', story: 'Mouse actions', severity: 'normal', testId: 'TC-PRAC-03' });

    const { heading, expectedAlert } = data.practise.doubleClick;

    // The handler calls window.alert, which blocks the page until dismissed -
    // the page object arms a one-shot dialog listener before clicking.
    const message = await practisePage.doubleClickAndReadAlert(heading);
    await report.attachText('alert text', message);

    expect(message).toBe(expectedAlert);
  });

  test('TC-PRAC-04 - right clicking raises the expected alert @regression', async ({
    practisePage,
    data,
  }) => {
    await annotate({ feature: 'Practise', story: 'Mouse actions', severity: 'normal', testId: 'TC-PRAC-04' });

    const { heading, expectedAlert } = data.practise.rightClick;

    const message = await practisePage.rightClickAndReadAlert(heading);
    await report.attachText('alert text', message);

    expect(message).toBe(expectedAlert);
  });

  test('TC-PRAC-05 - the draggable square can be dropped on the target @regression', async ({
    practisePage,
    data,
  }) => {
    await annotate({ feature: 'Practise', story: 'Drag and drop', severity: 'normal', testId: 'TC-PRAC-05' });

    await expect(practisePage.section(data.practise.dragAndDrop.heading)).toBeVisible();
    await expect(practisePage.dragSource).toHaveAttribute('draggable', 'true');

    expect(await practisePage.isDropped()).toBe(false);

    await practisePage.dragToTarget();

    // The app moves the node into the drop zone, so parentage is the assertion.
    await expect
      .poll(() => practisePage.isDropped(), { message: 'square should move into the drop zone' })
      .toBe(true);
  });

  test('TC-PRAC-06 - every practise widget renders @regression', async ({ practisePage, data }) => {
    await annotate({ feature: 'Practise', story: 'Layout', severity: 'minor', testId: 'TC-PRAC-06' });

    const headings = [
      data.practise.enableField.heading,
      data.practise.hideShow.heading,
      data.practise.doubleClick.heading,
      data.practise.rightClick.heading,
      data.practise.dragAndDrop.heading,
    ];

    for (const heading of headings) {
      await expect(practisePage.section(heading)).toBeVisible();
    }
  });
});
