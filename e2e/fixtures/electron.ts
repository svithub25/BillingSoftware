import { _electron as electron, test as base } from '@playwright/test';
import path from 'path';
import fs from 'node:fs';

type Fixtures = {
  app: Awaited<ReturnType<typeof electron.launch>>;
  page: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>;
  testDbPath: string;
  seedBillingSale: () => Promise<{
    billNumber: string;
    customerName: string;
    totalAmount: number;
    itemName: string;
    initialStock: number;
    soldQuantity: number;
    expectedStock: number;
  }>;
};

export const test = base.extend<Fixtures>({
  testDbPath: async ({}, use, testInfo) => {
    const sanitized = testInfo.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    const fileName = `${Date.now()}_${sanitized}.sqlite`;
    const dbPath = path.join(process.cwd(), 'tmp', 'e2e', fileName);
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { force: true });
    }   
    await use(dbPath);
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { force: true });
    }
  },

  app: async ({ testDbPath }, use) => {
    const app = await electron.launch({
      args: ['.'],
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'development',
        E2E_DB_PATH: testDbPath
      }
    });

    await use(app);
    await app.close();
  },

  page: async ({ app }, use) => {
    const pickRendererWindow = () => {
      const windows = app.windows();
      return windows.find((candidate) => !candidate.url().startsWith('devtools://'));
    };

    let page = pickRendererWindow();
    if (!page) {
      page = await app.waitForEvent('window', {
        predicate: (candidate) => !candidate.url().startsWith('devtools://')
      });
    }

    await page.waitForLoadState('domcontentloaded');
    await use(page);
  },

  seedBillingSale: async ({ page }, use, testInfo) => {
    await use(async () => {
      const testSuffix = testInfo.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase().slice(0, 20);

      return page.evaluate(async ({ suffix }) => {
        const api = window.electronAPI;
        if (!api) {
          throw new Error('electronAPI is not available');
        }

        const category = await api.addCategory({ name: `E2E Category ${suffix}` });
        const customerName = `E2E Customer ${suffix}`;
        const customerContact = `${Date.now()}`.slice(-10);
        const itemName = `E2E Item ${suffix}`;
        const initialStock = 25;
        const soldQuantity = 2;

        const item = await api.addItem({
          name: itemName,
          sku: `E2E-${suffix}-${Math.floor(Math.random() * 10000)}`,
          hsn_code: '9608',
          description: 'Automated test item',
          unit: 'pcs',
          mrp: 100,
          purchase_rate: 60,
          sale_rate: 100,
          gst_percentage: 0,
          category_id: category.id,
          current_stock: initialStock,
          minimum_stock: 1
        });

        await api.addCustomer({
          name: customerName,
          contact: customerContact,
          address: 'Test Address',
          gstin: '',
          email: '',
          state: '',
          city: '',
          country: 'India',
          pincode: '',
          credit_limit: '',
          credit_days: ''
        });

        const billNumber = await api.generateBillNumber();
        const totalAmount = 200;

        await api.saveSale({
          bill_number: billNumber,
          customer_name: customerName,
          customer_contact: customerContact,
          customer_address: 'Test Address',
          customer_gstin: null,
          shipped_to_name: null,
          shipped_to_contact: null,
          shipped_to_address: null,
          shipped_to_gstin: null,
          is_shipped_different: false,
          sale_date: new Date().toISOString().split('T')[0],
          items: [
            {
              id: item.id,
              quantity: soldQuantity,
              unit_price: 100,
              gst_percentage: 0,
              cgst_amount: 0,
              sgst_amount: 0,
              total_price: totalAmount,
              batches: []
            }
          ],
          discount: 0,
          total_amount: totalAmount,
          cgst_total: 0,
          sgst_total: 0,
          rounding_off: 0,
          salesman_id: null,
          sale_type: 'customer'
        });

        return {
          billNumber,
          customerName,
          totalAmount,
          itemName,
          initialStock,
          soldQuantity,
          expectedStock: initialStock - soldQuantity
        };
      }, { suffix: testSuffix });
    });
  }
});

export { expect } from '@playwright/test';
