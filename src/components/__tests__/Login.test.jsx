import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Login from '../Login';

describe('Login', () => {
  it('calls onLogin after successful credentials', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    const mockLogin = vi.fn().mockResolvedValue({ id: 1, username: 'admin' });

    window.electronAPI.login = mockLogin;

    render(<Login onLogin={onLogin} />);

    await user.type(screen.getByPlaceholderText('Enter username'), 'admin');
    await user.type(screen.getByPlaceholderText('Enter password'), 'admin');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(mockLogin).toHaveBeenCalledWith('admin', 'admin');
    expect(onLogin).toHaveBeenCalledWith({ id: 1, username: 'admin' });
  });

  it('shows validation message when credentials are invalid', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    window.electronAPI.login = vi.fn().mockResolvedValue(null);

    render(<Login onLogin={onLogin} />);

    await user.type(screen.getByPlaceholderText('Enter username'), 'wrong');
    await user.type(screen.getByPlaceholderText('Enter password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });
});
