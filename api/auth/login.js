const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getInMemoryDatabase } = require("../../lib/memoryDb");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

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
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;
    console.log("[AUTH LOGIN] Processing login for email:", email);

    if (!email || !password) {
      console.warn("[AUTH LOGIN] Validation failed: Missing email or password");
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    console.log("[AUTH LOGIN] Getting database connection...");
    const db = getInMemoryDatabase();

    // Buscar usuario
    console.log("[AUTH LOGIN] Looking up user by email...");
    const user = db.getUserByEmail(email);

    if (!user) {
      console.warn("[AUTH LOGIN] User not found:", email);
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }
    console.log("[AUTH LOGIN] User found, verifying password...");

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.warn("[AUTH LOGIN] Invalid password for user:", email);
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }
    console.log("[AUTH LOGIN] Password verified successfully");

    // Crear token
    console.log("[AUTH LOGIN] Generating JWT token...");
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    console.log("[AUTH LOGIN] JWT token generated successfully");

    const responseData = {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      message: "Login successful",
    };

    console.log("[AUTH LOGIN] Login completed successfully for user:", user.id);
    res.status(200).json(responseData);
  } catch (error) {
    console.error("[AUTH LOGIN ERROR] Login failed:", error.message);
    console.error("[AUTH LOGIN ERROR] Stack trace:", error.stack);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
