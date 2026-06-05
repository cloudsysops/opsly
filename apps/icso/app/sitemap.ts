import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';

const routes = ['', '/services', '/about', '/case-studies', '/contact'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.8,
  }));
}
