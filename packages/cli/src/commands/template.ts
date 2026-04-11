import { Command } from 'commander';
import { join } from 'node:path';
import { access, writeFile, mkdir } from 'node:fs/promises';
import { TemplateLoader, DEFAULT_TEMPLATES } from '@claudetree/core';
import type { SessionTemplate } from '@claudetree/shared';

const CONFIG_DIR = '.claudetree';

function printTemplate(name: string, tmpl: SessionTemplate): void {
  const desc = tmpl.description ?? '(no description)';
  const skill = tmpl.skill ? `\x1b[33m[${tmpl.skill}]\x1b[0m ` : '';
  console.log(`  \x1b[36m${name}\x1b[0m ${skill}- ${desc}`);
}

export const templateCommand = new Command('template')
  .description('Manage session templates (list, show, create)')
  .addCommand(
    new Command('list')
      .description('List all available templates')
      .action(async () => {
        const cwd = process.cwd();
        const loader = new TemplateLoader(join(cwd, CONFIG_DIR));

        console.log('\n\x1b[36mBuilt-in Templates:\x1b[0m\n');
        for (const [name, tmpl] of Object.entries(DEFAULT_TEMPLATES)) {
          printTemplate(name, tmpl);
        }

        const custom = await loader.loadAll();
        if (Object.keys(custom).length > 0) {
          console.log('\n\x1b[36mCustom Templates:\x1b[0m\n');
          for (const [name, tmpl] of Object.entries(custom)) {
            printTemplate(name, tmpl);
          }
        }

        console.log(`\n  Total: ${Object.keys(DEFAULT_TEMPLATES).length + Object.keys(custom).length} template(s)`);
        console.log('  Use: \x1b[90mct template show <name>\x1b[0m for details\n');
      }),
  )
  .addCommand(
    new Command('show')
      .description('Show template details')
      .argument('<name>', 'Template name')
      .action(async (name: string) => {
        const cwd = process.cwd();
        const loader = new TemplateLoader(join(cwd, CONFIG_DIR));

        let tmpl: SessionTemplate | null = null;

        if (name in DEFAULT_TEMPLATES) {
          tmpl = DEFAULT_TEMPLATES[name] ?? null;
        }

        if (!tmpl) {
          tmpl = await loader.load(name);
        }

        if (!tmpl) {
          console.error(`Template "${name}" not found.`);
          console.log('Run: ct template list');
          process.exit(1);
        }

        console.log(`\n\x1b[36m╔══════════════════════════════════════════╗\x1b[0m`);
        console.log(`\x1b[36m║  Template: ${tmpl.name.padEnd(29)}║\x1b[0m`);
        console.log(`\x1b[36m╚══════════════════════════════════════════╝\x1b[0m\n`);

        if (tmpl.description) {
          console.log(`  Description: ${tmpl.description}`);
        }
        if (tmpl.skill) {
          console.log(`  Skill: ${tmpl.skill}`);
        }
        if (tmpl.allowedTools?.length) {
          console.log(`  Allowed tools: ${tmpl.allowedTools.join(', ')}`);
        }
        if (tmpl.promptPrefix) {
          console.log(`\n  \x1b[33mPrompt Prefix:\x1b[0m`);
          console.log(`  ${tmpl.promptPrefix.split('\n').join('\n  ')}`);
        }
        if (tmpl.promptSuffix) {
          console.log(`\n  \x1b[33mPrompt Suffix:\x1b[0m`);
          console.log(`  ${tmpl.promptSuffix}`);
        }
        console.log('');
      }),
  )
  .addCommand(
    new Command('create')
      .description('Create a custom template')
      .argument('<name>', 'Template name')
      .option('-d, --description <desc>', 'Template description')
      .option('-p, --prompt <prompt>', 'Prompt prefix')
      .option('-s, --skill <skill>', 'Skill to activate (tdd, review, docs)')
      .action(async (name: string, options: { description?: string; prompt?: string; skill?: string }) => {
        const cwd = process.cwd();
        const templatesDir = join(cwd, CONFIG_DIR, 'templates');

        try {
          await access(join(cwd, CONFIG_DIR));
        } catch {
          console.error('Error: claudetree not initialized. Run "claudetree init" first.');
          process.exit(1);
        }

        const template: SessionTemplate = {
          name,
          description: options.description ?? `Custom template: ${name}`,
          promptPrefix: options.prompt ?? `You are working with the ${name} template. Follow best practices.`,
          skill: options.skill as SessionTemplate['skill'],
        };

        await mkdir(templatesDir, { recursive: true });
        await writeFile(
          join(templatesDir, `${name}.json`),
          JSON.stringify(template, null, 2),
        );

        console.log(`\n\x1b[32m✓\x1b[0m Template "${name}" created`);
        console.log(`  Path: ${join(templatesDir, `${name}.json`)}`);
        console.log(`  Use: ct start <issue> --template ${name}\n`);
      }),
  );
