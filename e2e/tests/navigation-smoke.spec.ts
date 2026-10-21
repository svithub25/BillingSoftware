import { expect, test } from '../fixtures/electron';

const login = async (page) => {
  await page.getByPlaceholder('Enter username').fill('admin');
  await page.getByPlaceholder('Enter password').fill('admin');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
};

test('can navigate to billing module', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Billing', exact: true }).click();
  await expect(page.getByText('Customer Information')).toBeVisible();
  await expect(page.getByText('Bill No:')).toBeVisible();
});

test('can navigate to credit debit notes module', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Credit & Debit Note' }).click();
  await expect(page.getByRole('heading', { name: 'Credit & Debit Notes' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Note' })).toBeVisible();
});
