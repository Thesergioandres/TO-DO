const { v4: uuidv4 } = require("uuid");

// Base de datos en memoria mejorada para Vercel serverless
let database = {
  users: [],
  todos: [],
  sessions: [], // Para futuras funcionalidades de sesión
};

// Utilidades para logging
function logOperation(operation, details) {
  console.log(`[MEMORY DB] ${operation}:`, details);
}

// ============================================
// FUNCIONES DE USUARIO
// ============================================

function createUser(userData) {
  logOperation("CREATE_USER", { email: userData.email });

  const user = {
    id: userData.id || uuidv4(),
    name: userData.name.trim(),
    email: userData.email.toLowerCase().trim(),
    password: userData.password,
    created_at: userData.created_at || new Date().toISOString(),
    updated_at: userData.updated_at || new Date().toISOString(),
  };

  database.users.push(user);
  logOperation("USER_CREATED", { id: user.id, email: user.email });
  return user;
}

function getUserByEmail(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = database.users.find((u) => u.email === normalizedEmail);
  logOperation("GET_USER_BY_EMAIL", {
    email: normalizedEmail,
    found: !!user,
    userId: user?.id,
  });
  return user;
}

function getUserById(userId) {
  const user = database.users.find((u) => u.id === userId);
  logOperation("GET_USER_BY_ID", {
    userId,
    found: !!user,
    email: user?.email,
  });
  return user;
}

function updateUser(userId, updateData) {
  const userIndex = database.users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    logOperation("UPDATE_USER_FAILED", { userId, reason: "User not found" });
    return null;
  }

  const updatedUser = {
    ...database.users[userIndex],
    ...updateData,
    updated_at: new Date().toISOString(),
  };

  database.users[userIndex] = updatedUser;
  logOperation("USER_UPDATED", { userId, fields: Object.keys(updateData) });
  return updatedUser;
}

function getAllUsers() {
  logOperation("GET_ALL_USERS", { count: database.users.length });
  return database.users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at,
    updated_at: user.updated_at,
  }));
}

// ============================================
// FUNCIONES DE TODO
// ============================================

function createTodo(todoData) {
  const todo = {
    id: todoData.id || uuidv4(),
    user_id: todoData.userId || todoData.user_id,
    title: todoData.title.trim(),
    description: todoData.description || null,
    priority: todoData.priority || "medium",
    category: todoData.category || "personal",
    tags:
      typeof todoData.tags === "string"
        ? todoData.tags
        : JSON.stringify(todoData.tags || []),
    due_date: todoData.due_date || todoData.dueDate || null,
    completed: Boolean(todoData.completed),
    created_at: todoData.created_at || new Date().toISOString(),
    updated_at: todoData.updated_at || new Date().toISOString(),
    deleted_at: null,
  };

  database.todos.push(todo);
  logOperation("TODO_CREATED", {
    id: todo.id,
    userId: todo.user_id,
    title: todo.title,
    priority: todo.priority,
    category: todo.category,
  });
  return todo;
}

function getTodoById(todoId) {
  const todo = database.todos.find((t) => t.id === todoId && !t.deleted_at);
  logOperation("GET_TODO_BY_ID", {
    todoId,
    found: !!todo,
    userId: todo?.user_id,
  });
  return todo;
}

function getTodosByUserId(userId, filters = {}) {
  let todos = database.todos.filter(
    (t) => t.user_id === userId && !t.deleted_at
  );

  // Aplicar filtros básicos (mantenemos compatibilidad)
  if (filters.category && filters.category !== "all") {
    todos = todos.filter((t) => t.category === filters.category);
  }

  if (filters.priority && filters.priority !== "all") {
    todos = todos.filter((t) => t.priority === filters.priority);
  }

  if (filters.status === "completed") {
    todos = todos.filter((t) => t.completed);
  } else if (filters.status === "pending") {
    todos = todos.filter((t) => !t.completed);
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    todos = todos.filter(
      (t) =>
        t.title.toLowerCase().includes(searchLower) ||
        (t.description && t.description.toLowerCase().includes(searchLower))
    );
  }

  logOperation("GET_TODOS_BY_USER", {
    userId,
    totalFound: todos.length,
    filters: Object.keys(filters).length > 0 ? filters : "none",
  });

  return todos;
}

function updateTodo(todoId, updateData) {
  const todoIndex = database.todos.findIndex(
    (t) => t.id === todoId && !t.deleted_at
  );
  if (todoIndex === -1) {
    logOperation("UPDATE_TODO_FAILED", { todoId, reason: "Todo not found" });
    return null;
  }

  const updatedTodo = {
    ...database.todos[todoIndex],
    ...updateData,
    updated_at: new Date().toISOString(),
  };

  database.todos[todoIndex] = updatedTodo;
  logOperation("TODO_UPDATED", {
    todoId,
    userId: updatedTodo.user_id,
    fields: Object.keys(updateData),
    completed: updatedTodo.completed,
  });
  return updatedTodo;
}

