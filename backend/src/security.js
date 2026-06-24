import bcrypt from "bcrypt";
import crypto from "crypto";

const BCRYPT_SALT_ROUNDS = 12;

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function createToken(payload, secret, expiresInSeconds = 60 * 60 * 8) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedBody = base64Url(JSON.stringify(body));
  const signature = sign(`${encodedHeader}.${encodedBody}`, secret);

  return `${encodedHeader}.${encodedBody}.${signature}`;
}

export function verifyToken(token, secret) {
  try {
    const parts = token?.split(".");
    if (!parts || parts.length !== 3) return null;

    const [encodedHeader, encodedBody, signature] = parts;
    const header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8"));
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;

    const expectedSignature = sign(`${encodedHeader}.${encodedBody}`, secret);
    const signatureBuffer = Buffer.from(signature, "base64url");
    const expectedBuffer = Buffer.from(expectedSignature, "base64url");
    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encodedBody, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)) return null;
    if (payload.exp <= now || payload.iat > now || payload.exp <= payload.iat) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== "string" || !storedHash.startsWith("$2")) return false;

  try {
    return await bcrypt.compare(password, storedHash);
  } catch {
    return false;
  }
}
