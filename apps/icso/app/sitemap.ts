import type { MetadataRoute } from 'next';
import { commercialCatalog } from '@/lib/commercial-catalog';
import { siteConfig } from '@/lib/site';

const routes = ['', '/services', '/quote', '/about', '/case-studies', '/contact'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const staticRoutes = routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: (path === '' ? 'weekly' : 'monthly') as 'weekly' | 'monthly',
    priority: path === '' ? 1 : 0.8,
  }));
  const moduleRoutes = commercialCatalog.modules.map((mod) => ({
    url: `${base}/modules/${encodeURIComponent(mod.id)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));
  return [...staticRoutes, ...moduleRoutes];
}
