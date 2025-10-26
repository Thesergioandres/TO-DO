import React, { useCallback, useEffect, useState } from "react";
import { AuthForm, SyncManager } from "./components";
import TodoApp from "./components/TodoApp";
import { useAuth, useOnlineStatus } from "./hooks";
import apiService from "./services/api";
import type { Todo } from "./types/todo";

const AppWithAuth: React.FC = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const isOnline = useOnlineStatus();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(false);

  const loadTodosFromLocal = useCallback(() => {
    try {
      const localTodos = localStorage.getItem("todos_backup");
      if (localTodos) {
        setTodos(JSON.parse(localTodos));
      }
    } catch (error) {
      console.error("Error cargando todos locales:", error);
    }
  }, []);

  // Cargar todos del servidor
  const loadTodosFromServer = useCallback(async () => {
    setLoadingTodos(true);
    try {
      const serverTodos = await apiService.getTodos();
      setTodos(serverTodos);
      // Guardar en localStorage como backup
      localStorage.setItem("todos_backup", JSON.stringify(serverTodos));
    } catch (error) {
      console.error("Error cargando todos del servidor:", error);
      // Fallback a localStorage si hay error
      loadTodosFromLocal();
    } finally {
      setLoadingTodos(false);
    }
  }, [loadTodosFromLocal]);

  // Cargar todos al autenticarse
  useEffect(() => {
    if (isAuthenticated && isOnline) {
      loadTodosFromServer();
    } else if (isAuthenticated && !isOnline) {
      // Cargar todos del localStorage cuando esté offline
      loadTodosFromLocal();
    }
  }, [isAuthenticated, isOnline, loadTodosFromServer, loadTodosFromLocal]);

  const handleTodosUpdated = (updatedTodos: Todo[]) => {
    setTodos(updatedTodos);
    // Guardar backup local
    localStorage.setItem("todos_backup", JSON.stringify(updatedTodos));
  };

  const handleAuthenticated = () => {
    // La lógica de autenticación se maneja en el hook useAuth
    // Este callback se ejecuta cuando el AuthForm completa el login/registro
  };

  const handleLogout = () => {
    logout();
    setTodos([]);
    localStorage.removeItem("todos_backup");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header con info de usuario y sincronización */}
      <header className="border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                TODO App
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Gestiona tus tareas de forma eficiente
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <SyncManager
                todos={todos}
                onTodosUpdated={handleTodosUpdated}
                isOnline={isOnline}
              />

              <button
                onClick={handleLogout}
                className="inline-flex items-center rounded-md border border-transparent bg-red-100 px-3 py-2 text-sm font-medium leading-4 text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loadingTodos ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Cargando tareas...
            </p>
          </div>
        ) : (
          <TodoApp />
        )}
      </main>

      {/* Indicador de estado offline */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 rounded-lg border border-yellow-300 bg-yellow-100 px-4 py-2 text-yellow-800 shadow-lg dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
          <div className="flex items-center">
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <span className="text-sm font-medium">
              Modo offline - Los cambios se sincronizarán cuando vuelvas a estar
              en línea
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppWithAuth;
