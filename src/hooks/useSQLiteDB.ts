import { useCallback, useEffect, useState } from "react";
import initSqlJs, { type Database, type SqlValue } from "sql.js";
import type { CreateTodoData, Todo, UpdateTodoData } from "../types/todo";

const DB_NAME = "todos.db";

interface TodoRow {
  id: number;
  title: string;
  description: string | null;
  completed: number;
  priority: string;
  category: string;
  due_date: string | null;
  tags: string;
  created_at: string;
  updated_at: string;
}

interface CompletedRow {
  completed: number;
}

export const useSQLiteDB = () => {
  const [db, setDb] = useState<Database | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inicializar la base de datos
  useEffect(() => {
    const initDB = async () => {
      try {
        setIsLoading(true);

        // Cargar sql.js
        const SQL = await initSqlJs({
          locateFile: file => `https://sql.js.org/dist/${file}`,
        });

        // Intentar cargar la base de datos existente del localStorage
        const savedDB = localStorage.getItem(DB_NAME);
        let database: Database;

        if (savedDB) {
          // Cargar base de datos existente
          const uInt8Array = new Uint8Array(JSON.parse(savedDB));
          database = new SQL.Database(uInt8Array);
        } else {
          // Crear nueva base de datos
          database = new SQL.Database();

          // Crear tabla de todos
          database.run(`
            CREATE TABLE IF NOT EXISTS todos (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              title TEXT NOT NULL,
              description TEXT,
              completed BOOLEAN NOT NULL DEFAULT 0,
              priority TEXT NOT NULL DEFAULT 'medium',
              category TEXT NOT NULL DEFAULT 'personal',
              due_date DATETIME,
              tags TEXT DEFAULT '[]',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);
        }

        setDb(database);
        setError(null);
      } catch (err) {
        setError(`Error al inicializar la base de datos: ${err}`);
        console.error("Error initializing database:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initDB();
  }, []);

  // Guardar la base de datos en localStorage
  const saveDB = useCallback(() => {
    if (db) {
      const data = db.export();
      localStorage.setItem(DB_NAME, JSON.stringify(Array.from(data)));
    }
  }, [db]);

  // Obtener todos los todos
  const getTodos = useCallback((): Todo[] => {
    if (!db) return [];

    try {
      const stmt = db.prepare("SELECT * FROM todos ORDER BY created_at DESC");
      const rows: Todo[] = [];

      while (stmt.step()) {
        const row = stmt.getAsObject() as unknown as TodoRow;
        rows.push({
          id: row.id,
          title: row.title,
          description: row.description || undefined,
          completed: Boolean(row.completed),
          priority: row.priority as "low" | "medium" | "high",
          category: row.category,
          due_date: row.due_date || undefined,
          tags: JSON.parse(row.tags || "[]"),
          created_at: row.created_at,
          updated_at: row.updated_at,
        });
      }

      stmt.free();
      return rows;
    } catch (err) {
      console.error("Error getting todos:", err);
      return [];
    }
  }, [db]);

  // Crear un nuevo todo
  const createTodo = useCallback(
    (data: CreateTodoData): boolean => {
      if (!db) return false;

      try {
        const now = new Date().toISOString();
        db.run(
          "INSERT INTO todos (title, description, priority, category, due_date, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [
            data.title,
            data.description || null,
            data.priority || "medium",
            data.category || "personal",
            data.due_date || null,
            JSON.stringify(data.tags || []),
            now,
            now,
          ]
        );
        saveDB();
        return true;
      } catch (err) {
        console.error("Error creating todo:", err);
        return false;
      }
    },
    [db, saveDB]
  );

  // Actualizar un todo
  const updateTodo = useCallback(
    (id: number, data: UpdateTodoData): boolean => {
      if (!db) return false;

      try {
        const now = new Date().toISOString();
        const updates: string[] = [];
        const values: SqlValue[] = [];

        if (data.title !== undefined) {
          updates.push("title = ?");
          values.push(data.title);
        }
        if (data.description !== undefined) {
          updates.push("description = ?");
          values.push(data.description);
        }
        if (data.completed !== undefined) {
          updates.push("completed = ?");
          values.push(data.completed ? 1 : 0);
        }
        if (data.priority !== undefined) {
          updates.push("priority = ?");
          values.push(data.priority);
        }
        if (data.category !== undefined) {
          updates.push("category = ?");
          values.push(data.category);
        }
        if (data.due_date !== undefined) {
          updates.push("due_date = ?");
          values.push(data.due_date);
        }
        if (data.tags !== undefined) {
          updates.push("tags = ?");
          values.push(JSON.stringify(data.tags));
        }
        if (updates.length === 0) return false;

        updates.push("updated_at = ?");
        values.push(now);
        values.push(id);

        db.run(`UPDATE todos SET ${updates.join(", ")} WHERE id = ?`, values);
        saveDB();
        return true;
      } catch (err) {
        console.error("Error updating todo:", err);
        return false;
      }
    },
    [db, saveDB]
  );

  // Eliminar un todo
  const deleteTodo = useCallback(
    (id: number): boolean => {
      if (!db) return false;

      try {
        db.run("DELETE FROM todos WHERE id = ?", [id]);
        saveDB();
        return true;
      } catch (err) {
        console.error("Error deleting todo:", err);
        return false;
      }
    },
    [db, saveDB]
  );

  // Alternar el estado completado de un todo
  const toggleTodo = useCallback(
    (id: number): boolean => {
      if (!db) return false;

      try {
        const todo = db
          .prepare("SELECT completed FROM todos WHERE id = ?")
          .get([id]) as unknown as CompletedRow | undefined;
        if (!todo) return false;

        const newCompleted = !todo.completed;
        return updateTodo(id, { completed: newCompleted });
      } catch (err) {
        console.error("Error toggling todo:", err);
        return false;
      }
    },
    [db, updateTodo]
  );

  // Buscar todos con filtros avanzados
  const searchTodos = useCallback(
    (filters: {
      search?: string;
      category?: string;
      priority?: string;
      status?: "all" | "pending" | "completed" | "overdue";
      tags?: string[];
    }): Todo[] => {
      if (!db) return [];

      try {
        let query = "SELECT * FROM todos WHERE 1=1";
        const params: SqlValue[] = [];

        if (filters.search) {
          query += " AND (title LIKE ? OR description LIKE ?)";
          const searchTerm = `%${filters.search}%`;
          params.push(searchTerm, searchTerm);
        }

        if (filters.category) {
          query += " AND category = ?";
          params.push(filters.category);
        }

        if (filters.priority) {
          query += " AND priority = ?";
          params.push(filters.priority);
        }

        if (filters.status) {
          if (filters.status === "pending") {
            query += " AND completed = 0";
          } else if (filters.status === "completed") {
            query += " AND completed = 1";
          } else if (filters.status === "overdue") {
            query +=
              " AND completed = 0 AND due_date IS NOT NULL AND due_date < ?";
            params.push(new Date().toISOString());
          }
        }

        if (filters.tags && filters.tags.length > 0) {
          const tagConditions = filters.tags
            .map(() => "tags LIKE ?")
            .join(" AND ");
          query += ` AND (${tagConditions})`;
          filters.tags.forEach(tag => {
            params.push(`%"${tag}"%`);
          });
        }

        query += " ORDER BY created_at DESC";

        const stmt = db.prepare(query);
        const rows: Todo[] = [];

        stmt.bind(params);
        while (stmt.step()) {
          const row = stmt.getAsObject() as unknown as TodoRow;
          rows.push({
            id: row.id,
            title: row.title,
            description: row.description || undefined,
            completed: Boolean(row.completed),
            priority: row.priority as "low" | "medium" | "high",
            category: row.category,
            due_date: row.due_date || undefined,
            tags: JSON.parse(row.tags || "[]"),
            created_at: row.created_at,
            updated_at: row.updated_at,
          });
        }

        stmt.free();
        return rows;
      } catch (err) {
        console.error("Error searching todos:", err);
        return [];
      }
    },
    [db]
  );

  // Obtener estadísticas
  const getStats = useCallback(() => {
    if (!db) return null;

    try {
      // Estadísticas básicas
      const totalStmt = db.prepare("SELECT COUNT(*) as count FROM todos");
      const completedStmt = db.prepare(
        "SELECT COUNT(*) as count FROM todos WHERE completed = 1"
      );
      const overdueStmt = db.prepare(
        "SELECT COUNT(*) as count FROM todos WHERE completed = 0 AND due_date IS NOT NULL AND due_date < ?"
      );

      const total = (totalStmt.get([]) as unknown as { count: number }).count;
      const completed = (completedStmt.get([]) as unknown as { count: number })
        .count;
      const overdue = (
        overdueStmt.get([new Date().toISOString()]) as unknown as {
          count: number;
        }
      ).count;

      // Estadísticas por prioridad
      const priorityStmt = db.prepare(
        "SELECT priority, COUNT(*) as count FROM todos WHERE completed = 0 GROUP BY priority"
      );
      const priorityStats = { urgent: 0, high: 0, medium: 0, low: 0 };

      priorityStmt.bind([]);
      while (priorityStmt.step()) {
        const row = priorityStmt.getAsObject() as {
          priority: string;
          count: number;
        };
        if (row.priority in priorityStats) {
          priorityStats[row.priority as keyof typeof priorityStats] = row.count;
        }
      }

      // Estadísticas por categoría
      const categoryStmt = db.prepare(
        "SELECT category, COUNT(*) as count FROM todos GROUP BY category"
      );
      const categoryStats: Record<string, number> = {};

      categoryStmt.bind([]);
      while (categoryStmt.step()) {
        const row = categoryStmt.getAsObject() as {
          category: string;
          count: number;
        };
        categoryStats[row.category] = row.count;
      }

      totalStmt.free();
      completedStmt.free();
      overdueStmt.free();
      priorityStmt.free();
      categoryStmt.free();

      return {
        total,
        completed,
        pending: total - completed,
        overdue,
        byPriority: priorityStats,
        byCategory: categoryStats,
      };
    } catch (err) {
      console.error("Error getting stats:", err);
      return null;
    }
  }, [db]);

  // Exportar datos
  const exportData = useCallback(() => {
    const todos = getTodos();
    return {
      todos,
      exportDate: new Date().toISOString(),
      version: "1.0",
    };
  }, [getTodos]);

  // Importar datos
  const importData = useCallback(
    (data: { todos: Todo[] }) => {
      if (!db) return false;

      try {
        // Limpiar tabla existente
        db.run("DELETE FROM todos");

        // Insertar nuevos datos
        data.todos.forEach(todo => {
          db.run(
            "INSERT INTO todos (title, description, completed, priority, category, due_date, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
              todo.title,
              todo.description || null,
              todo.completed ? 1 : 0,
              todo.priority,
              todo.category,
              todo.due_date || null,
              JSON.stringify(todo.tags),
              todo.created_at,
              todo.updated_at,
            ]
          );
        });

        saveDB();
        return true;
      } catch (err) {
        console.error("Error importing data:", err);
        return false;
      }
    },
    [db, saveDB]
  );

  return {
    isLoading,
    error,
    getTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    searchTodos,
    getStats,
    exportData,
    importData,
  };
};
