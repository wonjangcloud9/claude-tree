import { spawn } from 'node:child_process';
import type { AIReviewSummary, AIReviewIssue } from '@claudetree/shared';

export interface GenerateReviewOptions {
  sessionId: string;
  workingDir: string;
  baseBranch?: string;
}

export async function generateAIReviewSummary(
  options: GenerateReviewOptions
): Promise<AIReviewSummary | null> {
  const { sessionId, workingDir, baseBranch = 'develop' } = options;

  try {
    // Get git diff
    const diff = await execCommand('git', ['diff', baseBranch, '--stat'], workingDir);
    const detailedDiff = await execCommand('git', ['diff', baseBranch], workingDir);

    if (!diff.trim()) {
      return null; // No changes
    }

    // Build prompt for Claude
    const prompt = buildReviewPrompt(diff, detailedDiff);

    // Call Claude CLI for analysis
    const result = await callClaude(prompt, workingDir);

    // Parse Claude's response
    const summary = parseClaudeResponse(result, sessionId);

    return summary;
  } catch (error) {
    console.error('Failed to generate AI review summary:', error);
    return null;
  }
}

function buildReviewPrompt(diffStat: string, detailedDiff: string): string {
  // Truncate if too long
  const maxDiffLength = 15000;
  const truncatedDiff =
    detailedDiff.length > maxDiffLength
      ? detailedDiff.slice(0, maxDiffLength) + '\n... (truncated)'
      : detailedDiff;

  return `Analyze this code change and provide a structured review summary.

## Git Diff Stats
\`\`\`
${diffStat}
\`\`\`

## Detailed Diff
\`\`\`diff
${truncatedDiff}
\`\`\`

Respond ONLY in this exact JSON format (no markdown, no extra text):
{
  "summary": "A concise 1-2 sentence summary of all changes",
  "whatChanged": ["List of specific changes made", "Each item is a brief description"],
  "whyChanged": "Inferred reasoning for why these changes were made",
  "potentialIssues": [
    {
      "severity": "info|warning|critical",
      "title": "Issue title",
      "description": "Detailed description of the issue",
      "file": "optional/path/to/file.ts",
      "line": 42
    }
  ],
  "suggestions": ["Actionable suggestions for improvement"],
  "riskLevel": "low|medium|high"
}`;
}

async function callClaude(prompt: string, workingDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      '-p', prompt,
      '--output-format', 'text',
      '--max-turns', '1',
    ];

    const proc = spawn('claude', args, {
      cwd: workingDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Claude exited with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', reject);

    // Timeout after 60 seconds
    setTimeout(() => {
      proc.kill();
      reject(new Error('Claude review generation timed out'));
    }, 60000);
  });
}

function parseClaudeResponse(response: string, sessionId: string): AIReviewSummary {
  // Extract JSON from response (Claude might add extra text)
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    sessionId,
    summary: parsed.summary || 'No summary available',
    whatChanged: parsed.whatChanged || [],
    whyChanged: parsed.whyChanged || 'Unknown',
    potentialIssues: (parsed.potentialIssues || []).map((issue: AIReviewIssue) => ({
      severity: issue.severity || 'info',
      title: issue.title || 'Issue',
      description: issue.description || '',
      file: issue.file,
      line: issue.line,
    })),
    suggestions: parsed.suggestions || [],
    riskLevel: parsed.riskLevel || 'low',
    generatedAt: new Date(),
  };
}

function execCommand(cmd: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => (stdout += data.toString()));
    proc.stderr.on('data', (data) => (stderr += data.toString()));

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`${cmd} failed: ${stderr}`));
      }
    });

    proc.on('error', reject);
  });
}
