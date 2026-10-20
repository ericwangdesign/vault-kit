// Which coding agent the vault runs for its own jobs: sorting the inbox, reading a cuttings folder.
// Claude Code by default. VAULT_AGENT picks another: gemini, codex, or any command that takes the
// prompt on stdin and does the job with the files it's given.
import { spawn } from 'node:child_process';

const PRESETS = {
  gemini: ['gemini', '--yolo'],
  codex: ['codex', 'exec', '--full-auto', '--skip-git-repo-check', '-'],
};

// claudeArgs: the arguments for Claude Code (the prompt goes on stdin either way).
export function runAgent(claudeArgs, prompt, opts) {
  const v = (process.env.VAULT_AGENT || '').trim();
  const [cmd, ...args] = !v || v === 'claude'
    ? [process.env.CLAUDE_BIN || 'claude', ...claudeArgs]
    : PRESETS[v.toLowerCase()] || v.split(/\s+/);
  const child = spawn(cmd, args, { ...opts, stdio: ['pipe', 'pipe', 'pipe'] });
  child.stdin.on('error', () => {});
  child.stdin.end(prompt);
  return child;
}

