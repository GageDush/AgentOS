import { describe, expect, it } from "vitest";
import { validateScraperUrl } from "./url-policy";

describe("validateScraperUrl", () => {
  it("allows public https URLs", () => {
    const result = validateScraperUrl("https://example.com/page");
    expect(result.ok).toBe(true);
  });

  it("blocks loopback", () => {
    expect(validateScraperUrl("http://127.0.0.1/admin").ok).toBe(false);
    expect(validateScraperUrl("http://localhost/").ok).toBe(false);
  });

  it("blocks cloud metadata IP", () => {
    expect(validateScraperUrl("http://169.254.169.254/latest/meta-data/").ok).toBe(false);
  });

  it("blocks RFC1918", () => {
    expect(validateScraperUrl("http://10.0.0.5/internal").ok).toBe(false);
    expect(validateScraperUrl("http://192.168.1.1/").ok).toBe(false);
  });

  it("blocks file and data schemes", () => {
    expect(validateScraperUrl("file:///etc/passwd").ok).toBe(false);
    expect(validateScraperUrl("data:text/html,hello").ok).toBe(false);
  });
});
