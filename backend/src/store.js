import fs from "fs/promises";
import path from "path";
import { hashPassword } from "./security.js";
import { createSeedData } from "./seed.js";

function normalizeDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function normalizeTime(value) {
  return String(value).slice(0, 5);
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nome,
    matricula: row.matricula,
    curso: row.curso,
    role: row.role || row.perfil,
    passwordHash: row.passwordHash || row.senha_hash,
    ativo: row.ativo,
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
  };
}

function mapLab(row) {
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo,
    capacidade: row.capacidade,
    localizacao: row.localizacao,
    recursos: Array.isArray(row.recursos) ? row.recursos : JSON.parse(row.recursos || "[]"),
    ativo: row.ativo,
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
  };
}

function mapReservation(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId || row.usuario_id,
    labId: row.labId || row.laboratorio_id,
    data: normalizeDate(row.data),
    inicio: normalizeTime(row.inicio),
    termino: normalizeTime(row.termino),
    quantidadeAlunos: row.quantidadeAlunos || row.quantidade_alunos,
    status: row.status,
    observacao: row.observacao || "",
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
  };
}

function mapProblem(row) {
  if (!row) return null;
  return {
    id: row.id,
    labId: row.labId || row.laboratorio_id,
    userId: row.userId || row.usuario_id,
    tipo: row.tipo,
    descricao: row.descricao,
    status: row.status,
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
  };
}

function mapInventory(row) {
  if (!row) return null;
  return {
    id: row.id,
    labId: row.labId || row.laboratorio_id,
    item: row.item,
    disponivel: row.disponivel,
    indisponivel: row.indisponivel,
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
  };
}

class PostgresStore {
  constructor({ databaseUrl, dbSsl }) {
    this.databaseUrl = databaseUrl;
    this.dbSsl = dbSsl;
    this.pool = null;
  }

  async init() {
    const { Pool } = await import("pg");
    this.pool = new Pool({
      connectionString: this.databaseUrl,
      ssl: this.dbSsl ? { rejectUnauthorized: false } : false,
    });

    const schema = await fs.readFile(path.resolve(process.cwd(), "backend/schema.sql"), "utf8");
    await this.pool.query(schema);
    await this.seedIfEmpty();
  }

