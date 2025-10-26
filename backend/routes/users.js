const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const { getDatabase } = require("../database/init");

const router = express.Router();

// Middleware de validación
const validateUser = [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("name").trim().isLength({ min: 2 }),
];

const validateLogin = [
  body("email").isEmail().normalizeEmail(),
  body("password").exists(),
];

// Registro de usuario
router.post("/register", validateUser, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Datos inválidos",
        details: errors.array(),
      });
    }

    const { email, password, name } = req.body;
    const db = getDatabase();

    // Verificar si el usuario ya existe
    const existingUser = await new Promise((resolve, reject) => {
      db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      return res.status(409).json({ error: "El email ya está registrado" });
    }

    // Hash de la contraseña
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Crear usuario
    const userId = await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)",
        [email, passwordHash, name],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Generar JWT
    const token = jwt.sign({ userId, email, name }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      message: "Usuario creado exitosamente",
      user: { id: userId, email, name },
      token,
    });
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Login de usuario
router.post("/login", validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Datos inválidos",
        details: errors.array(),
      });
    }

    const { email, password } = req.body;
    const db = getDatabase();

    // Buscar usuario
    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, email, name, password_hash FROM users WHERE email = ?",
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Actualizar last_sync
    db.run("UPDATE users SET last_sync = CURRENT_TIMESTAMP WHERE id = ?", [
      user.id,
    ]);

    // Generar JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login exitoso",
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Verificar token
router.get("/verify", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Token requerido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({
      valid: true,
      user: {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name,
      },
    });
  } catch (error) {
    res.status(401).json({ error: "Token inválido" });
  }
});

// Obtener perfil del usuario
router.get("/profile", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Token requerido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDatabase();

    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, email, name, created_at, last_sync FROM users WHERE id = ?",
        [decoded.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error obteniendo perfil:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
