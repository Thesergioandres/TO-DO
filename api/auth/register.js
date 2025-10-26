const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { getInMemoryDatabase } = require("../../lib/memoryDb");
const {
  createSuccessResponse,
  createErrorResponse,
  sendResponse,
  handleApiError,
  validateRequiredFields,
  validateEmail,
  checkRateLimit,
} = require("../../lib/apiHelpers");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// Validador de contraseña segura
function validatePassword(password) {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    throw new Error(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    );
  }
}

module.exports = async (req, res) => {
  console.log("[AUTH REGISTER] Request received:", req.method);
  console.log("[AUTH REGISTER] Headers:", JSON.stringify(req.headers, null, 2));
  console.log("[AUTH REGISTER] Body:", JSON.stringify(req.body, null, 2));

  // Configurar headers CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    console.log("[AUTH REGISTER] CORS preflight request handled");
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    console.warn("[AUTH REGISTER] Method not allowed:", req.method);
    return sendResponse(
      res,
      createErrorResponse(`Method ${req.method} not allowed. Use POST.`, 405)
    );
  }

  try {
    // Rate limiting
    const clientIP =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";
    checkRateLimit(clientIP, 10, 15 * 60 * 1000); // 10 registros por 15 minutos

    const { email, password, name } = req.body;
    console.log("[AUTH REGISTER] Processing registration for email:", email);

    // Validar campos requeridos
    validateRequiredFields(req.body, ["email", "password", "name"]);

    // Validar formato de email
    validateEmail(email);

    // Validar contraseña segura
    validatePassword(password);

    // Validar longitud del nombre
    if (name.trim().length < 2) {
      throw new Error("Name must be at least 2 characters long");
    }

    console.log("[AUTH REGISTER] Getting database connection...");
    const db = getInMemoryDatabase();

    // Verificar si el usuario ya existe
    console.log("[AUTH REGISTER] Checking if user exists...");
    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      console.warn("[AUTH REGISTER] User already exists:", email);
      return sendResponse(
        res,
        createErrorResponse("User with this email already exists", 409)
      );
    }

    // Hash de la contraseña
    console.log("[AUTH REGISTER] Hashing password...");
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log("[AUTH REGISTER] Password hashed successfully");

    // Crear usuario
    const userId = uuidv4();
    const now = new Date().toISOString();
    const userData = {
      id: userId,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim(),
      created_at: now,
      updated_at: now,
    };
    console.log("[AUTH REGISTER] Creating user with ID:", userId);

    db.createUser(userData);
    console.log("[AUTH REGISTER] User created successfully");

    // Crear token
    console.log("[AUTH REGISTER] Generating JWT token...");
    const token = jwt.sign({ userId, email: userData.email }, JWT_SECRET, {
      expiresIn: "7d",
      issuer: "todo-app",
      audience: "todo-app-users",
    });
    console.log("[AUTH REGISTER] JWT token generated successfully");

    const responseData = {
      token,
      user: {
        id: userId,
        email: userData.email,
        name: userData.name,
        createdAt: userData.created_at,
      },
    };

    console.log(
      "[AUTH REGISTER] Registration completed successfully for user:",
      userId
    );
    return sendResponse(
      res,
      createSuccessResponse(responseData, "User registered successfully", 201)
    );
  } catch (error) {
    console.error("[AUTH REGISTER ERROR] Registration failed:", error.message);
    console.error("[AUTH REGISTER ERROR] Stack trace:", error.stack);
    return handleApiError(error, req, res);
  }
};
