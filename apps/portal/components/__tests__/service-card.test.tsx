/* @vitest-environment jsdom */
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ServiceCard } from '../service-card';
import '@testing-library/jest-dom/vitest';

describe('ServiceCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders title, description, and external link with proper ARIA attributes', () => {
    render(
      <ServiceCard
        title="N8N Automation"
        description="Workflow automation service"
        url="https://n8n.example.com"
        actionLabel="Abrir servicio"
        showHealth={true}
        health="healthy"
        healthLabel="Operativo"
      />
    );

    expect(screen.getByText('N8N Automation')).toBeInTheDocument();
    expect(screen.getByText('Workflow automation service')).toBeInTheDocument();

    const linkEl = screen.getByRole('link', { name: 'Abrir N8N Automation en una nueva pestaña' });
    expect(linkEl).toHaveAttribute('href', 'https://n8n.example.com');

    const buttonLinkEl = screen.getByRole('link', { name: 'Abrir servicio (abre en una nueva pestaña)' });
    expect(buttonLinkEl).toHaveAttribute('href', 'https://n8n.example.com');
  });

  it('renders fallback when url is null', () => {
    render(
      <ServiceCard
        title="Disabled Service"
        url={null}
        actionLabel="Abrir servicio"
      />
    );

    expect(screen.getByText('URL no disponible')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
