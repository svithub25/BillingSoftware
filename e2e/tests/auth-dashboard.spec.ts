import { expect, test } from '../fixtures/electron';

test('user can login and land on dashboard', async ({ page }) => {
  await expect(page.getByText('SV\'s BizzSaathi')).toBeVisible();
  await page.getByPlaceholder('Enter username').fill('admin');
  await page.getByPlaceholder('Enter password').fill('admin');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Keyboard Shortcuts')).toBeVisible();
});
