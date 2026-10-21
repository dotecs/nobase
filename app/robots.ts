import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: ['/admin', '/dashboard', '/lessons', '/api', '/start', '/payments', '/workbook', '/auth', '/dev-login', '/math-test', '/complete-profile', '/booking'],
    },
    sitemap: 'https://nobase911.com/sitemap.xml',
  };
}
