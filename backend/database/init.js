const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const DB_PATH = process.env.DB_PATH || "./database/todos.db";

// Asegurar que el directorio existe
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, err => {
      if (err) {
        console.error("Error conectando a la base de datos:", err);
        throw err;
      }
      console.log("📦 Conectado a SQLite");
    });

    // Configurar WAL mode para mejor concurrencia
    db.run("PRAGMA journal_mode = WAL");
    db.run("PRAGMA synchronous = NORMAL");
    db.run("PRAGMA foreign_keys = ON");
  }
  return db;
}

async function initDatabase() {
  const database = getDatabase();

  return new Promise((resolve, reject) => {
    database.serialize(() => {
      // Tabla de usuarios
      database.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_sync DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de todos
      database.run(`
        CREATE TABLE IF NOT EXISTS todos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          client_id TEXT,
          title TEXT NOT NULL,
          description TEXT,
          completed BOOLEAN NOT NULL DEFAULT 0,
          priority TEXT NOT NULL DEFAULT 'medium',
          category TEXT NOT NULL DEFAULT 'personal',
          due_date DATETIME,
          tags TEXT DEFAULT '[]',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME NULL,
          version INTEGER DEFAULT 1,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Tabla de sincronización para conflictos
      database.run(`
        CREATE TABLE IF NOT EXISTS sync_conflicts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          todo_id INTEGER NOT NULL,
          client_data TEXT NOT NULL,
          server_data TEXT NOT NULL,
          conflict_type TEXT NOT NULL,
          resolved BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Índices para optimización
      database.run(
        `CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos (user_id)`
      );
      database.run(
        `CREATE INDEX IF NOT EXISTS idx_todos_updated_at ON todos (updated_at)`
      );
      database.run(
        `CREATE INDEX IF NOT EXISTS idx_todos_client_id ON todos (client_id)`
      );
      database.run(
        `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`
      );

      // Triggers para updated_at automático
      database.run(`
        CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
        AFTER UPDATE ON users 
        BEGIN 
          UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
        END
      `);

      database.run(
        `
        CREATE TRIGGER IF NOT EXISTS update_todos_updated_at 
        AFTER UPDATE ON todos 
        BEGIN 
          UPDATE todos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
        END
      `,
        err => {
          if (err) {
            reject(err);
          } else {
            console.log("✅ Tablas de base de datos creadas");
            resolve();
          }
        }
      );
    });
  });
}

function closeDatabase() {
  if (db) {
    db.close(err => {
      if (err) {
        console.error("Error cerrando la base de datos:", err);
      } else {
        console.log("📦 Base de datos cerrada");
      }
    });
    db = null;
  }
}

module.exports = {
  getDatabase,
  initDatabase,
  closeDatabase,
};
