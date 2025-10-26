const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Configuración de base de datos para Vercel
let db = null;

function getDatabase() {
  if (db) return db;

  try {
    // En Vercel, usamos /tmp para archivos temporales
    const dbPath = process.env.VERCEL
      ? "/tmp/todos.db"
      : path.join(__dirname, "..", "data", "todos.db");

    // Crear directorio si no existe
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(dbPath);

    // Inicializar tablas
    initializeTables(db);

    return db;
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

function initializeTables(database) {
  // Crear tabla de usuarios
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Crear tabla de todos
  database.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      completed INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'medium',
      category TEXT DEFAULT 'personal',
      tags TEXT,
      due_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  console.log("Database tables initialized successfully");
}

module.exports = {
  getDatabase,
};
