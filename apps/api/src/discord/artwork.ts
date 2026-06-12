import { deflateSync } from "node:zlib";

export type Rgba = [number, number, number, number];

const BG: Rgba = [7, 17, 31, 255];
const CYAN: Rgba = [0, 245, 212, 255];
const VIOLET: Rgba = [167, 139, 250, 255];
const GREEN: Rgba = [0, 255, 159, 255];
const AMBER: Rgba = [255, 176, 32, 255];
const RED: Rgba = [255, 59, 92, 255];

function setPixel(data: Uint8Array, size: number, x: number, y: number, color: Rgba) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const index = (y * size + x) * 4;
  data[index] = color[0];
  data[index + 1] = color[1];
  data[index + 2] = color[2];
  data[index + 3] = color[3];
}

function fill(data: Uint8Array, size: number, color: Rgba) {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      setPixel(data, size, x, y, color);
    }
  }
}

function drawRing(data: Uint8Array, size: number, color: Rgba, thickness: number, radius: number) {
  const center = (size - 1) / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= radius && distance >= radius - thickness) {
        setPixel(data, size, x, y, color);
      }
    }
  }
}

function drawCross(data: Uint8Array, size: number, color: Rgba, arm: number, thickness: number) {
  const center = Math.floor(size / 2);
  for (let offset = -arm; offset <= arm; offset += 1) {
    for (let t = -thickness; t <= thickness; t += 1) {
      setPixel(data, size, center + offset, center + t, color);
      setPixel(data, size, center + t, center + offset, color);
    }
  }
}

function drawGlyph(data: Uint8Array, size: number, glyph: "plus" | "dot" | "eye", accent: Rgba) {
  if (glyph === "plus") {
    drawCross(data, size, accent, Math.floor(size * 0.22), Math.max(1, Math.floor(size * 0.06)));
    drawRing(data, size, CYAN, Math.max(1, Math.floor(size * 0.05)), Math.floor(size * 0.34));
    return;
  }
  if (glyph === "dot") {
    drawRing(data, size, accent, Math.max(1, Math.floor(size * 0.08)), Math.floor(size * 0.18));
    return;
  }
  drawRing(data, size, accent, Math.max(1, Math.floor(size * 0.05)), Math.floor(size * 0.22));
  setPixel(data, size, Math.floor(size / 2), Math.floor(size / 2), [255, 255, 255, 255]);
}

function renderBitmap(size: number, glyph: "plus" | "dot" | "eye", accent: Rgba) {
  const data = new Uint8Array(size * size * 4);
  fill(data, size, BG);
  drawGlyph(data, size, glyph, accent);
  return data;
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

export function encodePng(width: number, height: number, rgba: Uint8Array) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[(stride + 1) * y] = 0;
    Buffer.from(rgba.subarray(y * stride, (y + 1) * stride)).copy(raw, (stride + 1) * y + 1);
  }
  const compressed = deflateSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]);
}

export function pngDataUri(size: number, glyph: "plus" | "dot" | "eye", accent: Rgba) {
  const png = encodePng(size, size, renderBitmap(size, glyph, accent));
  return `data:image/png;base64,${png.toString("base64")}`;
}

export const AGENTOS_GUILD_ICON = () => pngDataUri(256, "plus", VIOLET);

export const AGENTOS_EMOJI_SET = [
  { name: "agentos", glyph: "plus" as const, accent: VIOLET },
  { name: "aos_seen", glyph: "eye" as const, accent: GREEN },
  { name: "aos_pulse", glyph: "dot" as const, accent: CYAN },
  { name: "aos_approve", glyph: "dot" as const, accent: GREEN },
  { name: "aos_deny", glyph: "dot" as const, accent: RED },
  { name: "aos_warn", glyph: "dot" as const, accent: AMBER },
  { name: "aos_mission", glyph: "plus" as const, accent: CYAN }
] as const;

export const AGENTOS_EMBED_THUMBNAIL = () => pngDataUri(128, "plus", VIOLET);
