import { validityOf } from './pages/forms';
import { expect, recordRequests, test, uniqueTag } from './fixtures';

test.describe('corporate workshop inquiry', () => {
  test('blocks submission while the required lead fields are empty', async ({ page, workshops }) => {
    const inquiryRequests = recordRequests(page, '/api/workshops');
    await workshops.goto();

    await workshops.submit().click();

    expect(await validityOf(workshops.company())).toMatchObject({ valueMissing: true });
    expect(await validityOf(workshops.contact())).toMatchObject({ valueMissing: true });
    expect(await validityOf(workshops.email())).toMatchObject({ valueMissing: true });
    expect(await validityOf(workshops.phone())).toMatchObject({ valueMissing: true });
    await page.evaluate(() => fetch('/api/packages').then((response) => response.status));
    expect(inquiryRequests).toHaveLength(0);
  });

  test('submits a complete lead and confirms receipt (E2E-1)', async ({ page, workshops }, testInfo) => {
    const tag = uniqueTag(testInfo.project.name);
    const email = `crm.${tag}@example.com`;
    await workshops.goto();
    await workshops.fill({
      company: `QA Journey Airline ${tag}`,
      contact: 'Sarah Levi, VP HR',
      email,
      phone: '+972-54-000-1234',
    });

    const inquiryResponse = page.waitForResponse((response) => response.url().endsWith('/api/workshops'));
    await workshops.submit().click();

    expect((await inquiryResponse).status()).toBe(201);
    await expect(page.getByRole('heading', { name: 'Inquiry Received Successfully!' })).toBeVisible();
    await expect(page.getByText(email, { exact: true })).toBeVisible();
  });
});
