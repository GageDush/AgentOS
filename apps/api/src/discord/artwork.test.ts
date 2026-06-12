import { describe, expect, it } from "vitest";
import { encodePng, pngDataUri } from "./artwork";

describe("discord artwork", () => {
  it("encodes a valid png buffer", () => {
    const rgba = new Uint8Array(16 * 16 * 4);
    for (let index = 0; index < rgba.length; index += 4) {
      rgba[index] = 7;
      rgba[index + 1] = 17;
      rgba[index + 2] = 31;
      rgba[index + 3] = 255;
    }
    const png = encodePng(16, 16, rgba);
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  });

  it("builds a data uri for guild artwork", () => {
    expect(pngDataUri(32, "plus", [167, 139, 250, 255])).toContain("data:image/png;base64,");
  });
});
