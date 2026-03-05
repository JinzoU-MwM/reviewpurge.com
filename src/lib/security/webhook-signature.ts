import { createHmac, timingSafeEqual } from "node:crypto";

function asBuffer(value: string) {
  return Buffer.from(value, "utf8");
}

export function signWebhookPayload(input: {
  secret: string;
  timestamp: string;
  body: string;
}) {
  const payload = `${input.timestamp}.${input.body}`;
  return createHmac("sha256", input.secret).update(payload).digest("hex");
}

export function verifyWebhookSignature(input: {
  secret: string;
  timestamp: string;
  body: string;
  signature: string;
}) {
  const expected = signWebhookPayload({
    secret: input.secret,
    timestamp: input.timestamp,
    body: input.body,
  });

  const expectedBuffer = asBuffer(expected);
  const providedBuffer = asBuffer(input.signature);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}
