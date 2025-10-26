// Base de datos en memoria para demo (en producción usar PostgreSQL, MySQL, etc.)
let users = [];
let todos = [];

function getInMemoryDatabase() {
  return {
    // Funciones para usuarios
    getUserByEmail: email => {
      return users.find(user => user.email === email);
    },

    getUserById: id => {
      return users.find(user => user.id === id);
    },

    createUser: userData => {
      users.push(userData);
      return userData;
    },

    // Funciones para todos
    getTodosByUserId: (userId, filters = {}) => {
      let userTodos = todos.filter(
        todo => todo.user_id === userId && !todo.deleted_at
      );

      // Aplicar filtros
      if (filters.category && filters.category !== "all") {
        userTodos = userTodos.filter(
          todo => todo.category === filters.category
        );
      }

      if (filters.priority && filters.priority !== "all") {
        userTodos = userTodos.filter(
          todo => todo.priority === filters.priority
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
      }

      if (filters.status === "completed") {
        userTodos = userTodos.filter(todo => todo.completed);
      } else if (filters.status === "pending") {
        userTodos = userTodos.filter(todo => !todo.completed);
      } else if (filters.status === "overdue") {
        const now = new Date().toISOString();
        userTodos = userTodos.filter(
          todo => !todo.completed && todo.due_date && todo.due_date < now
        );
      }

      return userTodos.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    },

    createTodo: todoData => {
      todos.push(todoData);
      return todoData;
    },

    updateTodo: (todoId, userId, updates) => {
      const todoIndex = todos.findIndex(
        todo =>
          todo.id === todoId && todo.user_id === userId && !todo.deleted_at
      );
      if (todoIndex === -1) return null;

      todos[todoIndex] = {
        ...todos[todoIndex],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      return todos[todoIndex];
    },

    deleteTodo: (todoId, userId) => {
      const todoIndex = todos.findIndex(
        todo =>
          todo.id === todoId && todo.user_id === userId && !todo.deleted_at
      );
      if (todoIndex === -1) return false;

      todos[todoIndex].deleted_at = new Date().toISOString();
      return true;
    },

    getStats: userId => {
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

      return {
        total,
        completed,
        pending: total - completed,
        overdue,
        byPriority,
        byCategory,
      };
    },
  };
}

module.exports = {
  getInMemoryDatabase,
};
