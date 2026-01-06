export interface SessionTemplate {
  name: string;
  description?: string;
  promptPrefix?: string;
  promptSuffix?: string;
  systemPrompt?: string;
  skill?: 'tdd' | 'review';
  allowedTools?: string[];
}

export interface TemplateConfig {
  templates: Record<string, SessionTemplate>;
}
