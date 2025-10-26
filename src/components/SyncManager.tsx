import React, { useCallback, useState } from "react";
import apiService, { type SyncConflict } from "../services/api";
import type { Todo } from "../types/todo";
import { Button } from "./Button";

interface SyncManagerProps {
  todos: Todo[];
  onTodosUpdated: (todos: Todo[]) => void;
  isOnline: boolean;
}

interface ConflictResolutionProps {
  conflicts: SyncConflict[];
  onResolved: () => void;
  onCancel: () => void;
}

const ConflictResolution: React.FC<ConflictResolutionProps> = ({
  conflicts,
  onResolved,
  onCancel,
}) => {
  const [resolutions, setResolutions] = useState<
    Record<string, "use_server" | "use_client">
  >({});
  const [processing, setProcessing] = useState(false);

  const handleResolutionChange = (
    clientId: string,
    resolution: "use_server" | "use_client"
  ) => {
    setResolutions(prev => ({ ...prev, [clientId]: resolution }));
  };

  const handleResolveAll = async () => {
    setProcessing(true);

    try {
      for (const conflict of conflicts) {
        const resolution = resolutions[conflict.client_id] || "use_server";
        const todoData =
          resolution === "use_client" ? conflict.client_todo : undefined;

        await apiService.resolveConflict(
          conflict.client_id,
          resolution,
          todoData
        );
      }

      onResolved();
    } catch (error) {
      console.error("Error resolviendo conflictos:", error);
      alert("Error al resolver conflictos. Intenta de nuevo.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white dark:bg-gray-800">
        <div className="border-b border-gray-200 p-6 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Conflictos de sincronización detectados
          </h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Se encontraron {conflicts.length} conflicto(s). Elige qué versión
            mantener para cada elemento.
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto p-6">
          {conflicts.map((conflict, index) => (
            <div key={conflict.client_id || index} className="mb-6 last:mb-0">
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                <h3 className="mb-3 font-medium text-gray-900 dark:text-white">
                  Conflicto #{index + 1}
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Versión del servidor */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="font-medium text-blue-900 dark:text-blue-300">
                        Versión del servidor
                      </h4>
                      <input
                        type="radio"
                        name={`conflict-${conflict.client_id}`}
                        value="use_server"
                        checked={
                          resolutions[conflict.client_id] !== "use_client"
                        }
                        onChange={() =>
                          handleResolutionChange(
                            conflict.client_id,
                            "use_server"
                          )
                        }
                        className="text-blue-600"
                      />
                    </div>
                    {conflict.server_todo ? (
                      <div className="space-y-1 text-sm">
                        <p>
                          <strong>Título:</strong> {conflict.server_todo.title}
                        </p>
                        <p>
                          <strong>Estado:</strong>{" "}
                          {conflict.server_todo.completed
                            ? "Completado"
                            : "Pendiente"}
                        </p>
                        <p>
                          <strong>Prioridad:</strong>{" "}
                          {conflict.server_todo.priority}
                        </p>
                        <p>
                          <strong>Categoría:</strong>{" "}
                          {conflict.server_todo.category}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Eliminado en servidor
                      </p>
                    )}
                  </div>

                  {/* Versión del cliente */}
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-900/20">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="font-medium text-orange-900 dark:text-orange-300">
                        Tu versión local
                      </h4>
                      <input
                        type="radio"
                        name={`conflict-${conflict.client_id}`}
                        value="use_client"
                        checked={
                          resolutions[conflict.client_id] === "use_client"
                        }
                        onChange={() =>
                          handleResolutionChange(
                            conflict.client_id,
                            "use_client"
                          )
                        }
                        className="text-orange-600"
                      />
                    </div>
                    {conflict.client_todo ? (
                      <div className="space-y-1 text-sm">
                        <p>
                          <strong>Título:</strong> {conflict.client_todo.title}
                        </p>
                        <p>
                          <strong>Estado:</strong>{" "}
                          {conflict.client_todo.completed
                            ? "Completado"
                            : "Pendiente"}
                        </p>
                        <p>
                          <strong>Prioridad:</strong>{" "}
                          {conflict.client_todo.priority}
                        </p>
                        <p>
                          <strong>Categoría:</strong>{" "}
                          {conflict.client_todo.category}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Eliminado localmente
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-3 border-t border-gray-200 p-6 dark:border-gray-700">
          <Button variant="outline" onClick={onCancel} disabled={processing}>
            Cancelar
          </Button>
          <Button onClick={handleResolveAll} disabled={processing}>
            {processing ? "Resolviendo..." : "Resolver conflictos"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const SyncManager: React.FC<SyncManagerProps> = ({
  todos,
  onTodosUpdated,
  isOnline,
}) => {
  const [syncing, setSyncing] = useState(false);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(
    localStorage.getItem("last_sync")
  );

  const syncWithServer = useCallback(async () => {
    if (!isOnline || syncing) return;

    setSyncing(true);

    try {
      // 1. Subir cambios locales
      const uploadResponse = await apiService.uploadSync(
        todos,
        lastSync || undefined
      );

      if (uploadResponse.conflicts.length > 0) {
        setConflicts(uploadResponse.conflicts);
        setSyncing(false);
        return;
      }

      // 2. Descargar cambios del servidor
      const downloadResponse = await apiService.downloadSync(
        lastSync || undefined
      );

      // 3. Fusionar todos del servidor con los locales
      const serverTodos = downloadResponse.todos;
      const processedIds = new Set(
        uploadResponse.processed.map(p => p.client_id)
      );

      // Mantener todos locales que no fueron procesados y no están eliminados en servidor
      const localTodos = todos.filter(
        todo =>
          !processedIds.has(todo.client_id || "") &&
          !serverTodos.some(
            serverTodo =>
              serverTodo.client_id === todo.client_id ||
              serverTodo.id === todo.id
          )
      );

      // Combinar con todos del servidor
      const mergedTodos = [...serverTodos, ...localTodos];

      // Actualizar mapeo de IDs para todos que fueron creados en servidor
      uploadResponse.processed.forEach(proc => {
        const localTodo = mergedTodos.find(t => t.client_id === proc.client_id);
        if (localTodo && proc.action === "created") {
          localTodo.id = proc.server_id;
        }
      });

      onTodosUpdated(mergedTodos);

      // Actualizar timestamp de última sincronización
      const newLastSync = downloadResponse.timestamp;
      setLastSync(newLastSync);
      localStorage.setItem("last_sync", newLastSync);

      console.log("Sincronización completada exitosamente");
    } catch (error) {
      console.error("Error en sincronización:", error);
    } finally {
      setSyncing(false);
    }
  }, [todos, isOnline, syncing, lastSync, onTodosUpdated]);

  const handleConflictsResolved = () => {
    setConflicts([]);
    // Reintentar sincronización después de resolver conflictos
    setTimeout(syncWithServer, 1000);
  };

  const handleConflictsCancel = () => {
    setConflicts([]);
    setSyncing(false);
  };

  return (
    <>
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div
            className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isOnline ? "En línea" : "Sin conexión"}
          </span>
        </div>

        {isOnline && (
          <Button
            variant="outline"
            size="sm"
            onClick={syncWithServer}
            disabled={syncing}
            className="flex items-center space-x-2"
          >
            <svg
              className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{syncing ? "Sincronizando..." : "Sincronizar"}</span>
          </Button>
        )}

        {lastSync && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Última sync: {new Date(lastSync).toLocaleString()}
          </span>
        )}
      </div>

      {conflicts.length > 0 && (
        <ConflictResolution
          conflicts={conflicts}
          onResolved={handleConflictsResolved}
          onCancel={handleConflictsCancel}
        />
      )}
    </>
  );
};
