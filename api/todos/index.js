const { v4: uuidv4 } = require("uuid");const { v4: uuidv4 } = require("uuid");const { v4: uuidv4 } = require("uuid");

const { getInMemoryDatabase } = require("../../lib/memoryDb");

const jwt = require("jsonwebtoken");const { getInMemoryDatabase } = require("../../lib/memoryDb");const { getInMemoryDatabase } = require("../../lib/memoryDb");



const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";const jwt = require("jsonwebtoken");const jwt = require("jsonwebtoken");



function authenticateToken(req) {

  const authHeader = req.headers.authorization;

  const token = authHeader && authHeader.split(' ')[1];const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";const JWT_SECRET =



  if (!token) {  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

    throw new Error('Access token required');

  }function authenticateToken(req) {



  try {  const authHeader = req.headers.authorization;function authenticateToken(req) {

    const decoded = jwt.verify(token, JWT_SECRET);

    return decoded;  const token = authHeader && authHeader.split(' ')[1];  const authHeader = req.headers.authorization;

  } catch (error) {

    throw new Error('Invalid or expired token');  const token = authHeader && authHeader.split(" ")[1];

  }

}  if (!token) {



module.exports = async (req, res) => {    throw new Error('Access token required');  if (!token) {

  // Configurar headers CORS

  res.setHeader("Access-Control-Allow-Origin", "*");  }    throw new Error("Access token required");

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");  }

  res.setHeader("Content-Type", "application/json");

    try {

  // Manejar CORS preflight

  if (req.method === "OPTIONS") {    const decoded = jwt.verify(token, JWT_SECRET);  try {

    res.status(200).end();

    return;    return decoded;    const decoded = jwt.verify(token, JWT_SECRET);

  }

  } catch (error) {    return decoded;

  try {

    // Autenticar usuario    throw new Error('Invalid or expired token');  } catch (error) {

    const user = authenticateToken(req);

    const db = getInMemoryDatabase();  }    throw new Error("Invalid or expired token");



    switch (req.method) {}  }

      case 'GET':

        return handleGetTodos(req, res, db, user.userId);}

      case 'POST':

        return handleCreateTodo(req, res, db, user.userId);module.exports = async (req, res) => {

      default:

        return res.status(405).json({ success: false, message: 'Method not allowed' });  // Configurar headers CORSmodule.exports = async (req, res) => {

    }

  } catch (error) {  res.setHeader("Access-Control-Allow-Origin", "*");  // Manejar CORS

    console.error('Todos API error:', error);

    if (error.message.includes('token')) {  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");  const corsResponse = handleCors(req);

      return res.status(401).json({ success: false, message: error.message });

    }  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");  if (corsResponse) {

    return res.status(500).json({ success: false, message: 'Internal server error' });

  }  res.setHeader("Content-Type", "application/json");    return res.status(corsResponse.statusCode).json(corsResponse);

};

    }

function handleGetTodos(req, res, db, userId) {

  try {  // Manejar CORS preflight

    const { category, priority, search, status } = req.query;

      if (req.method === "OPTIONS") {  try {

    const filters = {

      category: category && category !== 'all' ? category : null,    res.status(200).end();    // Autenticar usuario

      priority: priority && priority !== 'all' ? priority : null,

      search: search || null,    return;    const user = authenticateToken(req);

      status: status || 'all'

    };  }    const db = getDatabase();



    const todos = db.getTodosByUserId(userId, filters);

    

    // Formatear todos para frontend  try {    switch (req.method) {

    const formattedTodos = todos.map(todo => ({

      ...todo,    // Autenticar usuario      case "GET":

      tags: todo.tags ? (typeof todo.tags === 'string' ? JSON.parse(todo.tags) : todo.tags) : [],

      completed: Boolean(todo.completed)    const user = authenticateToken(req);        return handleGetTodos(req, res, db, user.userId);

    }));

    const db = getInMemoryDatabase();      case "POST":

    return res.status(200).json({ success: true, data: formattedTodos });

  } catch (error) {        return handleCreateTodo(req, res, db, user.userId);

    console.error('Get todos error:', error);

    throw error;    switch (req.method) {      default:

  }

}      case 'GET':        return res



function handleCreateTodo(req, res, db, userId) {        return handleGetTodos(req, res, db, user.userId);          .status(405)

  try {

    const { title, description, priority = 'medium', category = 'personal', tags = [], due_date } = req.body;      case 'POST':          .json(createErrorResponse(405, "Method not allowed"));



    if (!title?.trim()) {        return handleCreateTodo(req, res, db, user.userId);    }

      return res.status(400).json({ success: false, message: 'Title is required' });

    }      default:  } catch (error) {



    const todoId = uuidv4();        return res.status(405).json({ success: false, message: 'Method not allowed' });    console.error("Todos API error:", error);

    const now = new Date().toISOString();

    }    if (error.message.includes("token")) {

    const todoData = {

      id: todoId,  } catch (error) {      return res.status(401).json(createErrorResponse(401, error.message));

      user_id: userId,

      title: title.trim(),    console.error('Todos API error:', error);    }

      description: description || null,

      priority,    if (error.message.includes('token')) {    return res

      category,

      tags: JSON.stringify(tags),      return res.status(401).json({ success: false, message: error.message });      .status(500)

      due_date: due_date || null,

      completed: false,    }      .json(createErrorResponse(500, "Internal server error"));

      created_at: now,

      updated_at: now,    return res.status(500).json({ success: false, message: 'Internal server error' });  }

      deleted_at: null

    };  }};



    db.createTodo(todoData);};



    const responseData = {function handleGetTodos(req, res, db, userId) {

      ...todoData,

      tags: tags,function handleGetTodos(req, res, db, userId) {  try {

      completed: false

    };  try {    const { category, priority, search, status } = req.query;



    return res.status(201).json({     const { category, priority, search, status } = req.query;

      success: true, 

      data: responseData,         let query = "SELECT * FROM todos WHERE user_id = ? AND deleted_at IS NULL";

      message: 'Todo created successfully' 

    });    const filters = {    const params = [userId];

  } catch (error) {

    console.error('Create todo error:', error);      category: category && category !== 'all' ? category : null,

    throw error;

  }      priority: priority && priority !== 'all' ? priority : null,    // Aplicar filtros

}
      search: search || null,    if (category && category !== "all") {

      status: status || 'all'      query += " AND category = ?";

    };      params.push(category);

    }

    const todos = db.getTodosByUserId(userId, filters);

        if (priority && priority !== "all") {

    // Formatear todos para frontend      query += " AND priority = ?";

    const formattedTodos = todos.map(todo => ({      params.push(priority);

      ...todo,    }

      tags: todo.tags ? (typeof todo.tags === 'string' ? JSON.parse(todo.tags) : todo.tags) : [],

      completed: Boolean(todo.completed)    if (search) {

    }));      query += " AND (title LIKE ? OR description LIKE ?)";

      params.push(`%${search}%`, `%${search}%`);

    return res.status(200).json({ success: true, data: formattedTodos });    }

  } catch (error) {

    console.error('Get todos error:', error);    if (status === "completed") {

    throw error;      query += " AND completed = 1";

  }    } else if (status === "pending") {

}      query += " AND completed = 0";

    } else if (status === "overdue") {

function handleCreateTodo(req, res, db, userId) {      query += " AND completed = 0 AND due_date IS NOT NULL AND due_date < ?";

  try {      params.push(new Date().toISOString());

    const { title, description, priority = 'medium', category = 'personal', tags = [], due_date } = req.body;    }



    if (!title?.trim()) {    query += " ORDER BY created_at DESC";

      return res.status(400).json({ success: false, message: 'Title is required' });

    }    const todos = db.prepare(query).all(params);



    const todoId = uuidv4();    // Parsear tags JSON

    const now = new Date().toISOString();    const formattedTodos = todos.map(todo => ({

      ...todo,

    const todoData = {      tags: todo.tags ? JSON.parse(todo.tags) : [],

      id: todoId,      completed: Boolean(todo.completed),

      user_id: userId,    }));

      title: title.trim(),

      description: description || null,    return res.status(200).json(createResponse(200, formattedTodos));

      priority,  } catch (error) {

      category,    console.error("Get todos error:", error);

      tags: JSON.stringify(tags),    throw error;

      due_date: due_date || null,  }

      completed: false,}

      created_at: now,

      updated_at: now,function handleCreateTodo(req, res, db, userId) {

      deleted_at: null  try {

    };    const {

      title,

    db.createTodo(todoData);      description,

      priority = "medium",

    const responseData = {      category = "personal",

      ...todoData,      tags = [],

      tags: tags,      due_date,

      completed: false    } = req.body;

    };

    if (!title?.trim()) {

    return res.status(201).json({       return res

      success: true,         .status(400)

      data: responseData,         .json(createErrorResponse(400, "Title is required"));

      message: 'Todo created successfully'     }

    });

  } catch (error) {    const todoId = uuidv4();

    console.error('Create todo error:', error);    const now = new Date().toISOString();

    throw error;

  }    const stmt = db.prepare(`

}      INSERT INTO todos (
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
