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
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json(createErrorResponse(400, "Email and password are required"));
    }

    const db = getDatabase();

    // Buscar usuario
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (!user) {
      return res
        .status(401)
        .json(createErrorResponse(401, "Invalid credentials"));
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res
        .status(401)
        .json(createErrorResponse(401, "Invalid credentials"));
    }

    // Crear token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const response = createResponse(
      200,
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      "Login successful"
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json(createErrorResponse(500, "Internal server error"));
  }
};
