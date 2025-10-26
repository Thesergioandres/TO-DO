const { v4: uuidv4 } = require("uuid");
const { getInMemoryDatabase } = require("../../lib/memoryDb");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

function authenticateToken(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new Error('Access token required');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

module.exports = async (req, res) => {
  // Configurar headers CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // Autenticar usuario
    const user = authenticateToken(req);
    const db = getInMemoryDatabase();

    switch (req.method) {
      case 'GET':
        return handleGetTodos(req, res, db, user.userId);
      case 'POST':
        return handleCreateTodo(req, res, db, user.userId);
      default:
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Todo API error:', error);
    if (error.message.includes('token')) {
      return res.status(401).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

function handleGetTodos(req, res, db, userId) {
  try {
    const { category, priority, search, status } = req.query;

    const filters = {
      category: category && category !== 'all' ? category : null,
      priority: priority && priority !== 'all' ? priority : null,
      search: search || null,
      status: status || 'all'
    };

    const todos = db.getTodosByUserId(userId, filters);
    
    // Formatear todos para frontend
    const formattedTodos = todos.map(todo => ({
      ...todo,
      tags: todo.tags ? (typeof todo.tags === 'string' ? JSON.parse(todo.tags) : todo.tags) : [],
      completed: Boolean(todo.completed)
    }));

    return res.status(200).json({ success: true, data: formattedTodos });
  } catch (error) {
    console.error('Get todos error:', error);
    throw error;
  }
}

function handleCreateTodo(req, res, db, userId) {
  try {
    const { title, description, priority = 'medium', category = 'personal', tags = [], due_date } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
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
      deleted_at: null
    };

    db.createTodo(todoData);

    const responseData = {
      ...todoData,
      tags: tags,
      completed: false
    };

    return res.status(201).json({
      success: true, 
      data: responseData, 
      message: 'Todo created successfully' 
    });
  } catch (error) {
    console.error('Create todo error:', error);
    throw error;
  }
}