import { createToken, hashPassword, verifyPassword } from "../security.js";
import ServiceError from "./ServiceError.js";

function requireField(value, message) {
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new ServiceError(400, message);
  }
}

function normalizeRole(value) {
  return value === "admin" ? "admin" : "professor";
}

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export default class UsuarioService {
  constructor(usuarioRepository, jwtSecret) {
    this.usuarios = usuarioRepository;
    this.jwtSecret = jwtSecret;
  }

  getById(id) {
    return this.usuarios.findById(id);
  }

  list() {
    return this.usuarios.findAll();
  }

  async register(body, authenticatedUser) {
    const { nome, matricula, senha } = body;
    const role = normalizeRole(body.role || body.perfil);
    requireField(nome, "Nome é obrigatório.");
    requireField(matricula, "Matrícula é obrigatória.");
    requireField(senha, "Senha é obrigatória.");

    if (role === "admin" && authenticatedUser?.role !== "admin") {
      throw new ServiceError(403, "Apenas administradores podem cadastrar outro administrador.");
    }
    if (await this.usuarios.findByMatricula(String(matricula).trim())) {
      throw new ServiceError(409, "Matrícula já cadastrada.");
    }

    return this.usuarios.create({
      nome: String(nome).trim(),
      matricula: String(matricula).trim(),
      curso: String(body.curso || "Geral").trim(),
      role,
      passwordHash: await hashPassword(String(senha)),
    });
  }

  async login(body) {
    const { matricula, senha } = body;
    requireField(matricula, "Matrícula é obrigatória.");
    requireField(senha, "Senha é obrigatória.");
    const user = await this.usuarios.findByMatricula(String(matricula).trim());
    if (!user || !(await verifyPassword(String(senha), user.passwordHash))) {
      throw new ServiceError(401, "Matrícula ou senha inválidos.");
    }
    return {
      token: createToken({ sub: user.id, role: user.role }, this.jwtSecret),
      usuario: publicUser(user),
    };
  }

  async updateProfile(user, body) {
    return this.usuarios.update(user.id, {
      nome: body.nome ?? user.nome,
      matricula: user.matricula,
      curso: body.curso ?? user.curso,
      role: user.role,
      passwordHash: body.senha ? await hashPassword(String(body.senha)) : user.passwordHash,
      ativo: user.ativo,
    });
  }

  async findForUser(id, requester) {
    if (requester.role !== "admin" && Number(requester.id) !== Number(id)) {
      throw new ServiceError(403, "Usuário sem permissão para acessar este cadastro.");
    }
    const user = await this.usuarios.findById(id);
    if (!user) throw new ServiceError(404, "Usuário não encontrado.");
    return user;
  }

  async updateForUser(id, body, requester) {
    if (requester.role !== "admin" && Number(requester.id) !== Number(id)) {
      throw new ServiceError(403, "Usuário sem permissão para atualizar este cadastro.");
    }
    const current = await this.usuarios.findById(id);
    if (!current) throw new ServiceError(404, "Usuário não encontrado.");
    const updated = await this.usuarios.update(id, {
      nome: body.nome ?? current.nome,
      matricula:
        requester.role === "admin" ? (body.matricula ?? current.matricula) : current.matricula,
      curso: body.curso ?? current.curso,
      role:
        requester.role === "admin"
          ? normalizeRole(body.role || body.perfil || current.role)
          : current.role,
      passwordHash: body.senha ? await hashPassword(String(body.senha)) : current.passwordHash,
      ativo: current.ativo,
    });
    if (!updated) throw new ServiceError(404, "Usuário não encontrado.");
    return updated;
  }

  async delete(id) {
    const user = await this.usuarios.delete(id);
    if (!user) throw new ServiceError(404, "Usuário não encontrado.");
    return user;
  }
}
