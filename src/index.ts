import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import routes from "./api/routes/index.js";
import { errorHandler } from "./api/middleware/errorHandler.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, "../../dist/public");

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(routes);
app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`A platform API listening on http://localhost:${env.PORT}`);
});
