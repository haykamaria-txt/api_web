import sequelize from "../config/database.js";
import "../models/index.js";
import AcessoRepository from "../repositories/AcessoRepository.js";
import InventarioRepository from "../repositories/InventarioRepository.js";
import LaboratorioRepository from "../repositories/LaboratorioRepository.js";
import ProblemaRepository from "../repositories/ProblemaRepository.js";
import ReservaRepository from "../repositories/ReservaRepository.js";
import UsuarioRepository from "../repositories/UsuarioRepository.js";
import AcessoService from "./AcessoService.js";
import DashboardService from "./DashboardService.js";
import InventarioService from "./InventarioService.js";
import LaboratorioService from "./LaboratorioService.js";
import ProblemaService from "./ProblemaService.js";
import PermissaoService from "./PermissaoService.js";
import ReservaService from "./ReservaService.js";
import SeedService from "./SeedService.js";
import UsuarioService from "./UsuarioService.js";

export async function createServices(config) {
  if (!config.databaseUrl) {
    throw new Error(
      "DATABASE_URL é obrigatória. A aplicação persiste dados exclusivamente em PostgreSQL.",
    );
  }

  await sequelize.authenticate();
  await sequelize.sync();

  const repositories = {
    usuarios: new UsuarioRepository(),
    laboratorios: new LaboratorioRepository(),
    reservas: new ReservaRepository(),
    problemas: new ProblemaRepository(),
    inventario: new InventarioRepository(),
    acessos: new AcessoRepository(),
  };
  await new SeedService(repositories).seedIfEmpty();

  const laboratorios = new LaboratorioService(repositories.laboratorios);
  const reservas = new ReservaService(
    repositories.reservas,
    repositories.laboratorios,
    repositories.usuarios,
  );
  const problemas = new ProblemaService(
    repositories.problemas,
    repositories.usuarios,
    laboratorios,
  );
  const usuarios = new UsuarioService(repositories.usuarios, config.jwtSecret);
  const inventario = new InventarioService(repositories.inventario, repositories.laboratorios);
  const acessos = new AcessoService(repositories.acessos, laboratorios);
  const dashboard = new DashboardService(
    repositories.usuarios,
    repositories.reservas,
    repositories.problemas,
    repositories.inventario,
  );
  const permissoes = new PermissaoService();

  return {
    acessos,
    dashboard,
    inventario,
    laboratorios,
    permissoes,
    problemas,
    reservas,
    usuarios,
  };
}
