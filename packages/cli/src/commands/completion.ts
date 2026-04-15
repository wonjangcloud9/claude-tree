import { Command } from 'commander';

const BASH_COMPLETION = `
_claudetree_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local commands="init start status stats log stop resume batch auto bustercall chain config diff doctor export pr rerun summary tag template watch web list clean cleanup archive inspect cost"

  if [ "\${COMP_CWORD}" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
  fi
}

complete -F _claudetree_completions claudetree
complete -F _claudetree_completions ct
`.trim();

const ZSH_COMPLETION = `
#compdef claudetree ct

_claudetree() {
  local -a commands
  commands=(
    'init:Initialize claudetree in your project'
    'start:Start a Claude session for a GitHub issue'
    'status:Show all session statuses'
    'stats:Session analytics and cost breakdown'
    'log:View session events and output'
    'stop:Stop a running session'
    'resume:Resume a paused session'
    'batch:Process issues in parallel'
    'auto:Auto-fetch issues with conflict detection'
    'chain:Run issues sequentially'
    'config:View or modify configuration'
    'diff:View worktree changes'
    'doctor:Verify setup'
    'export:Generate session report'
    'pr:Create PRs from completed sessions'
    'rerun:Rerun a failed/completed session'
    'summary:Work activity summary'
    'tag:Manage session tags'
    'template:Manage session templates'
    'watch:Monitor active sessions'
    'web:Launch web dashboard'
    'list:List all worktrees'
    'clean:Remove finished worktrees'
    'cleanup:Smart cleanup of sessions and worktrees'
    'archive:Archive completed sessions'
    'inspect:Detailed session information'
    'cost:Cost analytics and budget monitoring'
    'completion:Generate shell completion script'
  )

  _describe 'commands' commands
}

compdef _claudetree claudetree
compdef _claudetree ct
`.trim();

const FISH_COMPLETION = `
complete -c claudetree -f
complete -c ct -f

set -l commands init start status stats log stop resume batch auto chain config diff doctor export pr rerun summary tag template watch web list clean cleanup archive inspect cost completion

for cmd in $commands
  complete -c claudetree -n "__fish_use_subcommand" -a $cmd
  complete -c ct -n "__fish_use_subcommand" -a $cmd
end
`.trim();

export const completionCommand = new Command('completion')
  .description('Generate shell completion script')
  .argument('[shell]', 'Shell type: bash, zsh, or fish (auto-detected if omitted)')
  .action((_shell?: string) => {
    let shell = _shell;

    // Auto-detect shell
    if (!shell) {
      const shellEnv = process.env.SHELL ?? '';
      if (shellEnv.includes('zsh')) shell = 'zsh';
      else if (shellEnv.includes('fish')) shell = 'fish';
      else shell = 'bash';
    }

    switch (shell) {
      case 'bash':
        console.log(BASH_COMPLETION);
        console.log(`\n# Add to ~/.bashrc:\n# eval "$(claudetree completion bash)"`);
        break;
      case 'zsh':
        console.log(ZSH_COMPLETION);
        console.log(`\n# Add to ~/.zshrc:\n# eval "$(claudetree completion zsh)"`);
        break;
      case 'fish':
        console.log(FISH_COMPLETION);
        console.log(`\n# Save to ~/.config/fish/completions/claudetree.fish`);
        break;
      default:
        console.error(`Unknown shell: ${shell}. Supported: bash, zsh, fish`);
        process.exit(1);
    }
  });
