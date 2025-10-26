const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { getDatabase } = require("../../lib/db");
const {
  createResponse,
  createErrorResponse,
  handleCors,
  JWT_SECRET,
} = require("../../lib/utils");

module.exports = async (req, res) => {
  // Manejar CORS
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return res.status(corsResponse.statusCode).json(corsResponse);
  }

  if (req.method !== "POST") {
    return res.status(405).json(createErrorResponse(405, "Method not allowed"));
  }

  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res
        .status(400)
        .json(
          createErrorResponse(400, "Email, password and name are required")
        );
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json(createErrorResponse(400, "Invalid email format"));
    }

    // Validar contraseña
    if (password.length < 6) {
      return res
        .status(400)
        .json(
          createErrorResponse(400, "Password must be at least 6 characters")
        );
    }

    const db = getDatabase();

    // Verificar si el usuario ya existe
    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);
    if (existingUser) {
      return res
        .status(409)
        .json(createErrorResponse(409, "User already exists"));
    }

    // Hash de la contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear usuario
    const userId = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO users (id, email, password, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    stmt.run(userId, email, hashedPassword, name, now, now);

    // Crear token
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" });

    const response = createResponse(
      201,
      {
        token,
        user: {
          id: userId,
          email,
          name,
        },
      },
      "User created successfully"
    );

    res.status(201).json(response);
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json(createErrorResponse(500, "Internal server error"));
  }
};
