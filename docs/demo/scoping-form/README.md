# AgentOS scoping form (web)

Multi-step wizard — one screen per project, auto-save, export for Cursor chat.

## Open locally (easiest)

```powershell
pnpm scoping:form
```

Or double-click `index.html` in this folder.

## Serve on your network (phone / another PC)

```powershell
pnpm scoping:form:serve
```

Opens at `http://localhost:3456` — share your LAN IP if needed.

## Publish publicly (free, no account)

1. Go to [Netlify Drop](https://app.netlify.com/drop)
2. Drag the folder `docs/demo/scoping-form` onto the page
3. You get a URL like `https://random-name.netlify.app` — bookmark it

Same works with [Cloudflare Pages](https://pages.cloudflare.com/) or GitHub Pages if you prefer.

## Tally / Google Forms

This repo does **not** auto-upload to Tally (needs your API key). The web form above is the maintained version.

If you want Tally specifically: create a free account at [tally.so](https://tally.so), then duplicate fields from `PROJECT_SCOPING_FORM.md`, or run (with your key):

```powershell
$env:TALLY_API_KEY = "your_key"
node scripts/create-tally-scoping-form.mjs
```

## After filling out

Click **Copy for Cursor chat** and paste the export in chat for revised gameplans.
