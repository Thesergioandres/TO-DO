const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
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

module.exports = async (req, res) => {
  console.log("[AUTH LOGIN] Request received:", req.method);
  console.log("[AUTH LOGIN] Headers:", JSON.stringify(req.headers, null, 2));
  console.log(
    "[AUTH LOGIN] Body:",
    JSON.stringify({ email: req.body?.email, password: "[HIDDEN]" }, null, 2)
  );

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
    console.log("[AUTH LOGIN] CORS preflight request handled");
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    console.warn("[AUTH LOGIN] Method not allowed:", req.method);
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
    checkRateLimit(clientIP, 20, 15 * 60 * 1000); // 20 intentos por 15 minutos

    const { email, password } = req.body;
    console.log("[AUTH LOGIN] Processing login for email:", email);

    // Validar campos requeridos
    validateRequiredFields(req.body, ["email", "password"]);

    // Validar formato de email
    validateEmail(email);

    console.log("[AUTH LOGIN] Getting database connection...");
    const db = getInMemoryDatabase();

    // Buscar usuario
    console.log("[AUTH LOGIN] Looking up user by email...");
    const user = db.getUserByEmail(email);

    if (!user) {
      console.warn("[AUTH LOGIN] User not found:", email);
      return sendResponse(
        res,
        createErrorResponse("Invalid email or password", 401)
      );
    }
    console.log("[AUTH LOGIN] User found, verifying password...");

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.warn("[AUTH LOGIN] Invalid password for user:", email);
      return sendResponse(
        res,
        createErrorResponse("Invalid email or password", 401)
      );
    }
    console.log("[AUTH LOGIN] Password verified successfully");

    // Crear token
    console.log("[AUTH LOGIN] Generating JWT token...");
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
      issuer: "todo-app",
      audience: "todo-app-users",
    });
    console.log("[AUTH LOGIN] JWT token generated successfully");

    const responseData = {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    };

    console.log("[AUTH LOGIN] Login completed successfully for user:", user.id);
    return sendResponse(
      res,
      createSuccessResponse(responseData, "Login successful")
    );
  } catch (error) {
    console.error("[AUTH LOGIN ERROR] Login failed:", error.message);
    console.error("[AUTH LOGIN ERROR] Stack trace:", error.stack);
    return handleApiError(error, req, res);
  }
};
