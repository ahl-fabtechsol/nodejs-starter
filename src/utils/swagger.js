import swaggerAutogen from "swagger-autogen";
import swaggerUi from "swagger-ui-express";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerDoc = {
  info: {
    title: "My API",
    description: "Auto-generated API documentation",
    version: "1.0.0",
  },
  host: "localhost:5000",
  schemes: ["http"],
};

const outputFile = path.resolve(__dirname, "../swagger-output.json");
const routes = [path.resolve(__dirname, "../routes/*.js")];

const generateDocs = async () => {
  await swaggerAutogen()(outputFile, routes);
  console.log("✅ Swagger JSON generated!");
};

const setupSwagger = (app) => {
  if (fs.existsSync(outputFile)) {
    const swaggerFile = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));
    console.log(" Swagger UI available at http://localhost:5000/api-docs");
  } else {
    console.error(` Swagger file not found at ${outputFile}`);
  }
};

export { generateDocs, setupSwagger };
