const express = require("express");
const jwt = require("jsonwebtoken");
const { getDatabase } = require("../database/init");

const router = express.Router();

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Token requerido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" });
  }
};

// Sincronización completa - subir datos locales
router.post("/upload", authenticateToken, async (req, res) => {
  try {
    const { todos, lastSync } = req.body;
    const db = getDatabase();

    if (!Array.isArray(todos)) {
      return res.status(400).json({ error: "Datos inválidos" });
    }

    const conflicts = [];
    const processed = [];

    for (const todo of todos) {
      try {
        // Buscar si existe por client_id o por id del servidor
        let existingTodo = null;

        if (todo.client_id) {
          existingTodo = await new Promise((resolve, reject) => {
            db.get(
              "SELECT * FROM todos WHERE client_id = ? AND user_id = ?",
              [todo.client_id, req.user.userId],
              (err, row) => {
                if (err) reject(err);
                else resolve(row);
              }
            );
          });
        }

        if (!existingTodo && todo.id && typeof todo.id === "number") {
          existingTodo = await new Promise((resolve, reject) => {
            db.get(
              "SELECT * FROM todos WHERE id = ? AND user_id = ?",
              [todo.id, req.user.userId],
              (err, row) => {
                if (err) reject(err);
                else resolve(row);
              }
            );
          });
        }

        if (existingTodo) {
          // Verificar si hay conflicto temporal
          const serverUpdated = new Date(existingTodo.updated_at);
          const clientUpdated = new Date(todo.updated_at);

          if (serverUpdated > clientUpdated) {
            // Hay conflicto - el servidor tiene una versión más nueva
            conflicts.push({
              client_id: todo.client_id,
              server_todo: {
                ...existingTodo,
                completed: Boolean(existingTodo.completed),
                tags: JSON.parse(existingTodo.tags || "[]"),
              },
              client_todo: todo,
              conflict_type: "update_conflict",
            });
            continue;
          }

          // Actualizar todo existente
          await new Promise((resolve, reject) => {
            db.run(
              `
              UPDATE todos 
              SET title = ?, description = ?, completed = ?, priority = ?, 
                  category = ?, due_date = ?, tags = ?, version = version + 1
              WHERE id = ?
            `,
              [
                todo.title,
                todo.description || null,
                todo.completed ? 1 : 0,
                todo.priority || "medium",
                todo.category || "personal",
                todo.due_date || null,
                JSON.stringify(todo.tags || []),
                existingTodo.id,
              ],
              function (err) {
                if (err) reject(err);
                else resolve();
              }
            );
          });

          processed.push({
            client_id: todo.client_id,
            server_id: existingTodo.id,
            action: "updated",
          });
        } else {
          // Crear nuevo todo
          const newId = await new Promise((resolve, reject) => {
            db.run(
              `
              INSERT INTO todos (user_id, client_id, title, description, completed, priority, category, due_date, tags)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
              [
                req.user.userId,
                todo.client_id || null,
                todo.title,
                todo.description || null,
                todo.completed ? 1 : 0,
                todo.priority || "medium",
                todo.category || "personal",
                todo.due_date || null,
                JSON.stringify(todo.tags || []),
              ],
              function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
              }
            );
          });

          processed.push({
            client_id: todo.client_id,
            server_id: newId,
            action: "created",
          });
        }
      } catch (error) {
        console.error("Error procesando todo:", error);
        conflicts.push({
          client_id: todo.client_id,
          error: "Error procesando item",
          client_todo: todo,
          conflict_type: "processing_error",
        });
      }
    }

    // Actualizar timestamp de sincronización del usuario
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET last_sync = CURRENT_TIMESTAMP WHERE id = ?",
        [req.user.userId],
        err => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({
      success: true,
      processed,
      conflicts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error en sincronización upload:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Sincronización - descargar cambios del servidor
router.get("/download", authenticateToken, async (req, res) => {
  try {
    const { since } = req.query;
    const db = getDatabase();

    let query = `
      SELECT id, client_id, title, description, completed, priority, category, 
             due_date, tags, created_at, updated_at, deleted_at, version
      FROM todos 
      WHERE user_id = ?
    `;
    let params = [req.user.userId];

    if (since) {
      query += " AND updated_at > ?";
      params.push(since);
    }

    query += " ORDER BY updated_at ASC";

    const todos = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else
          resolve(
            rows.map(row => ({
              ...row,
              completed: Boolean(row.completed),
              tags: JSON.parse(row.tags || "[]"),
              is_deleted: Boolean(row.deleted_at),
            }))
          );
      });
    });

    res.json({
      todos,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error en sincronización download:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Resolver conflicto de sincronización
router.post("/resolve-conflict", authenticateToken, async (req, res) => {
  try {
    const { client_id, resolution, todo_data } = req.body;
    const db = getDatabase();

    if (resolution === "use_server") {
      // No hacer nada, mantener versión del servidor
      res.json({
        success: true,
        message: "Conflicto resuelto - versión del servidor mantenida",
      });
    } else if (resolution === "use_client") {
      // Actualizar con datos del cliente
      const existingTodo = await new Promise((resolve, reject) => {
        db.get(
          "SELECT id FROM todos WHERE client_id = ? AND user_id = ?",
          [client_id, req.user.userId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (existingTodo) {
        await new Promise((resolve, reject) => {
          db.run(
            `
            UPDATE todos 
            SET title = ?, description = ?, completed = ?, priority = ?, 
                category = ?, due_date = ?, tags = ?, version = version + 1
            WHERE id = ?
          `,
            [
              todo_data.title,
              todo_data.description || null,
              todo_data.completed ? 1 : 0,
              todo_data.priority || "medium",
              todo_data.category || "personal",
              todo_data.due_date || null,
              JSON.stringify(todo_data.tags || []),
              existingTodo.id,
            ],
            function (err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }

      res.json({
        success: true,
        message: "Conflicto resuelto - versión del cliente aplicada",
      });
    } else {
      res.status(400).json({ error: "Resolución de conflicto inválida" });
    }
  } catch (error) {
    console.error("Error resolviendo conflicto:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Estado de sincronización del usuario
router.get("/status", authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();

    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT last_sync FROM users WHERE id = ?",
        [req.user.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    const todoCount = await new Promise((resolve, reject) => {
      db.get(
        "SELECT COUNT(*) as count FROM todos WHERE user_id = ? AND deleted_at IS NULL",
        [req.user.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });

    res.json({
      last_sync: user?.last_sync,
      todo_count: todoCount,
      server_time: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error obteniendo estado de sync:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
