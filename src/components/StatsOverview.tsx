import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import React from "react";
import type { Todo, TodoStats } from "../types/todo";
import { DEFAULT_CATEGORIES, formatRelativeDate } from "../utils/constants";

interface StatsOverviewProps {
  stats: TodoStats | null;
  todos: Todo[];
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, todos }) => {
  if (!stats) return null;

  // Tareas próximas a vencer (próximos 3 días)
  const upcomingTodos = todos.filter(todo => {
    if (!todo.due_date || todo.completed) return false;
    const dueDate = new Date(todo.due_date);
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    return dueDate <= threeDaysFromNow;
  });

  const completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Estadísticas principales */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total de Tareas</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="rounded-lg bg-blue-100 p-3">
            <TrendingUp className="text-blue-600" size={24} />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center text-sm">
            <span className="font-medium text-green-600">
              {completionRate}%
            </span>
            <span className="ml-1 text-gray-500">completadas</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Tareas pendientes */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </p>
          </div>
          <div className="rounded-lg bg-yellow-100 p-3">
            <Clock className="text-yellow-600" size={24} />
          </div>
        </div>
        <div className="mt-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-xs text-gray-500">Alta</div>
              <div className="text-sm font-semibold text-red-600">
                {stats.byPriority.high}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">Media</div>
              <div className="text-sm font-semibold text-yellow-600">
                {stats.byPriority.medium}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">Baja</div>
              <div className="text-sm font-semibold text-green-600">
                {stats.byPriority.low}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tareas completadas */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Completadas</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.completed}
            </p>
          </div>
          <div className="rounded-lg bg-green-100 p-3">
            <CheckCircle2 className="text-green-600" size={24} />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-500">¡Excelente progreso! 🎉</p>
        </div>
      </div>

      {/* Tareas vencidas */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Vencidas</p>
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
          </div>
          <div className="rounded-lg bg-red-100 p-3">
            <AlertTriangle className="text-red-600" size={24} />
          </div>
        </div>
        <div className="mt-4">
          {stats.overdue > 0 ? (
            <p className="text-sm text-red-500">Requieren atención urgente</p>
          ) : (
            <p className="text-sm text-gray-500">¡Muy bien! 👍</p>
          )}
        </div>
      </div>

      {/* Próximas a vencer */}
      {upcomingTodos.length > 0 && (
        <div className="col-span-full rounded-lg bg-white p-6 shadow-md">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="text-orange-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-800">
              Próximas a Vencer
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {upcomingTodos.slice(0, 6).map(todo => {
              const category = DEFAULT_CATEGORIES.find(
                c => c.id === todo.category
              );
              return (
                <div
                  key={todo.id}
                  className="rounded-lg border border-orange-200 bg-orange-50 p-3"
                >
                  <div className="flex items-start gap-2">
                    <span>{category?.icon || "📝"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {todo.title}
                      </p>
                      <p className="mt-1 text-xs text-orange-600">
                        {todo.due_date && formatRelativeDate(todo.due_date)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {upcomingTodos.length > 6 && (
            <p className="mt-3 text-center text-sm text-gray-500">
              Y {upcomingTodos.length - 6} más...
            </p>
          )}
        </div>
      )}

      {/* Distribución por categorías */}
      {Object.keys(stats.byCategory).length > 0 && (
        <div className="col-span-full rounded-lg bg-white p-6 shadow-md">
          <h3 className="mb-4 text-lg font-semibold text-gray-800">
            Distribución por Categorías
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
            {Object.entries(stats.byCategory).map(([categoryId, count]) => {
              const category = DEFAULT_CATEGORIES.find(
                c => c.id === categoryId
              );
              return (
                <div key={categoryId} className="text-center">
                  <div
                    className={`h-12 w-12 ${category?.color || "bg-gray-500"} mx-auto mb-2 flex items-center justify-center rounded-lg text-xl text-white`}
                  >
                    {category?.icon || "📝"}
                  </div>
                  <p className="truncate text-xs text-gray-600">
                    {category?.name || categoryId}
                  </p>
                  <p className="text-sm font-semibold text-gray-800">{count}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsOverview;
