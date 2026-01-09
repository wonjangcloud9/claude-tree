'use client';

import { CodeBlock } from './CodeBlock';
import {
  sectionContainer,
  pageTitle,
  sectionTitle,
  subSectionTitle,
  paragraph,
} from './docsStyles';

export function CliReferenceSection() {
  return (
    <section id="cli-reference" style={sectionContainer}>
      <h1 style={pageTitle}>CLI Reference</h1>
      <p style={paragraph}>Complete reference for all claudetree CLI commands.</p>

      <h2 id="ct-init" style={sectionTitle}>
        ct init
      </h2>
      <p style={paragraph}>Initialize claudetree in the current Git repository.</p>
      <CodeBlock
        code={`ct init [options]

Options:
  -d, --worktree-dir <dir>   Base directory for worktrees (default: ".worktrees")
  -f, --force                Overwrite existing configuration
  --slack <webhook-url>      Slack webhook URL for notifications`}
        language="bash"
      />

      <h4 style={subSectionTitle}>Example</h4>
      <CodeBlock
        code={`# Basic initialization
ct init

# Custom worktree directory
ct init --worktree-dir ./sessions

# With Slack notifications
ct init --slack https://hooks.slack.com/services/XXX/YYY/ZZZ`}
        language="bash"
      />

      <h4 style={subSectionTitle}>Generated Structure</h4>
      <CodeBlock
        code={`.claudetree/
├── config.json           # Main configuration
├── sessions.json         # Session registry
├── templates/            # Session templates
│   ├── bugfix.json
│   ├── feature.json
│   ├── refactor.json
│   └── review.json
└── events/               # Session event logs`}
        language="text"
        filename=".claudetree/"
      />

      <h2 id="ct-start" style={sectionTitle}>
        ct start
      </h2>
      <p style={paragraph}>
        Create a worktree and start a Claude session. <strong>TDD mode is enabled by default.</strong>
      </p>
      <CodeBlock
        code={`ct start <issue> [options]

Arguments:
  issue                      Issue number, GitHub URL, or task name

Options:
  -p, --prompt <prompt>      Initial prompt for Claude
  --no-session               Create worktree without starting Claude
  --no-tdd                   Disable TDD mode (just implement without test-first)
  -s, --skill <skill>        Skill to activate (review)
  -T, --template <template>  Session template (bugfix, feature, refactor, review)
  -b, --branch <branch>      Custom branch name
  -t, --token <token>        GitHub token (or use GITHUB_TOKEN env)
  --max-cost <cost>          Maximum cost in USD (stops session if exceeded)
  --timeout <minutes>        Total session timeout (default: 120)
  --idle-timeout <minutes>   Idle timeout (default: 10)
  --max-retries <n>          Max retries per validation gate (default: 3)
  --gates <gates>            Validation gates: test,type,lint,build (default: test,type)
  --test-command <cmd>       Custom test command (default: pnpm test)`}
        language="bash"
      />

      <h4 style={subSectionTitle}>TDD Mode (Default)</h4>
      <p style={paragraph}>
        Sessions run in TDD mode by default. Claude will write tests first, then implement. After
        completion, validation gates are automatically executed.
      </p>
      <CodeBlock
        code={`# TDD mode with 2h timeout (default)
ct start 42

# Custom timeout and gates
ct start 42 --timeout 60 --gates test,type,lint

# Disable TDD mode
ct start 42 --no-tdd`}
        language="bash"
      />

      <h4 style={subSectionTitle}>Examples</h4>
      <CodeBlock
        code={`# Start with issue number (fetches from GitHub if configured)
ct start 42

# Start with template
ct start 42 --template bugfix

# Start with custom prompt
ct start 42 --prompt "Focus on unit tests only"

# Create worktree only, don't start Claude
ct start 42 --no-session

# Custom branch name
ct start 42 --branch fix/login-validation

# Budget limit
ct start 42 --max-cost 5.00`}
        language="bash"
      />

      <h2 id="ct-batch" style={sectionTitle}>
        ct batch
      </h2>
      <p style={paragraph}>Start multiple Claude sessions in parallel.</p>
      <CodeBlock
        code={`ct batch [issues...] [options]

Arguments:
  issues                     Issue numbers or GitHub URLs

Options:
  -l, --label <label>        Filter GitHub issues by label
  -n, --limit <number>       Maximum issues to process (default: 5)
  -T, --template <template>  Session template to use
  -t, --token <token>        GitHub token
  -f, --file <file>          Read issues from file (one per line)
  -P, --parallel <number>    Parallel session count (default: 3)
  --dry-run                  Show what would be started`}
        language="bash"
      />

      <h4 style={subSectionTitle}>Examples</h4>
      <CodeBlock
        code={`# Start multiple issues
ct batch 42 43 44 45

# Process issues by label
ct batch --label "good first issue" --limit 10

# From file with template
ct batch --file issues.txt --template bugfix

# Dry run to preview
ct batch --label bug --dry-run

# Limit parallel sessions
ct batch 42 43 44 45 46 47 --parallel 2`}
        language="bash"
      />

      <h4 style={subSectionTitle}>Issues File Format</h4>
      <CodeBlock
        code={`# issues.txt - Comments start with #
42
43
https://github.com/owner/repo/issues/44
45`}
        language="text"
        filename="issues.txt"
      />

      <h2 id="ct-bustercall" style={sectionTitle}>
        ct bustercall
      </h2>
      <p style={paragraph}>
        Auto-fetch all open GitHub issues and start parallel Claude sessions. Unlike{' '}
        <code>ct batch</code>, this command automatically fetches issues from GitHub.
      </p>
      <CodeBlock
        code={`ct bustercall [options]

Options:
  -l, --label <label>        Filter by GitHub label (comma-separated for AND)
  -n, --limit <number>       Maximum issues to process (default: 10)
  -P, --parallel <number>    Number of parallel sessions (default: 3)
  -T, --template <template>  Session template to use
  -t, --token <token>        GitHub token (or use GITHUB_TOKEN env)
  -e, --exclude <numbers>    Exclude issue numbers (comma-separated)
  --dry-run                  Show target issues without starting`}
        language="bash"
      />

      <h4 style={subSectionTitle}>Examples</h4>
      <CodeBlock
        code={`# Process all open issues (up to 10)
ct bustercall

# Filter by label
ct bustercall --label bug

# Preview target issues
ct bustercall --dry-run

# 5 parallel sessions with bugfix template
ct bustercall -P 5 --template bugfix

# Exclude specific issues
ct bustercall --exclude 101,102,103`}
        language="bash"
      />

      <h4 style={subSectionTitle}>Requirements</h4>
      <p style={paragraph}>
        Requires GitHub configuration in <code>.claudetree/config.json</code>:
      </p>
      <CodeBlock
        code={`{
  "github": {
    "owner": "your-username",
    "repo": "your-repo"
  }
}`}
        language="json"
        filename="config.json"
      />

      <h2 id="ct-clean" style={sectionTitle}>
        ct clean
      </h2>
      <p style={paragraph}>
        Remove all worktrees except the main worktree. Useful for cleaning up after completing
        multiple tasks.
      </p>
      <CodeBlock
        code={`ct clean [options]

Options:
  -f, --force      Force removal without confirmation
  --keep-sessions  Keep session records after removal
  --dry-run        Show what would be removed without removing`}
        language="bash"
      />

      <h4 style={subSectionTitle}>Examples</h4>
      <CodeBlock
        code={`# Preview what would be removed
ct clean --dry-run

# Remove all worktrees (with confirmation)
ct clean

# Force remove without confirmation
ct clean --force

# Remove worktrees but keep session history
ct clean --keep-sessions`}
        language="bash"
      />

      <h2 id="ct-resume" style={sectionTitle}>
        ct resume
      </h2>
      <p style={paragraph}>Resume a paused session.</p>
      <CodeBlock
        code={`ct resume <session-id>

Arguments:
  session-id    Session ID (full or prefix match)`}
        language="bash"
      />

      <h4 style={subSectionTitle}>Example</h4>
      <CodeBlock
        code={`# Resume with full ID
ct resume a1b2c3d4-e5f6-7890-abcd-ef1234567890

# Resume with prefix
ct resume a1b2c3d4`}
        language="bash"
      />

      <h2 id="ct-status" style={sectionTitle}>
        ct status
      </h2>
      <p style={paragraph}>Show status of all sessions.</p>
      <CodeBlock
        code={`ct status [options]

Options:
  -a, --all      Show all sessions (including completed)
  --json         Output as JSON`}
        language="bash"
      />

      <h4 style={subSectionTitle}>Example Output</h4>
      <CodeBlock
        code={`$ ct status
SESSION ID   ISSUE   STATUS     BRANCH           CREATED
a1b2c3d4     #42     running    issue-42-fix     5 min ago
e5f6g7h8     #43     paused     issue-43-feat    2 hours ago
i9j0k1l2     #44     completed  issue-44-test    1 day ago`}
        language="text"
      />

      <h2 id="ct-list" style={sectionTitle}>
        ct list
      </h2>
      <p style={paragraph}>List all worktrees managed by claudetree.</p>
      <CodeBlock code="ct list" language="bash" />

      <h2 id="ct-stop" style={sectionTitle}>
        ct stop
      </h2>
      <p style={paragraph}>Stop a running session.</p>
      <CodeBlock
        code={`ct stop <session-id>

Options:
  --force    Force stop without graceful shutdown`}
        language="bash"
      />

      <h2 id="ct-web" style={sectionTitle}>
        ct web
      </h2>
      <p style={paragraph}>Start the web dashboard.</p>
      <CodeBlock
        code={`ct web [options]

Options:
  -p, --port <port>    Port number (default: 3000)
  --no-open            Don't open browser automatically`}
        language="bash"
      />
    </section>
  );
}
