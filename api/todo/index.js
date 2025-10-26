const { v4: uuidv4 } = require("uuid");
const { getInMemoryDatabase } = require("../../lib/memoryDb");
const { verifyToken } = require("../../lib/authMiddleware");
const {
  createSuccessResponse,
  createErrorResponse,
  sendResponse,
  handleApiError,
  validateRequiredFields,
  validatePriority,
  validateCategory,
  validateDate,
  checkRateLimit,
} = require("../../lib/apiHelpers");

module.exports = async (req, res) => {
  console.log(`[TODO API] ${req.method} request received`);
  console.log("[TODO API] Headers:", JSON.stringify(req.headers, null, 2));
  console.log("[TODO API] Query:", JSON.stringify(req.query, null, 2));
  console.log("[TODO API] Body:", JSON.stringify(req.body, null, 2));

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
    console.log("[TODO API] CORS preflight request handled");
    res.status(200).end();
    return;
  }

  // Verificar autenticación para todos los métodos excepto OPTIONS
  try {
    await new Promise((resolve, reject) => {
      verifyToken(req, res, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  } catch (error) {
    console.error("[TODO API] Authentication failed:", error.message);
    return; // verifyToken ya envió la respuesta
  }

  // Manejar métodos HTTP
  try {
    switch (req.method) {
      case "GET":
        return await handleGetTodos(req, res);
      case "POST":
        return await handleCreateTodo(req, res);
      default:
        console.warn(`[TODO API] Method ${req.method} not allowed`);
        return sendResponse(
          res,
          createErrorResponse(`Method ${req.method} Not Allowed`, 405)
        );
    }
  } catch (error) {
    return handleApiError(error, req, res);
  }
};

async function handleGetTodos(req, res) {
  try {
    // Rate limiting
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    checkRateLimit(clientIP, 100, 15 * 60 * 1000); // 100 requests por 15 minutos

    const { userId } = req.user;
    const { category, priority, search, status, page = 1, limit = 10 } = req.query;
    
    console.log(`[TODO GET] Fetching todos for user: ${userId}`);
    console.log(`[TODO GET] Filters: category=${category}, priority=${priority}, search=${search}, status=${status}`);
    
    const db = getInMemoryDatabase();
    
    // Obtener todos los TODOs del usuario
    let todos = db.getTodosByUserId(userId);
    console.log(`[TODO GET] Found ${todos.length} total todos for user ${userId}`);
    
    // Aplicar filtros
    if (category && category !== "all") {
      validateCategory(category);
      todos = todos.filter(todo => todo.category === category);
      console.log(`[TODO GET] After category filter: ${todos.length} todos`);
    }
    
    if (priority && priority !== "all") {
      validatePriority(priority);
      todos = todos.filter(todo => todo.priority === priority);
      console.log(`[TODO GET] After priority filter: ${todos.length} todos`);
    }
    
    if (status && status !== "all") {
      const isCompleted = status === 'completed';
      todos = todos.filter(todo => todo.completed === isCompleted);
      console.log(`[TODO GET] After status filter: ${todos.length} todos`);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      todos = todos.filter(todo => 
        todo.title.toLowerCase().includes(searchLower) ||
        (todo.description && todo.description.toLowerCase().includes(searchLower))
      );
      console.log(`[TODO GET] After search filter: ${todos.length} todos`);
    }
    
    // Ordenar por fecha de creación (más recientes primero)
    todos.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
    
    // Paginación
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedTodos = todos.slice(startIndex, endIndex);

    const formattedTodos = paginatedTodos.map((todo) => ({
      ...todo,
      tags: todo.tags
        ? typeof todo.tags === "string"
          ? JSON.parse(todo.tags)
          : todo.tags
        : [],
      completed: Boolean(todo.completed),
    }));

    const responseData = {
      todos: formattedTodos,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(todos.length / limit),
        totalItems: todos.length,
        hasNext: endIndex < todos.length,
        hasPrev: page > 1
      }
    };

    console.log(`[TODO GET] Returning ${formattedTodos.length} todos (page ${page})`);
    return sendResponse(res, createSuccessResponse(responseData, 'Todos retrieved successfully'));

  } catch (error) {
    return handleApiError(error, req, res);
  }
}

async function handleCreateTodo(req, res) {
  try {
    // Rate limiting
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    checkRateLimit(clientIP, 50, 15 * 60 * 1000); // 50 TODOs por 15 minutos

    const { userId } = req.user;
    const {
      title,
      description,
      priority = "medium",
      category = "personal",
      tags = [],
      due_date,
    } = req.body;

    console.log(`[TODO CREATE] Creating todo for user: ${userId}`);
    console.log(`[TODO CREATE] Data:`, { title, description, priority, category, tags, due_date });

    // Validar campos requeridos
    validateRequiredFields(req.body, ['title']);

    // Validaciones específicas
    if (title.trim().length < 1) {
      throw new Error('Title cannot be empty');
    }
    
    if (title.length > 200) {
      throw new Error('Title must be less than 200 characters');
    }
    
    if (description && description.length > 1000) {
      throw new Error('Description must be less than 1000 characters');
    }

    // Validar priority y category
    validatePriority(priority);
    validateCategory(category);

    // Validar tags
    if (!Array.isArray(tags)) {
      throw new Error('Tags must be an array');
    }

    if (tags.length > 10) {
      throw new Error('Maximum 10 tags allowed');
    }

    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.length > 20) {
        throw new Error('Each tag must be a string with maximum 20 characters');
      }
    }

    // Validar due_date si se proporciona
    if (due_date) {
      validateDate(due_date);
      const dueDateObj = new Date(due_date);
      const now = new Date();
      if (dueDateObj < now) {
        throw new Error('Due date cannot be in the past');
      }
    }

    const db = getInMemoryDatabase();
    const todoId = uuidv4();
    const now = new Date().toISOString();

    const todoData = {
      id: todoId,
      user_id: userId,
      title: title.trim(),
      description: description ? description.trim() : null,
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
    console.log(`[TODO CREATE] Created todo: ${todoId} for user: ${userId}`);

    const responseData = {
      ...todoData,
      tags: tags,
      completed: false,
    };

    return sendResponse(res, createSuccessResponse(responseData, 'Todo created successfully', 201));

  } catch (error) {
    return handleApiError(error, req, res);
  }
}
