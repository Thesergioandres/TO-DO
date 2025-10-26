import {
  Bell,
  BellOff,
  Download,
  Menu,
  Settings,
  Upload,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSQLiteDB } from "../hooks";
import { useAppStore } from "../stores/appStore";
import type {
  CreateTodoData,
  Todo,
  TodoFilters,
  UpdateTodoData,
} from "../types/todo";
import {
  SearchBar,
  StatsOverview,
  ThemeSelector,
  TodoForm,
  TodoItem,
} from "./";

const TodoApp: React.FC = () => {
  const {
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
  } = useSQLiteDB();

  // Estado global
  const filters = useAppStore(state => state.filters);
  const setFilters = useAppStore(state => state.setFilters);
  const resetFilters = useAppStore(state => state.resetFilters);
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);
  const isDarkMode = useAppStore(state => state.isDarkMode);
  const isSettingsOpen = useAppStore(state => state.isSettingsOpen);
  const toggleSettings = useAppStore(state => state.toggleSettings);

  // Estado local
  const [todos, setTodos] = useState<Todo[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    byPriority: { urgent: number; high: number; medium: number; low: number };
    byCategory: Record<string, number>;
  } | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Búsqueda con debounce
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (searchFilters: TodoFilters) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const results = searchTodos({
          search: searchFilters.search,
          category: searchFilters.category || undefined,
          priority: searchFilters.priority || undefined,
          status: searchFilters.status,
          tags: searchFilters.tags,
        });
        setTodos(results);
      }, 300);
    };
  }, [searchTodos]);

  const refreshData = useCallback(() => {
    const allTodos = getTodos();
    setTodos(allTodos);
    const todoStats = getStats();
    setStats(todoStats);
  }, [getTodos, getStats]);

  // Cargar datos iniciales
  useEffect(() => {
    if (!isLoading && !error) {
      refreshData();
    }
  }, [isLoading, error, refreshData]);

  // Buscar cuando cambien los filtros
  useEffect(() => {
    if (!isLoading && !error) {
      debouncedSearch(filters);
    }
  }, [filters, debouncedSearch, isLoading, error]);

  // Aplicar tema
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Crear nueva tarea
  const handleCreateTodo = (data: CreateTodoData) => {
    if (createTodo(data)) {
      refreshData();
      setShowForm(false);

      // Notificación del navegador
      if (settings.notifications && "Notification" in window) {
        new Notification("Nueva tarea creada", {
          body: data.title,
          icon: "/favicon.ico",
        });
      }
    }
  };

  // Editar tarea
  const handleEditTodo = (id: number, data: UpdateTodoData) => {
    if (updateTodo(id, data)) {
      refreshData();
    }
  };

  // Eliminar tarea
  const handleDeleteTodo = (id: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta tarea?")) {
      if (deleteTodo(id)) {
        refreshData();
      }
    }
  };

  // Alternar completado
  const handleToggleTodo = (id: number) => {
    if (toggleTodo(id)) {
      refreshData();
    }
  };

  // Exportar datos
  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `todos-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Importar datos
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.todos && Array.isArray(data.todos)) {
          if (
            confirm(
              "¿Quieres reemplazar todas las tareas existentes con los datos importados?"
            )
          ) {
            if (importData(data)) {
              refreshData();
              alert("Datos importados correctamente");
            } else {
              alert("Error al importar los datos");
            }
          }
        } else {
          alert("Formato de archivo inválido");
        }
      } catch {
        alert("Error al leer el archivo");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  // Solicitar permisos de notificación
  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      updateSettings({ notifications: permission === "granted" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-300">
            Cargando base de datos...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-red-50 dark:bg-red-900">
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-md dark:bg-gray-800">
          <div className="mb-4 text-5xl text-red-500">⚠️</div>
          <h2 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white">
            Error de Base de Datos
          </h2>
          <p className="text-gray-600 dark:text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 transition-colors dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                📝 Todo App Pro
              </h1>
              <span className="hidden text-sm text-gray-500 md:inline dark:text-gray-400">
                Gestión avanzada de tareas
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Notificaciones */}
              <button
                onClick={requestNotificationPermission}
                className={`rounded-lg p-2 transition-colors ${
                  settings.notifications
                    ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900"
                    : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                title={
                  settings.notifications
                    ? "Notificaciones activadas"
                    : "Activar notificaciones"
                }
              >
                {settings.notifications ? (
                  <Bell size={20} />
                ) : (
                  <BellOff size={20} />
                )}
              </button>

              {/* Selector de tema */}
              <ThemeSelector />

              {/* Exportar */}
              <button
                onClick={handleExport}
                className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                title="Exportar datos"
              >
                <Download size={20} />
              </button>

              {/* Importar */}
              <label
                className="cursor-pointer rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                title="Importar datos"
              >
                <Upload size={20} />
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>

              {/* Configuración */}
              <button
                onClick={toggleSettings}
                className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                title="Configuración"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Panel de configuración */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-800">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Configuración
                </h3>
                <button
                  onClick={toggleSettings}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Categoría por defecto
                  </label>
                  <select
                    value={settings.defaultCategory}
                    onChange={e =>
                      updateSettings({ defaultCategory: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="personal">👤 Personal</option>
                    <option value="work">💼 Trabajo</option>
                    <option value="shopping">🛒 Compras</option>
                    <option value="health">🏥 Salud</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prioridad por defecto
                  </label>
                  <select
                    value={settings.defaultPriority}
                    onChange={e =>
                      updateSettings({
                        defaultPriority: e.target.value as
                          | "low"
                          | "medium"
                          | "high",
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="low">🟢 Baja</option>
                    <option value="medium">🟡 Media</option>
                    <option value="high">🔴 Alta</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Estadísticas */}
        <StatsOverview stats={stats} todos={todos} />

        {/* Barra de búsqueda y filtros */}
        <SearchBar
          filters={filters}
          onFiltersChange={setFilters}
          onReset={resetFilters}
        />

        {/* Botón para mostrar formulario */}
        <div className="mb-8 text-center">
          <button
            onClick={() => setShowForm(!showForm)}
            className="mx-auto flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
          >
            {showForm ? <X size={20} /> : <Menu size={20} />}
            {showForm ? "Cerrar Formulario" : "Nueva Tarea"}
          </button>
        </div>

        {/* Formulario de nueva tarea */}
        {showForm && (
          <TodoForm
            onSubmit={handleCreateTodo}
            defaultCategory={settings.defaultCategory}
            defaultPriority={settings.defaultPriority}
          />
        )}

        {/* Lista de tareas */}
        <div className="space-y-4">
          {todos.length === 0 ? (
            <div className="rounded-lg bg-white p-12 text-center shadow-md dark:bg-gray-800">
              <div className="mb-4 text-6xl text-gray-400">📝</div>
              <h3 className="mb-2 text-xl font-semibold text-gray-600 dark:text-gray-300">
                No hay tareas
              </h3>
              <p className="mb-6 text-gray-500 dark:text-gray-400">
                {filters.search ||
                filters.category ||
                filters.priority ||
                filters.status !== "all" ||
                filters.tags.length > 0
                  ? "No se encontraron tareas con los filtros actuales"
                  : "¡Crea tu primera tarea para empezar!"}
              </p>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
                >
                  Crear Primera Tarea
                </button>
              )}
            </div>
          ) : (
            todos.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={handleToggleTodo}
                onEdit={handleEditTodo}
                onDelete={handleDeleteTodo}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500 dark:text-gray-400">
          <p>
            Hecho con ❤️ usando React, TailwindCSS y SQLite
            <br />
            <span className="text-xs">
              Con funcionalidades avanzadas: categorías, prioridades, fechas,
              búsqueda, temas y más
            </span>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default TodoApp;
