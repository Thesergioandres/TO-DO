// Base de datos en memoria para demo (en producción usar PostgreSQL, MySQL, etc.)
let users = [];
let todos = [];

function getInMemoryDatabase() {
  console.log("[MEMORY DB] Getting database instance");
  console.log(
    "[MEMORY DB] Current state - Users:",
    users.length,
    "Todos:",
    todos.length
  );

  return {
    // Funciones para usuarios
    getUserByEmail: email => {
      console.log("[MEMORY DB] Looking up user by email:", email);
      const user = users.find(user => user.email === email);
      console.log("[MEMORY DB] User found:", !!user);
      return user;
    },

    getUserById: id => {
      console.log("[MEMORY DB] Looking up user by ID:", id);
      const user = users.find(user => user.id === id);
      console.log("[MEMORY DB] User found:", !!user);
      return user;
    },

    createUser: userData => {
      console.log("[MEMORY DB] Creating new user:", userData.email);
      users.push(userData);
      console.log("[MEMORY DB] User created. Total users:", users.length);
      return userData;
    },

    // Funciones para todos
    getTodosByUserId: (userId, filters = {}) => {
      console.log("[MEMORY DB] Getting todos for user:", userId);
      console.log("[MEMORY DB] Applied filters:", filters);

      let userTodos = todos.filter(
        todo => todo.user_id === userId && !todo.deleted_at
      );
      console.log(
        "[MEMORY DB] Found",
        userTodos.length,
        "todos for user before filtering"
      );

      // Aplicar filtros
      if (filters.category && filters.category !== "all") {
        userTodos = userTodos.filter(
          todo => todo.category === filters.category
        );
        console.log(
          "[MEMORY DB] After category filter:",
          userTodos.length,
          "todos"
        );
      }

      if (filters.priority && filters.priority !== "all") {
        userTodos = userTodos.filter(
          todo => todo.priority === filters.priority
        );
        console.log(
          "[MEMORY DB] After priority filter:",
          userTodos.length,
          "todos"
        );
      }

      if (filters.search) {
        userTodos = userTodos.filter(
          todo =>
            todo.title.toLowerCase().includes(filters.search.toLowerCase()) ||
            (todo.description &&
              todo.description
                .toLowerCase()
                .includes(filters.search.toLowerCase()))
        );
        console.log(
          "[MEMORY DB] After search filter:",
          userTodos.length,
          "todos"
        );
      }

      if (filters.status === "completed") {
        userTodos = userTodos.filter(todo => todo.completed);
        console.log(
          "[MEMORY DB] After completed filter:",
          userTodos.length,
          "todos"
        );
      } else if (filters.status === "pending") {
        userTodos = userTodos.filter(todo => !todo.completed);
        console.log(
          "[MEMORY DB] After pending filter:",
          userTodos.length,
          "todos"
        );
      } else if (filters.status === "overdue") {
        const now = new Date().toISOString();
        userTodos = userTodos.filter(
          todo => !todo.completed && todo.due_date && todo.due_date < now
        );
        console.log(
          "[MEMORY DB] After overdue filter:",
          userTodos.length,
          "todos"
        );
      }

      const sortedTodos = userTodos.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      console.log("[MEMORY DB] Returning", sortedTodos.length, "sorted todos");
      return sortedTodos;
    },

    createTodo: todoData => {
      console.log("[MEMORY DB] Creating new todo for user:", todoData.user_id);
      console.log("[MEMORY DB] Todo data:", {
        id: todoData.id,
        title: todoData.title,
      });
      todos.push(todoData);
      console.log("[MEMORY DB] Todo created. Total todos:", todos.length);
      return todoData;
    },

    updateTodo: (todoId, userId, updates) => {
      console.log("[MEMORY DB] Updating todo:", todoId, "for user:", userId);
      const todoIndex = todos.findIndex(
        todo =>
          todo.id === todoId && todo.user_id === userId && !todo.deleted_at
      );
      if (todoIndex === -1) {
        console.warn("[MEMORY DB] Todo not found for update:", todoId);
        return null;
      }

      todos[todoIndex] = {
        ...todos[todoIndex],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      console.log("[MEMORY DB] Todo updated successfully");
      return todos[todoIndex];
    },

    deleteTodo: (todoId, userId) => {
      console.log("[MEMORY DB] Deleting todo:", todoId, "for user:", userId);
      const todoIndex = todos.findIndex(
        todo =>
          todo.id === todoId && todo.user_id === userId && !todo.deleted_at
      );
      if (todoIndex === -1) {
        console.warn("[MEMORY DB] Todo not found for deletion:", todoId);
        return false;
      }

      todos[todoIndex].deleted_at = new Date().toISOString();
      console.log("[MEMORY DB] Todo deleted successfully");
      return true;
    },

    getStats: userId => {
      console.log("[MEMORY DB] Getting stats for user:", userId);
      const userTodos = todos.filter(
        todo => todo.user_id === userId && !todo.deleted_at
      );
      const total = userTodos.length;
      const completed = userTodos.filter(todo => todo.completed).length;
      const now = new Date().toISOString();
      const overdue = userTodos.filter(
        todo => !todo.completed && todo.due_date && todo.due_date < now
      ).length;

      // Estadísticas por prioridad
      const byPriority = { urgent: 0, high: 0, medium: 0, low: 0 };
      userTodos
        .filter(todo => !todo.completed)
        .forEach(todo => {
          if (byPriority.hasOwnProperty(todo.priority)) {
            byPriority[todo.priority]++;
          }
        });

      // Estadísticas por categoría
      const byCategory = {};
      userTodos.forEach(todo => {
        byCategory[todo.category] = (byCategory[todo.category] || 0) + 1;
      });

      const stats = {
        total,
        completed,
        pending: total - completed,
        overdue,
        byPriority,
        byCategory,
      };
      console.log("[MEMORY DB] Stats generated:", stats);
      return stats;
    },
  };
}

module.exports = {
  getInMemoryDatabase,
};
