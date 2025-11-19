# timetrack-pro-199350-199363

## Environment Files and Vite Hot Reload

The Vite dev server is configured to **ignore changes** to `.env`, `.env.example`, `.env.*`, and `.env*.example` (including `.env.sample`) for file watching and HMR. This prevents infinite restart loops.

- Use `.env` for local secrets and configuration. Never commit it.
- Use `.env.example` as the template for required environment variables.
- **Do not modify `.env` or `.env.example` while the dev server is running, unless intentionally.**

To add new env vars:
1. Add to `.env` locally.
2. Add a placeholder to `.env.example` for sharing config structure.

If you experience dev server restarts in a loop, verify you are not writing to `.env` or `.env.example` on app/scripts start, and that editor autosave isn't constantly touching these files.
