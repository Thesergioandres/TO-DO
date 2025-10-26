import {
  Check,
  CheckCircle,
  Circle,
  Edit3,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useSQLiteDB } from "../hooks";
import type { CreateTodoData, Todo } from "../types/todo";

const TodoApp: React.FC = () => {
  const {
    isLoading,
    error,
    getTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
  } = useSQLiteDB();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState<CreateTodoData>({
    title: "",
    description: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<CreateTodoData>({
    title: "",
    description: "",
  });
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  // Cargar todos al inicializar
  useEffect(() => {
    if (!isLoading && !error) {
      setTodos(getTodos());
    }
  }, [isLoading, error, getTodos]);

  // Actualizar lista después de operaciones
  const refreshTodos = () => {
    setTodos(getTodos());
  };

  // Crear nuevo todo
  const handleCreateTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.title.trim()) return;

    if (createTodo(newTodo)) {
      setNewTodo({ title: "", description: "" });
      refreshTodos();
    }
  };

  // Iniciar edición
  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditingData({ title: todo.title, description: todo.description || "" });
  };

  // Guardar edición
  const saveEdit = () => {
    if (editingId && editingData.title.trim()) {
      if (updateTodo(editingId, editingData)) {
        setEditingId(null);
        setEditingData({ title: "", description: "" });
        refreshTodos();
      }
    }
  };

  // Cancelar edición
  const cancelEdit = () => {
    setEditingId(null);
    setEditingData({ title: "", description: "" });
  };

  // Eliminar todo
  const handleDeleteTodo = (id: number) => {
    if (deleteTodo(id)) {
      refreshTodos();
    }
  };

  // Alternar completado
  const handleToggleTodo = (id: number) => {
    if (toggleTodo(id)) {
      refreshTodos();
    }
  };

  // Filtrar todos
  const filteredTodos = todos.filter(todo => {
    if (filter === "pending") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  // Estadísticas
  const totalTodos = todos.length;
  const completedTodos = todos.filter(todo => todo.completed).length;
  const pendingTodos = totalTodos - completedTodos;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Cargando base de datos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-md">
          <div className="mb-4 text-5xl text-red-500">⚠️</div>
          <h2 className="mb-2 text-xl font-semibold text-gray-800">
            Error de Base de Datos
          </h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-800">📝 Todo App</h1>
          <p className="text-gray-600">
            Gestión de tareas con SQLite + React + TailwindCSS
          </p>
        </div>

        {/* Estadísticas */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-4 text-center shadow-md">
            <div className="text-2xl font-bold text-blue-600">{totalTodos}</div>
            <div className="text-gray-600">Total</div>
          </div>
          <div className="rounded-lg bg-white p-4 text-center shadow-md">
            <div className="text-2xl font-bold text-yellow-600">
              {pendingTodos}
            </div>
            <div className="text-gray-600">Pendientes</div>
          </div>
          <div className="rounded-lg bg-white p-4 text-center shadow-md">
            <div className="text-2xl font-bold text-green-600">
              {completedTodos}
            </div>
            <div className="text-gray-600">Completadas</div>
          </div>
        </div>

        {/* Formulario de nueva tarea */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">
            ➕ Nueva Tarea
          </h2>
          <form onSubmit={handleCreateTodo} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Título de la tarea..."
                value={newTodo.title}
                onChange={e =>
                  setNewTodo({ ...newTodo, title: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <textarea
                placeholder="Descripción (opcional)..."
                value={newTodo.description}
                onChange={e =>
                  setNewTodo({ ...newTodo, description: e.target.value })
                }
                className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              <Plus size={20} />
              Agregar Tarea
            </button>
          </form>
        </div>

        {/* Filtros */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow-md">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-lg px-4 py-2 transition-colors ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Todas ({totalTodos})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`rounded-lg px-4 py-2 transition-colors ${
                filter === "pending"
                  ? "bg-yellow-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Pendientes ({pendingTodos})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`rounded-lg px-4 py-2 transition-colors ${
                filter === "completed"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Completadas ({completedTodos})
            </button>
          </div>
        </div>

        {/* Lista de tareas */}
        <div className="space-y-4">
          {filteredTodos.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center shadow-md">
              <div className="mb-4 text-6xl text-gray-400">📝</div>
              <h3 className="mb-2 text-xl font-semibold text-gray-600">
                No hay tareas{" "}
                {filter === "all"
                  ? ""
                  : filter === "pending"
                    ? "pendientes"
                    : "completadas"}
              </h3>
              <p className="text-gray-500">
                {filter === "all"
                  ? "¡Agrega tu primera tarea!"
                  : filter === "pending"
                    ? "¡Todas las tareas están completadas!"
                    : "No tienes tareas completadas aún."}
              </p>
            </div>
          ) : (
            filteredTodos.map(todo => (
              <div
                key={todo.id}
                className={`rounded-lg bg-white p-6 shadow-md transition-all ${
                  todo.completed ? "opacity-75" : ""
                }`}
              >
                {editingId === todo.id ? (
                  /* Modo edición */
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editingData.title}
                      onChange={e =>
                        setEditingData({
                          ...editingData,
                          title: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                    <textarea
                      value={editingData.description}
                      onChange={e =>
                        setEditingData({
                          ...editingData,
                          description: e.target.value,
                        })
                      }
                      className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
                      >
                        <Check size={16} />
                        Guardar
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-2 rounded-lg bg-gray-500 px-4 py-2 text-white transition-colors hover:bg-gray-600"
                      >
                        <X size={16} />
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Modo visualización */
                  <div>
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => handleToggleTodo(todo.id)}
                        className={`mt-1 transition-colors ${
                          todo.completed
                            ? "text-green-600"
                            : "text-gray-400 hover:text-blue-600"
                        }`}
                      >
                        {todo.completed ? (
                          <CheckCircle size={24} />
                        ) : (
                          <Circle size={24} />
                        )}
                      </button>

                      <div className="flex-1">
                        <h3
                          className={`text-lg font-semibold ${
                            todo.completed
                              ? "text-gray-500 line-through"
                              : "text-gray-800"
                          }`}
                        >
                          {todo.title}
                        </h3>
                        {todo.description && (
                          <p
                            className={`mt-2 ${
                              todo.completed
                                ? "text-gray-400 line-through"
                                : "text-gray-600"
                            }`}
                          >
                            {todo.description}
                          </p>
                        )}
                        <div className="mt-3 text-sm text-gray-500">
                          <span>
                            Creada:{" "}
                            {new Date(todo.created_at).toLocaleDateString(
                              "es-ES"
                            )}
                          </span>
                          {todo.updated_at !== todo.created_at && (
                            <span className="ml-4">
                              Actualizada:{" "}
                              {new Date(todo.updated_at).toLocaleDateString(
                                "es-ES"
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditing(todo)}
                          className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                          title="Editar"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500">
          <p>Hecho con ❤️ usando React, TailwindCSS y SQLite</p>
        </div>
      </div>
    </div>
  );
};

export default TodoApp;
