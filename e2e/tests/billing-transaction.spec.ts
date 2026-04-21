import { expect, test } from '../fixtures/electron';

const login = async (page) => {
  await page.getByPlaceholder('Enter username').fill('admin');
  await page.getByPlaceholder('Enter password').fill('admin');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
};

test('seeded sale appears in sales history with correct values', async ({ page, seedBillingSale }) => {
  const seeded = await seedBillingSale();

  await login(page);
  await page.getByRole('link', { name: 'Sales History', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Sales History' })).toBeVisible();

  await page.getByPlaceholder('Enter bill number').fill(seeded.billNumber);

  const billCell = page.getByRole('cell', { name: seeded.billNumber }).first();
  await expect(billCell).toBeVisible();

  const billRow = page.getByRole('row').filter({ has: billCell }).first();
  await expect(billRow.getByText(seeded.customerName)).toBeVisible();
  await expect(billRow.getByText(`₹${seeded.totalAmount.toLocaleString()}`)).toBeVisible();
});
