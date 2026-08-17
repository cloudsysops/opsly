/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ServiceCard } from '../service-card';

describe('ServiceCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders title, description, and status badge when healthy', () => {
    render(
      <ServiceCard
        title="Motor de Automatización"
        description="Procesa tus flujos de trabajo"
        url="https://n8n.example.com"
        actionLabel="Ver mis flujos"
        showHealth
        health="healthy"
        healthLabel="Activo"
      />
    );

    expect(screen.getByText('Motor de Automatización')).toBeInTheDocument();
    expect(screen.getByText('Procesa tus flujos de trabajo')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('renders accessible links with new tab warning aria-labels', () => {
    render(
      <ServiceCard
        title="Monitor de Disponibilidad"
        description="Vigila que todo funcione 24/7"
        url="https://uptime.example.com"
        actionLabel="Ver estado"
      />
    );

    const urlLink = screen.getByRole('link', {
      name: /Monitor de Disponibilidad: https:\/\/uptime.example.com \(se abre en una nueva pestaña\)/i,
    });
    expect(urlLink).toBeInTheDocument();
    expect(urlLink).toHaveAttribute('target', '_blank');
    expect(urlLink).toHaveAttribute('rel', 'noreferrer');

    const actionLink = screen.getByRole('link', {
      name: /Ver estado para Monitor de Disponibilidad \(se abre en una nueva pestaña\)/i,
    });
    expect(actionLink).toBeInTheDocument();
    expect(actionLink).toHaveAttribute('target', '_blank');
  });

  it('renders fallback when url is null', () => {
    render(
      <ServiceCard
        title="Servicio Desconectado"
        description="Sin URL configurada"
        url={null}
        actionLabel="Ver servicio"
      />
    );

    expect(screen.getByText('Servicio Desconectado')).toBeInTheDocument();
    expect(screen.getByText('URL no disponible')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
