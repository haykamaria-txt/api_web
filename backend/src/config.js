import dotenv from "dotenv";

dotenv.config();

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} é obrigatória. Configure ${name} no ambiente antes de iniciar a aplicação.`);
  }
  return value;
}

function requireStrongJwtSecret() {
  const secret = requireEnv("JWT_SECRET");
  const normalized = secret.toLowerCase();
  const unsafeFragments = [
    "123456",
    "012345",
    "abcdef",
    "qwerty",
    "letmein",
    "password",
    "senha",
    "secret",
    "segredo",
    "change-me",
    "changeme",
    "altere",
    "avaliacao",
    "development",
    "desenvolvimento",
    "local",
    "demo",
    "example",
    "exemplo",
  ];
  const hasRepeatedPattern = Array.from(
    { length: Math.floor(secret.length / 2) },
    (_, index) => index + 1,
  ).some((patternLength) => (
    secret.length % patternLength === 0
      && secret.slice(0, patternLength).repeat(secret.length / patternLength) === secret
  ));

  if (secret.length < 32) {
    throw new Error("JWT_SECRET é fraca. Use pelo menos 32 caracteres aleatórios.");
  }

  if (hasRepeatedPattern || unsafeFragments.some((fragment) => normalized.includes(fragment))) {
    throw new Error("JWT_SECRET é previsível. Gere um segredo aleatório exclusivo para este ambiente.");
  }

  return secret;
}

const jwtSecret = requireStrongJwtSecret();
const databaseUrl = requireEnv("DATABASE_URL");

if (!/^postgres(ql)?:\/\//i.test(databaseUrl)) {
  throw new Error("DATABASE_URL deve apontar para um banco PostgreSQL usando postgres:// ou postgresql://.");
}

export const config = {
  port: Number(process.env.PORT || 3000),
  jwtSecret,
  databaseUrl,
  dbSsl: process.env.DB_SSL === "true",
};
