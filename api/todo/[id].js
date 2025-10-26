const { getInMemoryDatabase } = require("../../../lib/memoryDb");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

function authenticateToken(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    console.error("[AUTH ERROR] No token provided");
    throw new Error("Access token required");
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error("[AUTH ERROR] Invalid token:", error.message);
    throw new Error("Invalid or expired token");
  }
}

module.exports = async (req, res) => {
  console.log(
    "[API TODO ID]",
    req.method,
    "from:",
    req.headers["x-forwarded-for"] || "localhost"
  );

  // Configurar headers CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    const user = authenticateToken(req);
    const db = getInMemoryDatabase();

    // Extraer ID de la URL
    const { id } = req.query;

    if (!id) {
      console.warn("[API TODO ID] No ID provided");
      return res.status(400).json({
        success: false,
        message: "Todo ID is required",
      });
    }

    switch (req.method) {
      case "PUT":
        return handleUpdateTodo(req, res, db, user.userId, id);
      case "DELETE":
        return handleDeleteTodo(req, res, db, user.userId, id);
      case "PATCH":
        return handleToggleComplete(req, res, db, user.userId, id);
      default:
        console.warn("[API TODO ID] Method not allowed:", req.method);
        return res
          .status(405)
          .json({ success: false, message: "Method not allowed" });
    }
  } catch (error) {
    console.error("[API TODO ID ERROR]", error.message);
    if (error.message.includes("token")) {
      return res.status(401).json({ success: false, message: error.message });
    }
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

function handleUpdateTodo(req, res, db, userId, todoId) {
  try {
    const {
      title,
      description,
      priority,
      category,
      tags,
      due_date,
      completed,
    } = req.body;

    // Validar priority si se proporciona
    if (priority && !["low", "medium", "high", "urgent"].includes(priority)) {
      console.warn("[UPDATE TODO] Invalid priority:", priority);
      return res.status(400).json({
        success: false,
        message: "Priority must be one of: low, medium, high, urgent",
      });
    }

    // Validar category si se proporciona
    const validCategories = [
      "personal",
      "work",
      "shopping",
      "health",
      "finance",
      "education",
    ];
    if (category && !validCategories.includes(category)) {
      console.warn("[UPDATE TODO] Invalid category:", category);
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${validCategories.join(", ")}`,
      });
    }

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description;
    if (priority !== undefined) updates.priority = priority;
    if (category !== undefined) updates.category = category;
    if (tags !== undefined) updates.tags = JSON.stringify(tags);
    if (due_date !== undefined) updates.due_date = due_date;
    if (completed !== undefined) updates.completed = Boolean(completed);

    const updatedTodo = db.updateTodo(todoId, userId, updates);

    if (!updatedTodo) {
      console.warn("[UPDATE TODO] Todo not found:", todoId);
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    // Formatear respuesta
    const responseData = {
      ...updatedTodo,
      tags: updatedTodo.tags ? JSON.parse(updatedTodo.tags) : [],
      completed: Boolean(updatedTodo.completed),
    };

    console.log("[UPDATE TODO] Updated todo:", todoId, "for user:", userId);
    return res.status(200).json({
      success: true,
      data: responseData,
      message: "Todo updated successfully",
    });
  } catch (error) {
    console.error("[UPDATE TODO ERROR]", error.message);
    throw error;
  }
}

function handleDeleteTodo(req, res, db, userId, todoId) {
  try {
    const deleted = db.deleteTodo(todoId, userId);

    if (!deleted) {
      console.warn("[DELETE TODO] Todo not found:", todoId);
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    console.log("[DELETE TODO] Deleted todo:", todoId, "for user:", userId);
    return res.status(200).json({
      success: true,
      message: "Todo deleted successfully",
    });
  } catch (error) {
    console.error("[DELETE TODO ERROR]", error.message);
    throw error;
  }
}

function handleToggleComplete(req, res, db, userId, todoId) {
  try {
    const { completed } = req.body;

    if (completed === undefined) {
      return res.status(400).json({
        success: false,
        message: "completed field is required",
      });
    }

    const updates = {
      completed: Boolean(completed),
    };

    const updatedTodo = db.updateTodo(todoId, userId, updates);

    if (!updatedTodo) {
      console.warn("[TOGGLE TODO] Todo not found:", todoId);
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    // Formatear respuesta
    const responseData = {
      ...updatedTodo,
      tags: updatedTodo.tags ? JSON.parse(updatedTodo.tags) : [],
      completed: Boolean(updatedTodo.completed),
    };

    console.log(
      "[TOGGLE TODO] Toggled todo:",
      todoId,
      "completed:",
      completed,
      "for user:",
      userId
    );
    return res.status(200).json({
      success: true,
      data: responseData,
      message: `Todo marked as ${completed ? "completed" : "pending"}`,
    });
  } catch (error) {
    console.error("[TOGGLE TODO ERROR]", error.message);
    throw error;
  }
}
