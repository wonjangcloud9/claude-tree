---
"@claudetree/cli": minor
---

feat: enhance bustercall with batch ID tracking, resume mode, and priority sorting

- Bustercall now auto-assigns a unique batch ID to every run, auto-tagging all sessions
- New `--resume <batchId>` flag to retry only failed sessions from a previous batch
- New `--sort <strategy>` flag to sort issues by priority labels, newest, or oldest
- Summary now shows batch ID and resume command for failed sessions
- New `ct tag <id> add/remove <tags...>` command for post-creation tag management
- New `ct status --state <status>` flag to filter sessions by status
- Session duration display in `ct status` output
