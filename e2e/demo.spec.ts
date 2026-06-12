import { test, expect } from "@playwright/test";

test.describe("AgentOS demo gate", () => {
  test("health and dashboard shell load", async ({ page, request }) => {
    const apiBase = process.env.E2E_API_URL ?? "http://127.0.0.1:8787";
    const health = await request.get(`${apiBase}/health`);
    expect(health.ok()).toBeTruthy();

    await page.goto("/");
    await expect(page.getByText(/mission control|Command Center/i).first()).toBeVisible({ timeout: 20000 });
  });
});