  async seedIfEmpty() {
    const { rows } = await this.pool.query("SELECT COUNT(*)::int AS count FROM usuarios");
    if (rows[0].count > 0) return;

    const seed = await createSeedData(hashPassword);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const user of seed.users) {
        await client.query(
          `INSERT INTO usuarios (id, nome, matricula, curso, perfil, senha_hash, ativo, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [user.id, user.nome, user.matricula, user.curso, user.role, user.passwordHash, user.ativo, user.createdAt, user.updatedAt],
        );
      }
      for (const lab of seed.labs) {
        await client.query(
          `INSERT INTO laboratorios (id, nome, tipo, capacidade, localizacao, recursos, ativo, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)`,
          [lab.id, lab.nome, lab.tipo, lab.capacidade, lab.localizacao, JSON.stringify(lab.recursos), lab.ativo, lab.createdAt, lab.updatedAt],
        );
      }
      for (const reservation of seed.reservations) {
        await client.query(
          `INSERT INTO reservas (id, usuario_id, laboratorio_id, data, inicio, termino, quantidade_alunos, status, observacao, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            reservation.id,
            reservation.userId,
            reservation.labId,
            reservation.data,
            reservation.inicio,
            reservation.termino,
            reservation.quantidadeAlunos,
            reservation.status,
            reservation.observacao,
            reservation.createdAt,
            reservation.updatedAt,
          ],
        );
      }
      for (const problem of seed.problems) {
        await client.query(
          `INSERT INTO problemas (id, laboratorio_id, usuario_id, tipo, descricao, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [problem.id, problem.labId, problem.userId, problem.tipo, problem.descricao, problem.status, problem.createdAt, problem.updatedAt],
        );
      }
      for (const item of seed.inventory) {
        await client.query(
          `INSERT INTO inventario (id, laboratorio_id, item, disponivel, indisponivel, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [item.id, item.labId, item.item, item.disponivel, item.indisponivel, item.createdAt, item.updatedAt],
        );
      }
      await client.query("SELECT setval(pg_get_serial_sequence('usuarios', 'id'), (SELECT MAX(id) FROM usuarios))");
      await client.query("SELECT setval(pg_get_serial_sequence('laboratorios', 'id'), (SELECT MAX(id) FROM laboratorios))");
      await client.query("SELECT setval(pg_get_serial_sequence('reservas', 'id'), (SELECT MAX(id) FROM reservas))");
      await client.query("SELECT setval(pg_get_serial_sequence('problemas', 'id'), (SELECT MAX(id) FROM problemas))");
      await client.query("SELECT setval(pg_get_serial_sequence('inventario', 'id'), (SELECT MAX(id) FROM inventario))");
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listUsers({ includeInactive = false } = {}) {
    const where = includeInactive ? "" : "WHERE ativo = TRUE";
    const { rows } = await this.pool.query(
      `SELECT id, nome, matricula, curso, perfil AS role, senha_hash AS "passwordHash", ativo,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM usuarios ${where} ORDER BY nome`,
    );
    return rows.map(mapUser);
  }

  async getUserById(id) {
    const { rows } = await this.pool.query(
      `SELECT id, nome, matricula, curso, perfil AS role, senha_hash AS "passwordHash", ativo,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM usuarios WHERE id = $1`,
      [id],
    );
    return mapUser(rows[0]);
  }

  async findUserByMatricula(matricula) {
    const { rows } = await this.pool.query(
      `SELECT id, nome, matricula, curso, perfil AS role, senha_hash AS "passwordHash", ativo,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM usuarios WHERE matricula = $1 AND ativo = TRUE`,
      [matricula],
    );
    return mapUser(rows[0]);
  }

  async createUser(input) {
    const { rows } = await this.pool.query(
      `INSERT INTO usuarios (nome, matricula, curso, perfil, senha_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nome, matricula, curso, perfil AS role, senha_hash AS "passwordHash", ativo,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [input.nome, input.matricula, input.curso, input.role, input.passwordHash],
    );
    return mapUser(rows[0]);
  }

  async updateUser(id, input) {
    const current = await this.getUserById(id);
    if (!current) return null;
    const next = { ...current, ...input };
    const { rows } = await this.pool.query(
      `UPDATE usuarios
       SET nome = $1, matricula = $2, curso = $3, perfil = $4, senha_hash = $5, ativo = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING id, nome, matricula, curso, perfil AS role, senha_hash AS "passwordHash", ativo,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [next.nome, next.matricula, next.curso, next.role, next.passwordHash, next.ativo, id],
    );
    return mapUser(rows[0]);
  }

  async deleteUser(id) {
    return this.updateUser(id, { ativo: false });
  }

  async listLabs({ includeInactive = false } = {}) {
    const where = includeInactive ? "" : "WHERE ativo = TRUE";
    const { rows } = await this.pool.query(
      `SELECT id, nome, tipo, capacidade, localizacao, recursos, ativo,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM laboratorios ${where} ORDER BY nome`,
    );
    return rows.map(mapLab);
  }

  async getLabById(id) {
    const { rows } = await this.pool.query(
      `SELECT id, nome, tipo, capacidade, localizacao, recursos, ativo,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM laboratorios WHERE id = $1`,
      [id],
    );
    return mapLab(rows[0]);
  }

  async createLab(input) {
    const { rows } = await this.pool.query(
      `INSERT INTO laboratorios (nome, tipo, capacidade, localizacao, recursos)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id, nome, tipo, capacidade, localizacao, recursos, ativo,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [input.nome, input.tipo, input.capacidade, input.localizacao, JSON.stringify(input.recursos || [])],
    );
    return mapLab(rows[0]);
  }

  async updateLab(id, input) {
    const current = await this.getLabById(id);
    if (!current) return null;
    const next = { ...current, ...input };
    const { rows } = await this.pool.query(
      `UPDATE laboratorios
       SET nome = $1, tipo = $2, capacidade = $3, localizacao = $4, recursos = $5::jsonb, ativo = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING id, nome, tipo, capacidade, localizacao, recursos, ativo,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [next.nome, next.tipo, next.capacidade, next.localizacao, JSON.stringify(next.recursos || []), next.ativo, id],
    );
    return mapLab(rows[0]);
  }

  async deleteLab(id) {
    return this.updateLab(id, { ativo: false });
  }

  async listReservations(filters = {}) {
    const clauses = [];
    const values = [];
    if (filters.userId) {
      values.push(filters.userId);
      clauses.push(`usuario_id = $${values.length}`);
    }
    if (filters.labId) {
      values.push(filters.labId);
      clauses.push(`laboratorio_id = $${values.length}`);
    }
    if (filters.data) {
      values.push(filters.data);
      clauses.push(`data = $${values.length}`);
    }
    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await this.pool.query(
      `SELECT id, usuario_id AS "userId", laboratorio_id AS "labId", data, inicio, termino,
              quantidade_alunos AS "quantidadeAlunos", status, observacao,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM reservas ${where} ORDER BY data, inicio`,
      values,
    );
    return rows.map(mapReservation);
  }

  async getReservationById(id) {
    const { rows } = await this.pool.query(
      `SELECT id, usuario_id AS "userId", laboratorio_id AS "labId", data, inicio, termino,
              quantidade_alunos AS "quantidadeAlunos", status, observacao,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM reservas WHERE id = $1`,
      [id],
    );
    return mapReservation(rows[0]);
  }

  async createReservation(input) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT pg_advisory_xact_lock($1::integer, hashtext($2::text))",
        [input.labId, input.data],
      );

