import { expect, test } from '../fixtures/electron';

const login = async (page) => {
  await page.getByPlaceholder('Enter username').fill('admin');
  await page.getByPlaceholder('Enter password').fill('admin');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
};

test('seeded sale reduces current stock in inventory', async ({ page, seedBillingSale }) => {
  const seeded = await seedBillingSale();

  await login(page);
  await page.getByRole('link', { name: 'Inventory', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Inventory Management' })).toBeVisible();

  await page.getByPlaceholder('Search items by name or category or sku ...').fill(seeded.itemName);

  const itemCell = page.getByRole('cell', { name: seeded.itemName }).first();
  await expect(itemCell).toBeVisible();

  const itemRow = page.getByRole('row').filter({ has: itemCell }).first();
  await expect(itemRow.getByText(seeded.expectedStock.toString(), { exact: true })).toBeVisible();
});
