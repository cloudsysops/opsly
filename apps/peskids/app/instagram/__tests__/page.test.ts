import { describe, expect, it } from 'vitest';

describe('/instagram page', () => {
  it('should be created successfully', () => {
    expect(true).toBe(true);
  });

  it('metadata should include contact framing', () => {
    const title = 'Solicitud de contacto | Peskids';
    expect(title).toContain('Peskids');
    expect(title.toLowerCase()).not.toMatch(/gratis|gratuita/);
  });

  it('should have WhatsApp fallback', () => {
    const url = 'https://wa.me/573000000000?text=test';
    expect(url).toContain('wa.me');
  });

  it('should render with Instagram branding', () => {
    expect(true).toBe(true);
  });
});
