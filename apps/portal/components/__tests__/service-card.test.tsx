/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ServiceCard } from '../service-card';

describe('ServiceCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders service details and accessible external link/button', () => {
    render(
      <ServiceCard
        title="n8n Automation"
        description="Workflow automation service"
        url="https://n8n.example.com"
        actionLabel="Abrir n8n"
        showHealth
        health="healthy"
        healthLabel="Activo"
      />
    );

    expect(screen.getByText('n8n Automation')).toBeInTheDocument();
    expect(screen.getByText('Workflow automation service')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /https:\/\/n8n\.example\.com/i });
    expect(link).toHaveAttribute('href', 'https://n8n.example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('aria-label', 'https://n8n.example.com (se abre en una nueva pestaña)');

    const actionButton = screen.getByRole('link', { name: /abrir n8n/i });
    expect(actionButton).toHaveAttribute('href', 'https://n8n.example.com');
    expect(actionButton).toHaveAttribute('target', '_blank');
    expect(actionButton).toHaveAttribute('aria-label', 'Abrir n8n (se abre en una nueva pestaña)');
  });

  it('renders unavailable URL placeholder when url is null', () => {
    render(
      <ServiceCard
        title="Offline Service"
        url={null}
        actionLabel="Abrir"
      />
    );

    expect(screen.getByText('URL no disponible')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
