import type { OperatorSession } from "./session";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function discordAvatarUrl(session: OperatorSession) {
  if (session.avatar) {
    return `https://cdn.discordapp.com/avatars/${session.discordUserId}/${session.avatar}.png?size=128`;
  }
  const fallback = Number(BigInt(session.discordUserId) % 5n);
  return `https://cdn.discordapp.com/embed/avatars/${fallback}.png`;
}

function displayName(session: OperatorSession) {
  return session.globalName ?? session.username;
}

const pageStyles = `
  :root {
    color-scheme: dark;
    --bg: #0a0908;
    --bg-2: #131110;
    --panel: rgba(28, 26, 23, 0.94);
    --line: rgba(255, 255, 255, 0.07);
    --line-strong: rgba(255, 106, 53, 0.32);
    --text: #f5f2ee;
    --muted: #a89d92;
    --cyan: #ff6a35;
    --green: #22c97a;
    --violet: #f04e1a;
    --shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    min-height: 100%;
    background:
      radial-gradient(circle at top left, rgba(255, 106, 53, 0.1), transparent 24rem),
      radial-gradient(circle at bottom right, rgba(240, 78, 26, 0.08), transparent 26rem),
      linear-gradient(160deg, var(--bg), var(--bg-2));
    color: var(--text);
    font-family: "Inter", system-ui, "Segoe UI", sans-serif;
  }
  body {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
  }
  .grid {
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
    background-size: 42px 42px;
    mask-image: linear-gradient(180deg, rgba(255, 255, 255, 0.7), transparent 80%);
    pointer-events: none;
  }
  .shell {
    position: relative;
    width: min(100%, 32rem);
  }
  .card {
    border: 1px solid var(--line);
    border-radius: 20px;
    background:
      linear-gradient(180deg, rgba(8, 14, 24, 0.98), rgba(10, 18, 30, 0.96)),
      radial-gradient(circle at top left, rgba(95, 228, 161, 0.08), transparent 14rem);
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  .card-head {
    padding: 28px 28px 0;
  }
  .kicker {
    margin: 0 0 10px;
    color: var(--cyan);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 11px;
  }
  h1 {
    margin: 0;
    font-size: 28px;
    line-height: 1.1;
    font-family: "Trebuchet MS", Bahnschrift, sans-serif;
  }
  .lede {
    margin: 12px 0 0;
    color: var(--muted);
    line-height: 1.55;
  }
  .card-body {
    padding: 24px 28px 28px;
    display: grid;
    gap: 18px;
  }
  .operator {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border-radius: 16px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.02);
  }
  .avatar {
    width: 64px;
    height: 64px;
    border-radius: 18px;
    border: 1px solid var(--line-strong);
    object-fit: cover;
    background: rgba(255, 255, 255, 0.04);
  }
  .operator-meta strong {
    display: block;
    font-size: 18px;
    margin-bottom: 4px;
  }
  .operator-meta span {
    color: var(--muted);
    font-size: 14px;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(95, 228, 161, 0.28);
    background: rgba(95, 228, 161, 0.08);
    color: var(--green);
    font-size: 12px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .badge::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 12px rgba(95, 228, 161, 0.8);
  }
  .actions {
    display: grid;
    gap: 10px;
  }
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0 16px;
    border-radius: 12px;
    border: 1px solid transparent;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
  }
  .button:hover { transform: translateY(-1px); }
  .button-primary {
    color: #041018;
    background: linear-gradient(135deg, var(--cyan), #7fd6ff);
    border-color: rgba(127, 214, 255, 0.4);
  }
  .button-secondary {
    color: var(--text);
    background: rgba(255, 255, 255, 0.03);
    border-color: var(--line);
  }
  .button-ghost {
    color: var(--muted);
    background: transparent;
    border-color: transparent;
  }
  .meta-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 10px;
  }
  .meta-list li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: rgba(255, 255, 255, 0.02);
    font-size: 14px;
  }
  .meta-list span { color: var(--muted); }
  code {
    font-family: Consolas, "SFMono-Regular", monospace;
    color: var(--violet);
    font-size: 13px;
    word-break: break-all;
  }
  .footer {
    padding: 0 28px 24px;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.5;
  }
`;

