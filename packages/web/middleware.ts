import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './src/i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

export const config = {
  matcher: ['/', '/(ko|ja|zh|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
