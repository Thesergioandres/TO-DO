const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Token de acceso requerido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Error verificando token:", error);
    return res.status(403).json({ error: "Token inválido o expirado" });
  }
};

const validateTodoData = (req, res, next) => {
  const { title } = req.body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ error: "El título es requerido" });
  }

  if (title.length > 255) {
    return res
      .status(400)
      .json({ error: "El título es demasiado largo (máximo 255 caracteres)" });
  }

  // Validar prioridad si se proporciona
  if (
    req.body.priority &&
    !["low", "medium", "high", "urgent"].includes(req.body.priority)
  ) {
    return res.status(400).json({ error: "Prioridad inválida" });
  }

  // Validar categoría si se proporciona
  if (req.body.category && typeof req.body.category !== "string") {
    return res.status(400).json({ error: "Categoría inválida" });
  }

  // Validar fecha de vencimiento si se proporciona
  if (req.body.due_date) {
    const dueDate = new Date(req.body.due_date);
    if (isNaN(dueDate.getTime())) {
      return res.status(400).json({ error: "Fecha de vencimiento inválida" });
    }
  }

  // Validar tags si se proporcionan
  if (req.body.tags && !Array.isArray(req.body.tags)) {
    return res.status(400).json({ error: "Las etiquetas deben ser un array" });
  }

  next();
};

const validateUserData = (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username || typeof username !== "string" || username.trim().length < 3) {
    return res
      .status(400)
      .json({ error: "El nombre de usuario debe tener al menos 3 caracteres" });
  }

  if (!email || typeof email !== "string" || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: "Email inválido" });
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return res
      .status(400)
      .json({ error: "La contraseña debe tener al menos 6 caracteres" });
  }

  next();
};

const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  if (err.name === "ValidationError") {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Token inválido" });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expirado" });
  }

  // Error de SQLite
  if (err.code === "SQLITE_CONSTRAINT") {
    if (err.message.includes("UNIQUE")) {
      return res
        .status(409)
        .json({ error: "Ya existe un recurso con esos datos" });
    }
  }

  res.status(500).json({ error: "Error interno del servidor" });
};

module.exports = {
  authenticateToken,
  validateTodoData,
  validateUserData,
  errorHandler,
};