function deleteTodo(todoId) {
  const todoIndex = database.todos.findIndex(
    (t) => t.id === todoId && !t.deleted_at
  );
  if (todoIndex === -1) {
    logOperation("DELETE_TODO_FAILED", { todoId, reason: "Todo not found" });
    return false;
  }

  const todo = database.todos[todoIndex];

  // Soft delete: marcar como eliminado en lugar de eliminar físicamente
  database.todos[todoIndex] = {
    ...todo,
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  logOperation("TODO_DELETED", {
    todoId,
    userId: todo.user_id,
    title: todo.title,
  });
  return true;
}

function hardDeleteTodo(todoId) {
  const todoIndex = database.todos.findIndex((t) => t.id === todoId);
  if (todoIndex === -1) {
    logOperation("HARD_DELETE_TODO_FAILED", {
      todoId,
      reason: "Todo not found",
    });
    return false;
  }

  const todo = database.todos[todoIndex];
  database.todos.splice(todoIndex, 1);

  logOperation("TODO_HARD_DELETED", {
    todoId,
    userId: todo.user_id,
    title: todo.title,
  });
  return true;
}

// ============================================
// FUNCIONES DE ESTADÍSTICAS Y UTILIDADES
// ============================================

function getUserStatistics(userId) {
  const userTodos = getTodosByUserId(userId);
  const completed = userTodos.filter((t) => t.completed).length;
  const pending = userTodos.length - completed;

  const stats = {
    totalTodos: userTodos.length,
    completedTodos: completed,
    pendingTodos: pending,
    completionRate:
      userTodos.length > 0
        ? Math.round((completed / userTodos.length) * 100)
        : 0,
    todosByPriority: {
      urgent: userTodos.filter((t) => t.priority === "urgent").length,
      high: userTodos.filter((t) => t.priority === "high").length,
      medium: userTodos.filter((t) => t.priority === "medium").length,
      low: userTodos.filter((t) => t.priority === "low").length,
    },
    todosByCategory: {
      personal: userTodos.filter((t) => t.category === "personal").length,
      work: userTodos.filter((t) => t.category === "work").length,
      shopping: userTodos.filter((t) => t.category === "shopping").length,
      health: userTodos.filter((t) => t.category === "health").length,
      finance: userTodos.filter((t) => t.category === "finance").length,
      education: userTodos.filter((t) => t.category === "education").length,
    },
  };

  logOperation("GET_USER_STATISTICS", {
    userId,
    totalTodos: stats.totalTodos,
    completionRate: stats.completionRate,
  });

  return stats;
}

function getDatabaseStatistics() {
  const activeUsers = database.users.length;
  const activeTodos = database.todos.filter((t) => !t.deleted_at).length;
  const deletedTodos = database.todos.filter((t) => t.deleted_at).length;
  const completedTodos = database.todos.filter(
    (t) => t.completed && !t.deleted_at
  ).length;

  const stats = {
    users: {
      total: activeUsers,
      withTodos: database.users.filter((u) =>
        database.todos.some((t) => t.user_id === u.id && !t.deleted_at)
      ).length,
    },
    todos: {
      active: activeTodos,
      completed: completedTodos,
      pending: activeTodos - completedTodos,
      deleted: deletedTodos,
      total: activeTodos + deletedTodos,
    },
    performance: {
      memoryUsage: JSON.stringify(database).length,
      lastUpdate: new Date().toISOString(),
    },
  };

  logOperation("GET_DATABASE_STATISTICS", stats);
  return stats;
}

// ============================================
// FUNCIONES DE ADMINISTRACIÓN
// ============================================

function cleanupDeletedTodos(olderThanDays = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const initialCount = database.todos.length;
  database.todos = database.todos.filter((todo) => {
    if (!todo.deleted_at) return true;
    return new Date(todo.deleted_at) > cutoffDate;
  });

  const removedCount = initialCount - database.todos.length;
  logOperation("CLEANUP_DELETED_TODOS", {
    removedCount,
    olderThanDays,
    remainingTodos: database.todos.length,
  });

  return removedCount;
}

function resetDatabase() {
  const previousStats = getDatabaseStatistics();
  database = {
    users: [],
    todos: [],
    sessions: [],
  };

  logOperation("DATABASE_RESET", {
    previousUsers: previousStats.users.total,
    previousTodos: previousStats.todos.total,
  });

  return true;
}

function exportDatabase() {
  const exportData = {
    ...database,
    exportInfo: {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      stats: getDatabaseStatistics(),
    },
  };

  logOperation("DATABASE_EXPORTED", {
    users: database.users.length,
    todos: database.todos.length,
  });

  return exportData;
}

function importDatabase(importData) {
  if (!importData || !importData.users || !importData.todos) {
    logOperation("DATABASE_IMPORT_FAILED", {
      reason: "Invalid import data structure",
    });
    throw new Error("Invalid import data structure");
  }

  const previousStats = getDatabaseStatistics();

  database = {
    users: importData.users || [],
    todos: importData.todos || [],
    sessions: importData.sessions || [],
  };

  const newStats = getDatabaseStatistics();
  logOperation("DATABASE_IMPORTED", {
    previousUsers: previousStats.users.total,
    newUsers: newStats.users.total,
    previousTodos: previousStats.todos.total,
    newTodos: newStats.todos.total,
  });

  return newStats;
}

// ============================================
// INTERFAZ PRINCIPAL
// ============================================

function getInMemoryDatabase() {
  return {
    // Funciones de usuario
    createUser,
    getUserByEmail,
    getUserById,
    updateUser,
    getAllUsers,

    // Funciones de TODO
    createTodo,
    getTodoById,
    getTodosByUserId,
    updateTodo,
    deleteTodo,
    hardDeleteTodo,

    // Funciones de estadísticas
    getUserStatistics,
    getDatabaseStatistics,

    // Funciones de administración
    cleanupDeletedTodos,
    resetDatabase,
    exportDatabase,
    importDatabase,

    // Acceso directo a datos (solo para debugging)
    _getRawData: () => ({ ...database }),
  };
}

module.exports = {
  getInMemoryDatabase,
};
