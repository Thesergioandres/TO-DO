const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const todoRoutes = require("./routes/todos");
const userRoutes = require("./routes/users");
const syncRoutes = require("./routes/sync");
const { initDatabase } = require("./database/init");

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración para Railway
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = [
  "http://localhost:3000",
  "https://localhost:3000",
  process.env.FRONTEND_URL,
  process.env.RAILWAY_PUBLIC_DOMAIN &&
    `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`,
].filter(Boolean);

// Middlewares de seguridad
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // límite por IP
  message: {
    error: "Demasiadas peticiones, intenta de nuevo más tarde.",
  },
});
app.use("/api/", limiter);

// Middlewares de parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Middleware para logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas
app.use("/api/todos", todoRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sync", syncRoutes);

// Ruta de salud
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Error interno del servidor"
        : err.message,
    timestamp: new Date().toISOString(),
  });
});

// Middleware para rutas no encontradas
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.originalUrl,
  });
});

// Inicializar base de datos y servidor
async function startServer() {
  try {
    await initDatabase();
    console.log("✅ Base de datos inicializada");

    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
}

// Manejo de cierre graceful
process.on("SIGTERM", () => {
  console.log("👋 Cerrando servidor...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("👋 Cerrando servidor...");
  process.exit(0);
});

startServer();
