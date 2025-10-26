const { getDatabase } = require("../../../lib/db");
const {
  createResponse,
  createErrorResponse,
  handleCors,
  authenticateToken,
} = require("../../../lib/utils");

module.exports = async (req, res) => {
  // Manejar CORS
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return res.status(corsResponse.statusCode).json(corsResponse);
  }

  try {
    // Autenticar usuario
    const user = authenticateToken(req);
    const db = getDatabase();
    const { id } = req.query;

    if (!id) {
      return res
        .status(400)
        .json(createErrorResponse(400, "Todo ID is required"));
    }

    switch (req.method) {
      case "PUT":
        return handleUpdateTodo(req, res, db, user.userId, id);
      case "DELETE":
        return handleDeleteTodo(req, res, db, user.userId, id);
      default:
        return res
          .status(405)
          .json(createErrorResponse(405, "Method not allowed"));
    }
  } catch (error) {
    console.error("Todo ID API error:", error);
    if (error.message.includes("token")) {
      return res.status(401).json(createErrorResponse(401, error.message));
    }
    return res
      .status(500)
      .json(createErrorResponse(500, "Internal server error"));
  }
};

function handleUpdateTodo(req, res, db, userId, todoId) {
  try {
    // Verificar que el todo existe y pertenece al usuario
    const existingTodo = db
      .prepare(
        "SELECT * FROM todos WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
      )
      .get(todoId, userId);

    if (!existingTodo) {
      return res.status(404).json(createErrorResponse(404, "Todo not found"));
    }

    const {
      title,
      description,
      completed,
      priority,
      category,
      tags,
      due_date,
    } = req.body;
    const now = new Date().toISOString();

    // Construir query de actualización dinámicamente
    const updates = [];
    const params = [];

    if (title !== undefined) {
      if (!title.trim()) {
        return res
          .status(400)
          .json(createErrorResponse(400, "Title cannot be empty"));
      }
      updates.push("title = ?");
      params.push(title.trim());
    }

    if (description !== undefined) {
      updates.push("description = ?");
      params.push(description);
    }

    if (completed !== undefined) {
      updates.push("completed = ?");
      params.push(completed ? 1 : 0);
    }

    if (priority !== undefined) {
      updates.push("priority = ?");
      params.push(priority);
    }

    if (category !== undefined) {
      updates.push("category = ?");
      params.push(category);
    }

    if (tags !== undefined) {
      updates.push("tags = ?");
      params.push(JSON.stringify(tags));
    }

    if (due_date !== undefined) {
      updates.push("due_date = ?");
      params.push(due_date);
    }

    if (updates.length === 0) {
      return res
        .status(400)
        .json(createErrorResponse(400, "No fields to update"));
    }

    updates.push("updated_at = ?");
    params.push(now);
    params.push(todoId, userId);

    const query = `UPDATE todos SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`;
    const stmt = db.prepare(query);
    const result = stmt.run(params);

    if (result.changes === 0) {
      return res.status(404).json(createErrorResponse(404, "Todo not found"));
    }

    // Obtener todo actualizado
    const updatedTodo = db
      .prepare("SELECT * FROM todos WHERE id = ? AND user_id = ?")
      .get(todoId, userId);
    const formattedTodo = {
      ...updatedTodo,
      tags: updatedTodo.tags ? JSON.parse(updatedTodo.tags) : [],
      completed: Boolean(updatedTodo.completed),
    };

    return res
      .status(200)
      .json(createResponse(200, formattedTodo, "Todo updated successfully"));
  } catch (error) {
    console.error("Update todo error:", error);
    throw error;
  }
}

function handleDeleteTodo(req, res, db, userId, todoId) {
  try {
    const now = new Date().toISOString();

    // Soft delete
    const stmt = db.prepare(
      "UPDATE todos SET deleted_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
    );
    const result = stmt.run(now, todoId, userId);

    if (result.changes === 0) {
      return res.status(404).json(createErrorResponse(404, "Todo not found"));
    }

    return res
      .status(200)
      .json(createResponse(200, null, "Todo deleted successfully"));
  } catch (error) {
    console.error("Delete todo error:", error);
    throw error;
  }
}
