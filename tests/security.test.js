import { afterEach, describe, expect, it, vi } from "vitest";
import { createToken, hashPassword, verifyPassword, verifyToken } from "../backend/src/security.js";

const secret = "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres";

afterEach(() => {
  vi.useRealTimers();
});

describe("segurança e autenticação", () => {
  it("cria e valida um token com o payload esperado", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-24T12:00:00Z"));

    const token = createToken({ sub: 42, role: "professor" }, secret, 3600);
    const payload = verifyToken(token, secret);

    expect(payload).toMatchObject({ sub: 42, role: "professor" });
    expect(payload.exp - payload.iat).toBe(3600);
  });

  it("rejeita token adulterado ou assinado com outro segredo", () => {
    const token = createToken({ sub: 1 }, secret);
    const [header, body, signature] = token.split(".");
    const alteredSignature = `${signature[0] === "a" ? "b" : "a"}${signature.slice(1)}`;
    const adulteratedToken = `${header}.${body}.${alteredSignature}`;

    expect(verifyToken(adulteratedToken, secret)).toBeNull();
    expect(verifyToken(token, `${secret}-diferente`)).toBeNull();
  });

  it("rejeita token expirado", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-24T12:00:00Z"));
    const token = createToken({ sub: 1 }, secret, 60);

    vi.advanceTimersByTime(61_000);

    expect(verifyToken(token, secret)).toBeNull();
  });

  it("gera hash com salt e valida somente a senha correta", async () => {
    const firstHash = await hashPassword("senha-forte");
    const secondHash = await hashPassword("senha-forte");

    expect(firstHash).toMatch(/^\$2[aby]\$12\$/);
    expect(firstHash).not.toBe(secondHash);
    await expect(verifyPassword("senha-forte", firstHash)).resolves.toBe(true);
    await expect(verifyPassword("senha-incorreta", firstHash)).resolves.toBe(false);
  });

  it("rejeita hashes inválidos ou do formato antigo", async () => {
    await expect(verifyPassword("senha-forte", "hash-invalido")).resolves.toBe(false);
    await expect(verifyPassword("senha-forte", "scrypt$salt$hash-antigo")).resolves.toBe(false);
  });
});
