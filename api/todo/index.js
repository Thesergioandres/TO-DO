const { v4: uuidv4 } = require("uuid");
const { getInMemoryDatabase } = require("../../lib/memoryDb");
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
    "[API TODO]",
    req.method,
    "from:",
    req.headers["x-forwarded-for"] || "localhost"
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
    res.status(200).end();
    return;
  }

  try {
    const user = authenticateToken(req);
    const db = getInMemoryDatabase();

    switch (req.method) {
      case "GET":
        return handleGetTodos(req, res, db, user.userId);
      case "POST":
        return handleCreateTodo(req, res, db, user.userId);
      default:
        console.warn("[API TODO] Method not allowed:", req.method);
        return res
          .status(405)
          .json({ success: false, message: "Method not allowed" });
    }
  } catch (error) {
    console.error("[API TODO ERROR]", error.message);
    if (error.message.includes("token")) {
      return res.status(401).json({ success: false, message: error.message });
    }
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

function handleGetTodos(req, res, db, userId) {
  try {
    const { category, priority, search, status } = req.query;
    const filters = {
      category: category && category !== "all" ? category : null,
      priority: priority && priority !== "all" ? priority : null,
      search: search || null,
      status: status || "all",
    };

    const todos = db.getTodosByUserId(userId, filters);
    console.log("[GET TODO] Found", todos.length, "todos for user:", userId);

    const formattedTodos = todos.map((todo) => ({
      ...todo,
      tags: todo.tags
        ? typeof todo.tags === "string"
          ? JSON.parse(todo.tags)
          : todo.tags
        : [],
      completed: Boolean(todo.completed),
    }));

    return res.status(200).json({ success: true, data: formattedTodos });
  } catch (error) {
    console.error("[GET TODO ERROR]", error.message);
    throw error;
  }
}

function handleCreateTodo(req, res, db, userId) {
  try {
    const {
      title,
      description,
      priority = "medium",
      category = "personal",
      tags = [],
      due_date,
    } = req.body;

    if (!title?.trim()) {
      console.warn("[CREATE TODO] Title required for user:", userId);
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }

    // Validar priority
    const validPriorities = ["low", "medium", "high", "urgent"];
    if (!validPriorities.includes(priority)) {
      console.warn("[CREATE TODO] Invalid priority:", priority);
      return res.status(400).json({
        success: false,
        message: `Priority must be one of: ${validPriorities.join(", ")}`,
      });
    }

    // Validar category
    const validCategories = [
      "personal",
      "work",
      "shopping",
      "health",
      "finance",
      "education",
    ];
    if (!validCategories.includes(category)) {
      console.warn("[CREATE TODO] Invalid category:", category);
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${validCategories.join(", ")}`,
      });
    }

    // Validar tags
    if (!Array.isArray(tags)) {
      console.warn("[CREATE TODO] Invalid tags format:", tags);
      return res.status(400).json({
        success: false,
        message: "Tags must be an array",
      });
    }

    // Validar due_date si se proporciona
    if (due_date && isNaN(Date.parse(due_date))) {
      console.warn("[CREATE TODO] Invalid due_date:", due_date);
      return res.status(400).json({
        success: false,
        message: "due_date must be a valid ISO date string",
      });
    }

    const todoId = uuidv4();
    const now = new Date().toISOString();

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

    db.createTodo(todoData);
    console.log("[CREATE TODO] Created todo:", todoId, "for user:", userId);

    const responseData = {
      ...todoData,
      tags: tags,
      completed: false,
    };

    return res.status(201).json({
      success: true,
      data: responseData,
      message: "Todo created successfully",
    });
  } catch (error) {
    console.error("[CREATE TODO ERROR]", error.message);
    throw error;
  }
}
