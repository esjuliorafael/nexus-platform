import crypto from "crypto";

type SignedEnvelope<T> = {
  payload: T;
  expiresAt: number;
};

const toBase64Url = (value: string) => Buffer.from(value).toString("base64url");
const fromBase64Url = (value: string) => Buffer.from(value, "base64url").toString("utf8");

export function signGatewayPayload<T>(payload: T, secret: string, ttlMs = 10 * 60 * 1000) {
  const envelope: SignedEnvelope<T> = {
    payload,
    expiresAt: Date.now() + ttlMs,
  };
  const encoded = toBase64Url(JSON.stringify(envelope));
  const signature = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyGatewayPayload<T>(token: string, secret: string): T | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const envelope = JSON.parse(fromBase64Url(encoded)) as SignedEnvelope<T>;
    if (!envelope?.payload || !Number.isFinite(envelope.expiresAt) || envelope.expiresAt < Date.now()) {
      return null;
    }
    return envelope.payload;
  } catch {
    return null;
  }
}

export function getTenantId() {
  if (process.env.MP_TENANT_ID) return process.env.MP_TENANT_ID;

  try {
    const databaseName = new URL(process.env.DATABASE_URL || "").pathname.replace(/^\//, "");
    return databaseName || "local";
  } catch {
    return "local";
  }
}
