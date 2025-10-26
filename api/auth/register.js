const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { getInMemoryDatabase } = require("../../lib/memoryDb");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
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
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  try {
    const { email, password, name } = req.body;
    console.log("[AUTH REGISTER] Processing registration for email:", email);

    if (!email || !password || !name) {
      console.warn(
        "[AUTH REGISTER] Validation failed: Missing required fields"
      );
      return res.status(400).json({
        success: false,
        message: "Email, password and name are required",
      });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.warn("[AUTH REGISTER] Validation failed: Invalid email format");
      return res
        .status(400)
        .json({ success: false, message: "Invalid email format" });
    }

    // Validar contraseña
    if (password.length < 6) {
      console.warn("[AUTH REGISTER] Validation failed: Password too short");
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    console.log("[AUTH REGISTER] Getting database connection...");
    const db = getInMemoryDatabase();

    // Verificar si el usuario ya existe
    console.log("[AUTH REGISTER] Checking if user exists...");
    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      console.warn("[AUTH REGISTER] User already exists:", email);
      return res
        .status(409)
        .json({ success: false, message: "User already exists" });
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
      email,
      password: hashedPassword,
      name,
      created_at: now,
      updated_at: now,
    };
    console.log("[AUTH REGISTER] Creating user with ID:", userId);

    db.createUser(userData);
    console.log("[AUTH REGISTER] User created successfully");

    // Crear token
    console.log("[AUTH REGISTER] Generating JWT token...");
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "7d" });
    console.log("[AUTH REGISTER] JWT token generated successfully");

    const responseData = {
      success: true,
      data: {
        token,
        user: {
          id: userId,
          email,
          name,
        },
      },
      message: "User created successfully",
    };

    console.log(
      "[AUTH REGISTER] Registration completed successfully for user:",
      userId
    );
    res.status(201).json(responseData);
  } catch (error) {
    console.error("[AUTH REGISTER ERROR] Registration failed:", error.message);
    console.error("[AUTH REGISTER ERROR] Stack trace:", error.stack);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
