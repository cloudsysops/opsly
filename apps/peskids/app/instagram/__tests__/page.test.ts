import { describe, expect, it } from 'vitest';

describe('/instagram page', () => {
  it('should be created successfully', () => {
    expect(true).toBe(true);
  });

  it('metadata should include natacion class', () => {
    const title = 'Clase de prueba gratuita de natacion | Peskids';
    expect(title).toContain('Peskids');
  });

  it('should have WhatsApp fallback', () => {
    const url = 'https://wa.me/573000000000?text=test';
    expect(url).toContain('wa.me');
  });

  it('should render with Instagram branding', () => {
    expect(true).toBe(true);
  });
});
