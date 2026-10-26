import { randomUUID } from 'node:crypto';
import { ADMIN_CREDENTIALS, expect, test } from '../support/e2e';

type ProbeWindow = Window & { __simdreamXss?: string };

test.describe('stored XSS in the admin back office', () => {
  test.use({ httpCredentials: ADMIN_CREDENTIALS });

  test('renders a hostile public workshop inquiry as inert text in the admin CRM', async ({ page, request }) => {
    // A unique marker keeps this additive record identifiable on the shared server.
    const marker = `xss-${randomUUID().slice(0, 8)}`;
    const companyName = `<img src=x onerror="window.__simdreamXss='${marker}'">${marker}`;
    const contactName = `<script>window.__simdreamXss='${marker}'</script>`;
    const message = `<svg onload="window.__simdreamXss='${marker}'"></svg>`;
    const created = await request.post('/api/workshops', {
      data: { companyName, contactName, email: `${marker}@corp.test`, phone: '+972501234567', teamSize: 4, primaryGoal: 'leadership', message },
    });
    expect(created.status()).toBe(201);
    const dialogs: string[] = [];
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });

    await page.goto('/admin/workshops');

    await expect(page.getByRole('heading', { name: companyName })).toBeVisible();
    await expect(page.getByText(`Contact: ${contactName}`)).toBeVisible();
    await expect(page.getByText(message)).toBeVisible();
    // Injected markup would have produced these elements and set the probe.
    await expect(page.locator('img[src="x"], svg[onload]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as ProbeWindow).__simdreamXss)).toBeUndefined();
    expect(dialogs).toEqual([]);
  });
});
