const express = require("express");
const { body, validationResult } = require("express-validator");
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

// Validaciones
const validateTodo = [
  body("title").trim().isLength({ min: 1 }),
  body("priority").optional().isIn(["low", "medium", "high"]),
  body("category").optional().isLength({ min: 1 }),
  body("tags").optional().isArray(),
];

// Obtener todos los todos del usuario
router.get("/", authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();
    const { since } = req.query;

    let query = `
      SELECT id, client_id, title, description, completed, priority, category, 
             due_date, tags, created_at, updated_at, version
      FROM todos 
      WHERE user_id = ? AND deleted_at IS NULL
    `;
    let params = [req.user.userId];

    if (since) {
      query += " AND updated_at > ?";
      params.push(since);
    }

    query += " ORDER BY updated_at DESC";

    const todos = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else
          resolve(
            rows.map(row => ({
              ...row,
              completed: Boolean(row.completed),
              tags: JSON.parse(row.tags || "[]"),
            }))
          );
      });
    });

    res.json(todos);
  } catch (error) {
    console.error("Error obteniendo todos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Crear nuevo todo
router.post("/", authenticateToken, validateTodo, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Datos inválidos",
        details: errors.array(),
      });
    }

    const {
      client_id,
      title,
      description,
      priority,
      category,
      due_date,
      tags,
    } = req.body;
    const db = getDatabase();

    const todoId = await new Promise((resolve, reject) => {
      db.run(
        `
        INSERT INTO todos (user_id, client_id, title, description, priority, category, due_date, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          req.user.userId,
          client_id || null,
          title,
          description || null,
          priority || "medium",
          category || "personal",
          due_date || null,
          JSON.stringify(tags || []),
        ],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Obtener el todo creado
    const newTodo = await new Promise((resolve, reject) => {
      db.get(
        `
        SELECT id, client_id, title, description, completed, priority, category, 
               due_date, tags, created_at, updated_at, version
        FROM todos WHERE id = ?
      `,
        [todoId],
        (err, row) => {
          if (err) reject(err);
          else
            resolve({
              ...row,
              completed: Boolean(row.completed),
              tags: JSON.parse(row.tags || "[]"),
            });
        }
      );
    });

    res.status(201).json(newTodo);
  } catch (error) {
    console.error("Error creando todo:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Actualizar todo
router.put("/:id", authenticateToken, validateTodo, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Datos inválidos",
        details: errors.array(),
      });
    }

    const { id } = req.params;
    const {
      title,
      description,
      completed,
      priority,
      category,
      due_date,
      tags,
      version,
    } = req.body;
    const db = getDatabase();

    // Verificar que el todo pertenece al usuario
    const existingTodo = await new Promise((resolve, reject) => {
      db.get(
        "SELECT version FROM todos WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
        [id, req.user.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!existingTodo) {
      return res.status(404).json({ error: "Todo no encontrado" });
    }

    // Control de versiones para evitar conflictos
    if (version && existingTodo.version !== version) {
      return res.status(409).json({
        error: "Conflicto de versión",
        currentVersion: existingTodo.version,
      });
    }

    // Actualizar
    await new Promise((resolve, reject) => {
      db.run(
        `
        UPDATE todos 
        SET title = ?, description = ?, completed = ?, priority = ?, 
            category = ?, due_date = ?, tags = ?, version = version + 1
        WHERE id = ? AND user_id = ?
      `,
        [
          title,
          description || null,
          completed ? 1 : 0,
          priority || "medium",
          category || "personal",
          due_date || null,
          JSON.stringify(tags || []),
          id,
          req.user.userId,
        ],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Obtener el todo actualizado
    const updatedTodo = await new Promise((resolve, reject) => {
      db.get(
        `
        SELECT id, client_id, title, description, completed, priority, category, 
               due_date, tags, created_at, updated_at, version
        FROM todos WHERE id = ?
      `,
        [id],
        (err, row) => {
          if (err) reject(err);
          else
            resolve({
              ...row,
              completed: Boolean(row.completed),
              tags: JSON.parse(row.tags || "[]"),
            });
        }
      );
    });

    res.json(updatedTodo);
  } catch (error) {
    console.error("Error actualizando todo:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Eliminar todo (soft delete)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const result = await new Promise((resolve, reject) => {
      db.run(
        `
        UPDATE todos 
        SET deleted_at = CURRENT_TIMESTAMP, version = version + 1
        WHERE id = ? AND user_id = ? AND deleted_at IS NULL
      `,
        [id, req.user.userId],
        function (err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });

    if (result === 0) {
      return res.status(404).json({ error: "Todo no encontrado" });
    }

    res.json({ message: "Todo eliminado exitosamente" });
  } catch (error) {
    console.error("Error eliminando todo:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Obtener estadísticas
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();

    const stats = await new Promise((resolve, reject) => {
      db.all(
        `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN completed = 0 AND due_date IS NOT NULL AND due_date < datetime('now') THEN 1 ELSE 0 END) as overdue,
          priority,
          category
        FROM todos 
        WHERE user_id = ? AND deleted_at IS NULL
        GROUP BY priority, category
      `,
        [req.user.userId],
        (err, rows) => {
          if (err) reject(err);
          else {
            const result = {
              total: 0,
              completed: 0,
              pending: 0,
              overdue: 0,
              byPriority: { high: 0, medium: 0, low: 0 },
              byCategory: {},
            };

            rows.forEach(row => {
              result.total += row.total;
              result.completed += row.completed;
              result.pending += row.pending;
              result.overdue += row.overdue;

              if (
                row.priority &&
                result.byPriority[row.priority] !== undefined
              ) {
                result.byPriority[row.priority] += row.pending;
              }

              if (row.category) {
                result.byCategory[row.category] =
                  (result.byCategory[row.category] || 0) + row.total;
              }
            });

            resolve(result);
          }
        }
      );
    });

    res.json(stats);
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
