<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project skills

Official Anthropic skills installed at `.claude/skills/` (sourced from
[anthropics/skills](https://github.com/anthropics/skills)).

| Skill | When to apply |
| ----- | ------------- |
| [`frontend-design`](./.claude/skills/frontend-design/SKILL.md) | Building UI components, pages, layouts, or styling any web interface |
| [`webapp-testing`](./.claude/skills/webapp-testing/SKILL.md) | Interacting with / testing the local app via Playwright (UI verify, screenshots, browser logs) |
| [`pdf`](./.claude/skills/pdf/SKILL.md) | Generating PDF reports (monthly expense summary, group invoices) |
| [`xlsx`](./.claude/skills/xlsx/SKILL.md) | Exporting expense data to Excel / CSV |
| [`theme-factory`](./.claude/skills/theme-factory/SKILL.md) | Creating new color themes / palette variants |
| [`brand-guidelines`](./.claude/skills/brand-guidelines/SKILL.md) | Building brand kit, logo system, asset rules |
| [`web-artifacts-builder`](./.claude/skills/web-artifacts-builder/SKILL.md) | Standalone shareable pages (e.g. public invoice links) |
| [`skill-creator`](./.claude/skills/skill-creator/SKILL.md) | Creating new skills or improving existing ones |

Index: [`.claude/skills/README.md`](./.claude/skills/README.md).

For project-specific Yarbayar patterns (Supabase, Next.js 16, library
catalog), see [`PATTERNS.md`](./PATTERNS.md) at the repo root.

## Commit style

- One concern per commit. Use imperative mood ("Add scan-receipt parser",
  not "Added").
- Reference the file or area touched in the summary line.
- Do not commit `.env.local` or anything containing secrets.

## Build verification

Before claiming a change is done, run `npm run build` and ensure it
finishes without TypeScript errors or new warnings.