function pageShell(content: string, title: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <title>${escapeHtml(title)}</title>
    <style>${pageStyles}</style>
  </head>
  <body>
    <div class="grid" aria-hidden="true"></div>
    <main class="shell">${content}</main>
  </body>
</html>`;
}

export function renderAuthSuccessPage(session: OperatorSession, appUrl: string) {
  const name = escapeHtml(displayName(session));
  const operatorId = escapeHtml(session.operatorId);
  const username = escapeHtml(session.username);
  const issuedAt = escapeHtml(new Date(session.issuedAt).toLocaleString());
  const avatar = escapeHtml(discordAvatarUrl(session));
  const safeAppUrl = escapeHtml(appUrl);

  return pageShell(
    `<section class="card">
      <div class="card-head">
        <p class="kicker">AgentOS Command Center</p>
        <h1>Operator authenticated</h1>
        <p class="lede">Discord identity verified. Your session is active for API access and Command Center operations.</p>
      </div>
      <div class="card-body">
        <span class="badge">Session active</span>
        <div class="operator">
          <img class="avatar" src="${avatar}" alt="" width="64" height="64" />
          <div class="operator-meta">
            <strong>${name}</strong>
            <span>@${username}</span>
          </div>
        </div>
        <ul class="meta-list">
          <li><span>Operator ID</span><code>${operatorId}</code></li>
          <li><span>Signed in</span><span>${issuedAt}</span></li>
          <li><span>Provider</span><span>Discord OAuth</span></li>
        </ul>
        <div class="actions">
          <a class="button button-primary" href="${safeAppUrl}">Open Command Center</a>
          <a class="button button-secondary" href="/auth/me">View session details</a>
          <form method="post" action="/auth/logout">
            <button class="button button-ghost" type="submit" style="width:100%">Sign out</button>
          </form>
        </div>
      </div>
      <p class="footer">Secured via Cloudflare Tunnel on flous.dev. Local operator approval and quota rules still apply.</p>
    </section>`,
    "AgentOS — Signed in"
  );
}

export function renderAuthLoginRequiredPage(apiBaseUrl: string) {
  const loginUrl = escapeHtml(`${apiBaseUrl.replace(/\/$/, "")}/auth/discord`);
  return pageShell(
    `<section class="card">
      <div class="card-head">
        <p class="kicker">AgentOS Command Center</p>
        <h1>Sign in required</h1>
        <p class="lede">No active operator session was found. Authenticate with Discord to access AgentOS APIs and the Command Center.</p>
      </div>
      <div class="card-body">
        <div class="actions">
          <a class="button button-primary" href="${loginUrl}">Continue with Discord</a>
        </div>
      </div>
      <p class="footer">Only the <code>identify</code> scope is requested. Sessions expire after seven days of inactivity.</p>
    </section>`,
    "AgentOS — Sign in"
  );
}

export function renderAuthMePage(session: OperatorSession, appUrl: string) {
  const name = escapeHtml(displayName(session));
  const operatorId = escapeHtml(session.operatorId);
  const discordUserId = escapeHtml(session.discordUserId);
  const username = escapeHtml(session.username);
  const issuedAt = escapeHtml(session.issuedAt);
  const avatar = escapeHtml(discordAvatarUrl(session));
  const safeAppUrl = escapeHtml(appUrl);
  const json = escapeHtml(JSON.stringify({ authenticated: true, session }, null, 2));

  return pageShell(
    `<section class="card">
      <div class="card-head">
        <p class="kicker">Session inspector</p>
        <h1>Operator session</h1>
        <p class="lede">Live session payload for debugging and integrations.</p>
      </div>
      <div class="card-body">
        <div class="operator">
          <img class="avatar" src="${avatar}" alt="" width="64" height="64" />
          <div class="operator-meta">
            <strong>${name}</strong>
            <span>@${username}</span>
          </div>
        </div>
        <ul class="meta-list">
          <li><span>Authenticated</span><span>Yes</span></li>
          <li><span>Operator ID</span><code>${operatorId}</code></li>
          <li><span>Discord user</span><code>${discordUserId}</code></li>
          <li><span>Issued at</span><code>${issuedAt}</code></li>
        </ul>
        <pre style="margin:0;padding:14px;border-radius:14px;border:1px solid var(--line);background:rgba(0,0,0,0.22);overflow:auto;color:var(--text);font-size:12px;line-height:1.5;"><code>${json}</code></pre>
        <div class="actions">
          <a class="button button-primary" href="${safeAppUrl}">Open Command Center</a>
          <a class="button button-secondary" href="/auth/success">Back to sign-in status</a>
        </div>
      </div>
    </section>`,
    "AgentOS — Session"
  );
}
