'use client';

import {
  GettingStartedSection,
  CliReferenceSection,
  ConfigurationSection,
  SessionTemplatesSection,
  ArchitectureSection,
  ApiReferenceSection,
  AdvancedSection,
  DocsFooter,
} from '@/components/docs';

export default function DocsPage() {
  return (
    <article>
      <GettingStartedSection />
      <CliReferenceSection />
      <ConfigurationSection />
      <SessionTemplatesSection />
      <ArchitectureSection />
      <ApiReferenceSection />
      <AdvancedSection />
      <DocsFooter />
    </article>
  );
}
