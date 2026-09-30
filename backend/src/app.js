import cors from "cors";
import express from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { openapiSpec } from "./openapi.js";
import AcessoController from "./controllers/AcessoController.js";
import AutenticacaoController from "./controllers/AutenticacaoController.js";
import DashboardController from "./controllers/DashboardController.js";
import InventarioController from "./controllers/InventarioController.js";
import LaboratorioController from "./controllers/LaboratorioController.js";
import ProblemaController from "./controllers/ProblemaController.js";
import ReservaController from "./controllers/ReservaController.js";
import SistemaController from "./controllers/SistemaController.js";
import UsuarioController from "./controllers/UsuarioController.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import acessoRoutes from "./routes/acessoRoutes.js";
import autenticacaoRoutes from "./routes/autenticacaoRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import inventarioRoutes from "./routes/inventarioRoutes.js";
import laboratorioRoutes from "./routes/laboratorioRoutes.js";
import problemaRoutes from "./routes/problemaRoutes.js";
import relatorioRoutes from "./routes/relatorioRoutes.js";
import reservaRoutes from "./routes/reservaRoutes.js";
import sistemaRoutes from "./routes/sistemaRoutes.js";
import usuarioRoutes from "./routes/usuarioRoutes.js";
import { createServices } from "./services/index.js";

const currentFile = fileURLToPath(import.meta.url);
const frontendPath = path.resolve(path.dirname(currentFile), "../../atividade");

export async function createApp() {
  const services = await createServices(config);
  const middleware = createAuthMiddleware(services, config.jwtSecret);
  const app = express();
  const controllers = {
    acessos: new AcessoController(services),
    autenticacao: new AutenticacaoController(services),
    dashboard: new DashboardController(services),
    inventario: new InventarioController(services),
    laboratorios: new LaboratorioController(services),
    problemas: new ProblemaController(services),
    reservas: new ReservaController(services),
    sistema: new SistemaController(),
    usuarios: new UsuarioController(services),
  };

  app.use(cors());
  app.use(express.json());
  app.get("/api-docs.json", (req, res) => res.json(openapiSpec));
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, {
      customSiteTitle: "Documentação da API de Laboratórios",
      swaggerOptions: { persistAuthorization: true },
    }),
  );

  app.use("/api", sistemaRoutes(controllers.sistema));
  app.use("/autenticacao", autenticacaoRoutes(controllers.autenticacao, middleware));
  app.use("/usuarios", usuarioRoutes(controllers.usuarios, middleware));
  app.use("/labs", laboratorioRoutes(controllers.laboratorios, middleware));
  app.use(reservaRoutes(controllers.reservas, middleware));
  app.use("/problemas", problemaRoutes(controllers.problemas, middleware));
  app.use("/relatorios", relatorioRoutes(controllers.reservas, controllers.problemas, middleware));
  app.use("/dashboard", dashboardRoutes(controllers.dashboard, middleware));
  app.use("/inventario", inventarioRoutes(controllers.inventario, middleware));
  app.use("/acessos", acessoRoutes(controllers.acessos, middleware));
  app.use(express.static(frontendPath));

  app.use((req, res) => {
    res.status(404).json({ erro: "Rota não encontrada." });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    const status = error.status || 500;
    res.status(status).json({
      erro: status === 500 ? "Erro interno do servidor." : error.message,
      detalhe: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  });

  return app;
}
