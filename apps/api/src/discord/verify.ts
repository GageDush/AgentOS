import { createPublicKey, verify } from "node:crypto";

function ed25519PublicKey(publicKeyHex: string) {
  const raw = Buffer.from(publicKeyHex, "hex");
  const spkiPrefix = Buffer.from("302a300506032b6570032100", "hex");
  return createPublicKey({
    key: Buffer.concat([spkiPrefix, raw]),
    format: "der",
    type: "spki"
  });
}

export function verifyDiscordInteractionSignature(
  publicKeyHex: string,
  signatureHex: string,
  timestamp: string,
  rawBody: string
) {
  try {
    const key = ed25519PublicKey(publicKeyHex);
    return verify(null, Buffer.from(timestamp + rawBody), key, Buffer.from(signatureHex, "hex"));
  } catch {
    return false;
  }
}
