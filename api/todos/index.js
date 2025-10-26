const { v4: uuidv4 } = require("uuid");
const { getDatabase } = require("../../lib/db");
const {
  createResponse,
  createErrorResponse,
  handleCors,
  authenticateToken,
} = require("../../lib/utils");

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

    switch (req.method) {
      case "GET":
        return handleGetTodos(req, res, db, user.userId);
      case "POST":
        return handleCreateTodo(req, res, db, user.userId);
      default:
        return res
          .status(405)
          .json(createErrorResponse(405, "Method not allowed"));
    }
  } catch (error) {
    console.error("Todos API error:", error);
    if (error.message.includes("token")) {
      return res.status(401).json(createErrorResponse(401, error.message));
    }
    return res
      .status(500)
      .json(createErrorResponse(500, "Internal server error"));
  }
};

function handleGetTodos(req, res, db, userId) {
  try {
    const { category, priority, search, status } = req.query;

    let query = "SELECT * FROM todos WHERE user_id = ? AND deleted_at IS NULL";
    const params = [userId];

    // Aplicar filtros
    if (category && category !== "all") {
      query += " AND category = ?";
      params.push(category);
    }

    if (priority && priority !== "all") {
      query += " AND priority = ?";
      params.push(priority);
    }

    if (search) {
      query += " AND (title LIKE ? OR description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status === "completed") {
      query += " AND completed = 1";
    } else if (status === "pending") {
      query += " AND completed = 0";
    } else if (status === "overdue") {
      query += " AND completed = 0 AND due_date IS NOT NULL AND due_date < ?";
      params.push(new Date().toISOString());
    }

    query += " ORDER BY created_at DESC";

    const todos = db.prepare(query).all(params);

    // Parsear tags JSON
    const formattedTodos = todos.map(todo => ({
      ...todo,
      tags: todo.tags ? JSON.parse(todo.tags) : [],
      completed: Boolean(todo.completed),
    }));

    return res.status(200).json(createResponse(200, formattedTodos));
  } catch (error) {
    console.error("Get todos error:", error);
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
      return res
        .status(400)
        .json(createErrorResponse(400, "Title is required"));
    }

    const todoId = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO todos (
        id, user_id, title, description, priority, category, 
        tags, due_date, completed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      todoId,
      userId,
      title.trim(),
      description || null,
      priority,
      category,
      JSON.stringify(tags),
      due_date || null,
      0,
      now,
      now
    );

    const newTodo = {
      id: todoId,
      user_id: userId,
      title: title.trim(),
      description: description || null,
      priority,
      category,
      tags,
      due_date: due_date || null,
      completed: false,
      created_at: now,
      updated_at: now,
    };

    return res
      .status(201)
      .json(createResponse(201, newTodo, "Todo created successfully"));
  } catch (error) {
    console.error("Create todo error:", error);
    throw error;
  }
}
