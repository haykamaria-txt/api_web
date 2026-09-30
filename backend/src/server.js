import { config } from "./config.js";
import { createApp } from "./app.js";

const app = await createApp();

app.listen(config.port, () => {
  console.log(`Servidor rodando em http://localhost:${config.port}`);
});
