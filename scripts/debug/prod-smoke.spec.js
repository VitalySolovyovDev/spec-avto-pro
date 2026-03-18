const { test, expect } = require('@playwright/test');

const siteUrl = process.env.SITE_URL || 'https://spec-avto.pro';
const expectedSuccessMessage = 'Заявка отправлена. Спасибо!';

function createRuntimeCapture(page) {
  const consoleEntries = [];
  const nonOkResponses = [];
  const pageErrors = [];
  const requestFailures = [];
  const contactResponses = [];

  page.on('console', (message) => {
    consoleEntries.push({
      type: message.type(),
      text: message.text(),
    });
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message || String(error));
  });

  page.on('requestfailed', (request) => {
    requestFailures.push({
      url: request.url(),
      method: request.method(),
      error: request.failure()?.errorText || 'Unknown request failure.',
    });
  });

  page.on('response', async (response) => {
    const isContactResponse = response.url().includes('/api/contact');
    const isNonOkResponse = response.status() >= 400;

    if (!isContactResponse && !isNonOkResponse) {
      return;
    }

    let body = '';

    try {
      body = await response.text();
    } catch {
      body = '';
    }

    const responseDetails = {
      status: response.status(),
      url: response.url(),
      body,
    };

    if (isNonOkResponse) {
      nonOkResponses.push(responseDetails);
    }

    if (isContactResponse) {
      contactResponses.push(responseDetails);
    }
  });

  return {
    consoleEntries,
    nonOkResponses,
    pageErrors,
    requestFailures,
    contactResponses,
  };
}

test('homepage loads without runtime errors', async ({ page }) => {
  const capture = createRuntimeCapture(page);

  await page.goto(siteUrl, { waitUntil: 'networkidle' });
  await expect(page).toHaveTitle(/СПЕЦАВТОПРО/i);
  await expect(page.locator('[data-contact-form]')).toBeVisible();

  const consoleProblems = capture.consoleEntries.filter(
    (entry) => entry.type === 'error' || entry.type === 'warning'
  );

  expect(capture.pageErrors, `Page errors: ${JSON.stringify(capture.pageErrors, null, 2)}`).toEqual([]);
  expect(
    capture.requestFailures,
    `Request failures: ${JSON.stringify(capture.requestFailures, null, 2)}`
  ).toEqual([]);
  expect(
    capture.nonOkResponses,
    `Non-OK responses: ${JSON.stringify(capture.nonOkResponses, null, 2)}`
  ).toEqual([]);
  expect(
    consoleProblems,
    `Console problems: ${JSON.stringify(consoleProblems, null, 2)}`
  ).toEqual([]);
});

test('contact form submits successfully', async ({ page }) => {
  const capture = createRuntimeCapture(page);
  let dialogMessage = null;

  page.on('dialog', async (dialog) => {
    dialogMessage = dialog.message();
    await dialog.accept();
  });

  await page.goto(siteUrl, { waitUntil: 'networkidle' });

  await page.locator('#name').fill('Тестовый клиент');
  await page.locator('#phone').fill('+7 999 123-45-67');
  await page.locator('#waste-type').selectOption({ label: 'Строительный мусор' });

  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/contact')),
    page.locator('[data-contact-form] button[type="submit"]').click(),
  ]);

  await expect.poll(() => dialogMessage).toBeTruthy();

  const lastResponse = capture.contactResponses.at(-1);

  expect(lastResponse, 'No /api/contact response captured.').toBeTruthy();
  expect(lastResponse.status, `Unexpected /api/contact response: ${JSON.stringify(lastResponse, null, 2)}`).toBe(200);
  expect(dialogMessage).toContain(expectedSuccessMessage);
});
