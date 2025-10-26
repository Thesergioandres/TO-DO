const { v4: uuidv4 } = require("uuid");
const { getInMemoryDatabase } = require("../../lib/memoryDb");
const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

function authenticateToken(req) {
  console.log("[AUTH] Starting token authentication for /api/todos");
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    console.error("[AUTH ERROR] No token provided in authorization header");
    throw new Error("Access token required");
  }

  try {
    console.log("[AUTH] Verifying JWT token...");
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("[AUTH SUCCESS] Token verified for user:", decoded.userId);
    return decoded;
  } catch (error) {
    console.error("[AUTH ERROR] JWT verification failed:", error.message);
    throw new Error("Invalid or expired token");
  }
}

function handleGetTodos(req, res, db, userId) {
  console.log("[GET TODOS] Starting request for user:", userId);
  try {
    const { category, priority, search, status } = req.query;
    console.log("[GET TODOS] Query filters:", {
      category,
      priority,
      search,
      status,
    });

    const filters = {
      category: category && category !== "all" ? category : null,
      priority: priority && priority !== "all" ? priority : null,
      search: search || null,
      status: status || "all",
    };
    console.log("[GET TODOS] Applied filters:", filters);

    const todos = db.getTodosByUserId(userId, filters);
    console.log("[GET TODOS] Found", todos.length, "todos for user");

    // Formatear todos para frontend
    const formattedTodos = todos.map(todo => ({
      ...todo,
      tags: todo.tags
        ? typeof todo.tags === "string"
          ? JSON.parse(todo.tags)
          : todo.tags
        : [],
      completed: Boolean(todo.completed),
    }));
    console.log("[GET TODOS] Successfully formatted todos");

    return res.status(200).json({ success: true, data: formattedTodos });
  } catch (error) {
    console.error("[GET TODOS ERROR] Error in handleGetTodos:", error.message);
    console.error("[GET TODOS ERROR] Stack trace:", error.stack);
    throw error;
  }
}

function handleCreateTodo(req, res, db, userId) {
  console.log("[CREATE TODO] Starting creation for user:", userId);
  try {
    const {
      title,
      description,
      priority = "medium",
      category = "personal",
      tags = [],
      due_date,
    } = req.body;
    console.log("[CREATE TODO] Request body:", {
      title,
      description,
      priority,
      category,
      tags,
      due_date,
    });

    if (!title?.trim()) {
      console.warn("[CREATE TODO] Validation failed: Title is empty");
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }

    const todoId = uuidv4();
    const now = new Date().toISOString();
    console.log("[CREATE TODO] Generated todo ID:", todoId);

    const todoData = {
      id: todoId,
      user_id: userId,
      title: title.trim(),
      description: description || null,
      priority,
      category,
      tags: JSON.stringify(tags),
      due_date: due_date || null,
      completed: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    console.log("[CREATE TODO] Todo data prepared:", todoData);

    db.createTodo(todoData);
    console.log("[CREATE TODO] Todo saved to database successfully");

    const responseData = {
      ...todoData,
      tags: tags,
      completed: false,
    };

    console.log("[CREATE TODO] Todo created successfully with ID:", todoId);
    return res.status(201).json({
      success: true,
      data: responseData,
      message: "Todo created successfully",
    });
  } catch (error) {
    console.error(
      "[CREATE TODO ERROR] Error in handleCreateTodo:",
      error.message
    );
    console.error("[CREATE TODO ERROR] Stack trace:", error.stack);
    throw error;
  }
}

module.exports = async (req, res) => {
  console.log("[API TODOS] Request received:", req.method, "to /api/todos");
  console.log("[API TODOS] Headers:", JSON.stringify(req.headers, null, 2));
  console.log("[API TODOS] Query params:", JSON.stringify(req.query, null, 2));
  console.log("[API TODOS] Body:", JSON.stringify(req.body, null, 2));

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
    console.log("[API TODOS] CORS preflight request handled");
    res.status(200).end();
    return;
  }

  try {
    console.log("[API TODOS] Starting authentication...");
    // Autenticar usuario
    const user = authenticateToken(req);
    console.log("[API TODOS] User authenticated, getting database...");
    const db = getInMemoryDatabase();
    console.log("[API TODOS] Database obtained, routing to handler...");

    switch (req.method) {
      case "GET":
        console.log("[API TODOS] Routing to GET handler");
        return handleGetTodos(req, res, db, user.userId);
      case "POST":
        console.log("[API TODOS] Routing to POST handler");
        return handleCreateTodo(req, res, db, user.userId);
      default:
        console.warn("[API TODOS] Method not allowed:", req.method);
        return res
          .status(405)
          .json({ success: false, message: "Method not allowed" });
    }
  } catch (error) {
    console.error("[API TODOS ERROR] Main handler error:", error.message);
    console.error("[API TODOS ERROR] Stack trace:", error.stack);
    if (error.message.includes("token")) {
      console.error("[API TODOS ERROR] Authentication error");
      return res.status(401).json({ success: false, message: error.message });
    }
    console.error("[API TODOS ERROR] Internal server error");
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
