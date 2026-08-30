/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreateInvoiceForm } from '../../app/dashboard/[tenant]/invoices/new/create-invoice-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/api', () => ({
  getApiBaseUrl: () => 'https://test-api.opsly.com',
}));

describe('CreateInvoiceForm', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders form elements correctly', () => {
    render(<CreateInvoiceForm tenant="test-tenant" />);

    expect(screen.getByLabelText(/email del cliente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre del cliente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha vencimiento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/moneda/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/iva/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notas/i)).toBeInTheDocument();

    // Check default values
    expect(screen.getByLabelText(/moneda/i)).toHaveValue('COP');
    expect(screen.getByLabelText(/iva/i)).toHaveValue(0);
  });

  it('updates form fields on user input', () => {
    render(<CreateInvoiceForm tenant="test-tenant" />);

    const emailInput = screen.getByLabelText(/email del cliente/i);
    const nameInput = screen.getByLabelText(/nombre del cliente/i);
    const notesInput = screen.getByLabelText(/notas/i);

    fireEvent.change(emailInput, { target: { value: 'test@client.com' } });
    fireEvent.change(nameInput, { target: { value: 'Client Name Inc.' } });
    fireEvent.change(notesInput, { target: { value: 'Some test notes' } });

    expect(emailInput).toHaveValue('test@client.com');
    expect(nameInput).toHaveValue('Client Name Inc.');
    expect(notesInput).toHaveValue('Some test notes');
  });

  it('renders the select and textarea with appropriate styles', () => {
    render(<CreateInvoiceForm tenant="test-tenant" />);

    const selectEl = screen.getByLabelText(/moneda/i);
    const textareaEl = screen.getByLabelText(/notas/i);

    expect(selectEl.className).toContain('focus-visible:ring-2');
    expect(textareaEl.className).toContain('focus-visible:ring-2');
  });
});
