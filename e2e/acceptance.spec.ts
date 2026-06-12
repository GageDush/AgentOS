import { test, expect } from "@playwright/test";

test.describe("AgentOS acceptance criteria", () => {
  test("API health responds", async ({ request }) => {
    const apiBase = process.env.E2E_API_URL ?? "http://127.0.0.1:8787";
    const health = await request.get(`${apiBase}/health`);
    expect(health.ok()).toBeTruthy();
    const body = await health.json();
    expect(body.ok).toBe(true);
  });

  test("canonical agent roster API", async ({ request }) => {
    const apiBase = process.env.E2E_API_URL ?? "http://127.0.0.1:8787";
    const roster = await request.get(`${apiBase}/agents/roster`);
    expect(roster.ok()).toBeTruthy();
    const body = (await roster.json()) as { agents: Array<{ id: string }> };
    const ids = body.agents.map((agent) => agent.id);
    expect(ids).toContain("code-implementer");
    expect(ids).toContain("security-auditor");
    expect(ids).not.toContain("builder-agent");
  });

  test("run gates API shape", async ({ request }) => {
    const apiBase = process.env.E2E_API_URL ?? "http://127.0.0.1:8787";
    const dashboard = await request.get(`${apiBase}/dashboard`);
    if (!dashboard.ok()) {
      test.skip();
      return;
    }
    const payload = (await dashboard.json()) as { runs?: Array<{ id: string }> };
    const runId = payload.runs?.[0]?.id;
    if (!runId) {
      test.skip();
      return;
    }
    const gates = await request.get(`${apiBase}/runs/${runId}/gates`);
    expect(gates.ok()).toBeTruthy();
    const body = (await gates.json()) as { required: string[]; results: unknown[] };
    expect(Array.isArray(body.required)).toBe(true);
    expect(Array.isArray(body.results)).toBe(true);
  });

  test("memory queue API responds", async ({ request }) => {
    const apiBase = process.env.E2E_API_URL ?? "http://127.0.0.1:8787";
    const queue = await request.get(`${apiBase}/memory/queue`);
    expect(queue.ok()).toBeTruthy();
    const body = (await queue.json()) as { items: unknown[] };
    expect(Array.isArray(body.items)).toBe(true);
  });

  test("dashboard shell loads with mission control copy", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/mission control|Command Center/i).first()).toBeVisible({ timeout: 20000 });
  });

  test("missions route is reachable", async ({ page }) => {
    await page.goto("/missions");
    await expect(page.getByText(/Compose Mission|Mission Queue/i).first()).toBeVisible({ timeout: 20000 });
  });

  test("blackbox route is reachable", async ({ page }) => {
    await page.goto("/blackbox");
    await expect(page.getByText(/Blackbox|Audit Trail/i).first()).toBeVisible({ timeout: 20000 });
  });
});
