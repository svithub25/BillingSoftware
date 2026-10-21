import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  },
  ToastContainer: () => null
}));

beforeEach(() => {
  const electronAPI = {
    login: vi.fn(),
    getDashboardData: vi.fn().mockResolvedValue({ totalItems: 0, lowStockCount: 0, lowStockItems: [] }),
    getCreditDebitNotes: vi.fn().mockResolvedValue([]),
    deleteCreditDebitNote: vi.fn().mockResolvedValue({ success: true })
  };

  Object.defineProperty(window, 'electronAPI', {
    value: electronAPI,
    configurable: true,
    writable: true
  });

  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
