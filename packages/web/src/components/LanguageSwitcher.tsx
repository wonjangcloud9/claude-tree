'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { locales, localeNames, type Locale } from '@/i18n/config';

export function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Extract current locale from pathname
  const currentLocale = (locales.find((l) => pathname.startsWith(`/${l}`)) ||
    'en') as Locale;

  const handleLocaleChange = (newLocale: Locale) => {
    // Replace the locale in the pathname
    const segments = pathname.split('/');
    if (locales.includes(segments[1] as Locale)) {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    const newPath = segments.join('/') || '/';
    router.push(newPath);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'all var(--duration-fast) var(--ease-out)',
        }}
      >
        <GlobeIcon />
        {localeNames[currentLocale]}
        <ChevronIcon rotated={isOpen} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: '120px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 50,
            animation: 'fade-in var(--duration-fast) var(--ease-out)',
          }}
        >
          {locales.map((locale) => (
            <button
              key={locale}
              onClick={() => handleLocaleChange(locale)}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                background:
                  locale === currentLocale
                    ? 'var(--bg-tertiary)'
                    : 'transparent',
                border: 'none',
                color:
                  locale === currentLocale
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                fontSize: '13px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all var(--duration-fast) var(--ease-out)',
              }}
            >
              {localeNames[locale]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function ChevronIcon({ rotated }: { rotated: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{
        transition: 'transform var(--duration-fast) var(--ease-out)',
        transform: rotated ? 'rotate(180deg)' : 'rotate(0deg)',
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