      const { rowCount } = await client.query(
        `SELECT 1
         FROM reservas
         WHERE laboratorio_id = $1
           AND data = $2
           AND status IN ('pendente', 'aprovada')
           AND inicio < $4
           AND termino > $3
         LIMIT 1`,
        [input.labId, input.data, input.inicio, input.termino],
      );

      if (rowCount > 0) {
        const error = new Error("Já existe reserva para este laboratório no horário informado.");
        error.status = 409;
        throw error;
      }

      const { rows } = await client.query(
        `INSERT INTO reservas (usuario_id, laboratorio_id, data, inicio, termino, quantidade_alunos, status, observacao)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, usuario_id AS "userId", laboratorio_id AS "labId", data, inicio, termino,
                   quantidade_alunos AS "quantidadeAlunos", status, observacao,
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        [input.userId, input.labId, input.data, input.inicio, input.termino, input.quantidadeAlunos, input.status || "aprovada", input.observacao || ""],
      );
      await client.query("COMMIT");
      return mapReservation(rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateReservation(id, input) {
    const current = await this.getReservationById(id);
    if (!current) return null;
    const next = { ...current, ...input };
    const { rows } = await this.pool.query(
      `UPDATE reservas
       SET usuario_id = $1, laboratorio_id = $2, data = $3, inicio = $4, termino = $5,
           quantidade_alunos = $6, status = $7, observacao = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING id, usuario_id AS "userId", laboratorio_id AS "labId", data, inicio, termino,
                 quantidade_alunos AS "quantidadeAlunos", status, observacao,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [next.userId, next.labId, next.data, next.inicio, next.termino, next.quantidadeAlunos, next.status, next.observacao || "", id],
    );
    return mapReservation(rows[0]);
  }

  async listProblems(filters = {}) {
    const clauses = [];
    const values = [];
    if (filters.userId) {
      values.push(filters.userId);
      clauses.push(`usuario_id = $${values.length}`);
    }
    if (filters.labId) {
      values.push(filters.labId);
      clauses.push(`laboratorio_id = $${values.length}`);
    }
    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await this.pool.query(
      `SELECT id, laboratorio_id AS "labId", usuario_id AS "userId", tipo, descricao, status,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM problemas ${where} ORDER BY created_at DESC`,
      values,
    );
    return rows.map(mapProblem);
  }

  async getProblemById(id) {
    const { rows } = await this.pool.query(
      `SELECT id, laboratorio_id AS "labId", usuario_id AS "userId", tipo, descricao, status,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM problemas WHERE id = $1`,
      [id],
    );
    return mapProblem(rows[0]);
  }

  async createProblem(input) {
    const { rows } = await this.pool.query(
      `INSERT INTO problemas (laboratorio_id, usuario_id, tipo, descricao, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, laboratorio_id AS "labId", usuario_id AS "userId", tipo, descricao, status,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [input.labId, input.userId, input.tipo, input.descricao, input.status || "aberto"],
    );
    return mapProblem(rows[0]);
  }

  async updateProblem(id, input) {
    const current = await this.getProblemById(id);
    if (!current) return null;
    const next = { ...current, ...input };
    const { rows } = await this.pool.query(
      `UPDATE problemas
       SET laboratorio_id = $1, usuario_id = $2, tipo = $3, descricao = $4, status = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING id, laboratorio_id AS "labId", usuario_id AS "userId", tipo, descricao, status,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [next.labId, next.userId, next.tipo, next.descricao, next.status, id],
    );
    return mapProblem(rows[0]);
  }

  async deleteProblem(id) {
    const { rowCount } = await this.pool.query("DELETE FROM problemas WHERE id = $1", [id]);
    return rowCount > 0;
  }

  async listInventory(filters = {}) {
    const values = [];
    const where = filters.labId ? "WHERE laboratorio_id = $1" : "";
    if (filters.labId) values.push(filters.labId);
    const { rows } = await this.pool.query(
      `SELECT id, laboratorio_id AS "labId", item, disponivel, indisponivel,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM inventario ${where} ORDER BY laboratorio_id, item`,
      values,
    );
    return rows.map(mapInventory);
  }

  async createAccess(input) {
    const { rows } = await this.pool.query(
      `INSERT INTO acessos (laboratorio_id, usuario_id, tipo)
       VALUES ($1, $2, $3)
       RETURNING id, laboratorio_id AS "labId", usuario_id AS "userId", tipo, created_at AS "createdAt"`,
      [input.labId, input.userId, input.tipo],
    );
    return rows[0];
  }
}

export async function createStore(config) {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL é obrigatória. A aplicação persiste dados exclusivamente em PostgreSQL.");
  }

  const store = new PostgresStore(config);
  await store.init();
  return store;
}
