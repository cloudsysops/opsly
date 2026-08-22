/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { EmptyState, EmptyTenants, EmptySearch, EmptyError } from '../ui/empty-state';

describe('EmptyState component', () => {
  it('renders title, description, and accessibility attributes', () => {
    render(
      <EmptyState
        title="No items found"
        description="Try clearing your filters or changing search criteria."
        icon={<span data-testid="custom-icon">Icon</span>}
        action={<button>Create item</button>}
      />
    );

    const region = screen.getByRole('region', { name: 'No items found' });
    expect(region).toBeInTheDocument();
    expect(screen.getByText('No items found')).toBeInTheDocument();
    expect(screen.getByText('Try clearing your filters or changing search criteria.')).toBeInTheDocument();
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create item' })).toBeInTheDocument();
  });

  it('renders EmptyTenants helper component correctly', () => {
    render(<EmptyTenants />);
    expect(screen.getByRole('region', { name: 'No hay tenants' })).toBeInTheDocument();
    expect(screen.getByText('No hay tenants')).toBeInTheDocument();
    expect(screen.getByText('Cuando existan tenants asociados, aparecerán aquí.')).toBeInTheDocument();
  });

  it('renders EmptySearch helper component correctly', () => {
    render(<EmptySearch query="test-query" />);
    expect(screen.getByRole('region', { name: 'Sin resultados' })).toBeInTheDocument();
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    expect(screen.getByText('No encontramos resultados para "test-query".')).toBeInTheDocument();
  });

  it('renders EmptyError helper component correctly', () => {
    render(<EmptyError />);
    expect(screen.getByRole('region', { name: 'Error al cargar' })).toBeInTheDocument();
    expect(screen.getByText('Error al cargar')).toBeInTheDocument();
  });
});
