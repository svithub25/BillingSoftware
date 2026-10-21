import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CreditDebitNote from '../CreditDebitNote';

const notesFixture = [
  {
    id: 1,
    note_number: 'CN-001',
    note_type: 'credit',
    note_date: '2026-04-01',
    party_name: 'Acme Corp',
    original_invoice_number: 'INV-1',
    total_amount: 100,
    status_code: 0
  },
  {
    id: 2,
    note_number: 'DN-001',
    note_type: 'debit',
    note_date: '2026-04-05',
    party_name: 'Beta Corp',
    original_invoice_number: 'PINV-2',
    total_amount: 50,
    status_code: 0
  }
];

describe('CreditDebitNote', () => {
  it('loads and renders notes from electron api', async () => {
    window.electronAPI.getCreditDebitNotes = vi.fn().mockResolvedValue(notesFixture);

    render(
      <MemoryRouter>
        <CreditDebitNote />
      </MemoryRouter>
    );

    expect(await screen.findByText('CN-001')).toBeInTheDocument();
    expect(screen.getByText('DN-001')).toBeInTheDocument();
  });

  it('filters notes by search input', async () => {
    const user = userEvent.setup();
    window.electronAPI.getCreditDebitNotes = vi.fn().mockResolvedValue(notesFixture);

    render(
      <MemoryRouter>
        <CreditDebitNote />
      </MemoryRouter>
    );

    await screen.findByText('CN-001');

    await user.type(screen.getByPlaceholderText('Search note, party, or invoice'), 'beta');

    await waitFor(() => {
      expect(screen.queryByText('CN-001')).not.toBeInTheDocument();
      expect(screen.getByText('DN-001')).toBeInTheDocument();
    });
  });

  it('clears all filter values when clear filters is clicked', async () => {
    const user = userEvent.setup();
    window.electronAPI.getCreditDebitNotes = vi.fn().mockResolvedValue(notesFixture);

    render(
      <MemoryRouter>
        <CreditDebitNote />
      </MemoryRouter>
    );

    await screen.findByText('CN-001');

    const searchInput = screen.getByPlaceholderText('Search note, party, or invoice');
    const typeSelect = screen.getByRole('combobox');
    const [dateFromInput, dateToInput] = screen.getAllByPlaceholderText(/date/i);

    await user.type(searchInput, 'Acme');
    await user.selectOptions(typeSelect, 'debit');
    await user.type(dateFromInput, '2026-04-01');
    await user.type(dateToInput, '2026-04-30');

    await user.click(screen.getByRole('button', { name: 'Clear Filters' }));

    expect(searchInput).toHaveValue('');
    expect(typeSelect).toHaveValue('all');
    expect(dateFromInput).toHaveValue('');
    expect(dateToInput).toHaveValue('');
  });

  it('opens delete confirmation and deletes selected note', async () => {
    const user = userEvent.setup();
    window.electronAPI.getCreditDebitNotes = vi
      .fn()
      .mockResolvedValueOnce(notesFixture)
      .mockResolvedValueOnce([notesFixture[1]]);
    window.electronAPI.deleteCreditDebitNote = vi.fn().mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <CreditDebitNote />
      </MemoryRouter>
    );

    await screen.findByText('CN-001');

    await user.click(screen.getAllByTitle('Delete Note')[0]);
    expect(screen.getByText('Delete Credit/Debit Note')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(window.electronAPI.deleteCreditDebitNote).toHaveBeenCalledWith(2);
    });
  });

  it('supports pagination for large note list', async () => {
    const user = userEvent.setup();
    const manyNotes = Array.from({ length: 25 }, (_, idx) => ({
      id: idx + 1,
      note_number: `CN-${idx + 1}`,
      note_type: idx % 2 === 0 ? 'credit' : 'debit',
      note_date: '2026-04-01',
      party_name: `Party ${idx + 1}`,
      original_invoice_number: `INV-${idx + 1}`,
      total_amount: 100 + idx,
      status_code: 0
    }));

    window.electronAPI.getCreditDebitNotes = vi.fn().mockResolvedValue(manyNotes);

    render(
      <MemoryRouter>
        <CreditDebitNote />
      </MemoryRouter>
    );

    await screen.findByText('CN-25');
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
  });
});
