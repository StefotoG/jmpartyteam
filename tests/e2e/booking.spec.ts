/**
 * Drives the booking form the way a visitor does, in both locales, against the real API
 * and database. Covers what the integration tests cannot: that the form actually reaches
 * the endpoint and that each outcome is reported in the right language.
 */
import { expect, test } from '@playwright/test';
import { connect, DEV_DATABASE_URL } from '../../src/server/db/client.ts';

const CONTACT_PATH = { bg: '/kontakti/', en: '/en/contact/' };

// Far enough out that no other test or manual poke has claimed it.
const EVENT_DATE = '2029-09-15';

const sql = connect(DEV_DATABASE_URL);

test.beforeEach(async () => {
  await sql`
    DELETE FROM booking
    WHERE event_window && default_allocation_slot(${EVENT_DATE}::date)`;
});

test.afterAll(async () => {
  await sql`
    DELETE FROM booking
    WHERE event_window && default_allocation_slot(${EVENT_DATE}::date)`;
  await sql.end();
});

async function fillEnquiry(
  page: import('@playwright/test').Page,
  overrides: { name?: string; city?: string } = {}
) {
  await page.fill('#name', overrides.name ?? 'Мария Петрова');
  await page.fill('#phone', '+359888123456');
  await page.fill('#email', 'maria@example.com');
  await page.fill('#eventDate', EVENT_DATE);
  await page.fill('#city', overrides.city ?? 'София');
  await page.check('input[name="consent"]');
}

test('a visitor can submit an enquiry and is given a reference', async ({ page }) => {
  await page.goto(CONTACT_PATH.bg);
  await fillEnquiry(page);
  await page.click('#booking-submit');

  await expect(page.locator('#booking-feedback')).toContainText(/JM-\d{4}-\d+/, {
    timeout: 15_000,
  });
  await expect(page.locator('#booking-feedback')).toContainText('Благодарим');
});

test('the form clears itself after a successful submission', async ({ page }) => {
  await page.goto(CONTACT_PATH.bg);
  await fillEnquiry(page);
  await page.click('#booking-submit');

  await expect(page.locator('#booking-feedback')).toContainText(/JM-\d{4}-\d+/, {
    timeout: 15_000,
  });
  await expect(page.locator('#name')).toHaveValue('');
});

test('the third enquiry for one night is refused, not silently accepted', async ({ page }) => {
  for (const name of ['Клиент 1', 'Клиент 2']) {
    await page.goto(CONTACT_PATH.bg);
    await fillEnquiry(page, { name });
    await page.click('#booking-submit');
    await expect(page.locator('#booking-feedback')).toContainText(/JM-\d{4}-\d+/, {
      timeout: 15_000,
    });
  }

  await page.goto(CONTACT_PATH.bg);
  await fillEnquiry(page, { name: 'Клиент 3' });
  await page.click('#booking-submit');

  await expect(page.locator('#booking-feedback')).toContainText('заета', {
    timeout: 15_000,
  });
});

test('the English form reports its outcome in English', async ({ page }) => {
  await page.goto(CONTACT_PATH.en);
  await fillEnquiry(page, { name: 'Ivan Petrov', city: 'Plovdiv' });
  await page.click('#booking-submit');

  await expect(page.locator('#booking-feedback')).toContainText('Thank you', {
    timeout: 15_000,
  });
  await expect(page.locator('#booking-feedback')).toContainText(/JM-\d{4}-\d+/);
});

test('the browser blocks submission when a required field is empty', async ({ page }) => {
  await page.goto(CONTACT_PATH.bg);
  await page.fill('#name', 'Мария');
  await page.click('#booking-submit');

  await expect(page.locator('#booking-feedback')).toBeEmpty();
  await expect(page.locator('#phone')).toBeFocused();
});
