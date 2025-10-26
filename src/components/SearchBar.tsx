import { Search, SlidersHorizontal, X } from "lucide-react";
import React from "react";
import type { TodoFilters } from "../types/todo";
import { DEFAULT_CATEGORIES, PRIORITY_ICONS } from "../utils/constants";

interface SearchBarProps {
  filters: TodoFilters;
  onFiltersChange: (filters: Partial<TodoFilters>) => void;
  onReset: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  filters,
  onFiltersChange,
  onReset,
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);

  const hasActiveFilters =
    filters.search ||
    filters.category ||
    filters.priority ||
    filters.status !== "all" ||
    filters.tags.length > 0;

  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
      {/* Búsqueda básica */}
      <div className="mb-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Buscar tareas..."
            value={filters.search}
            onChange={e => onFiltersChange({ search: e.target.value })}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ search: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <button
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-colors ${
            isAdvancedOpen || hasActiveFilters
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <SlidersHorizontal size={18} />
          Filtros
        </button>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-red-700 transition-colors hover:bg-red-200"
          >
            <X size={16} />
            Limpiar
          </button>
        )}
      </div>

      {/* Filtros avanzados */}
      {isAdvancedOpen && (
        <div className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Estado */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Estado
            </label>
            <select
              value={filters.status}
              onChange={e =>
                onFiltersChange({
                  status: e.target.value as TodoFilters["status"],
                })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas</option>
              <option value="pending">Pendientes</option>
              <option value="completed">Completadas</option>
              <option value="overdue">Vencidas</option>
            </select>
          </div>

          {/* Categoría */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Categoría
            </label>
            <select
              value={filters.category || ""}
              onChange={e =>
                onFiltersChange({ category: e.target.value || null })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las categorías</option>
              {DEFAULT_CATEGORIES.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Prioridad */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Prioridad
            </label>
            <select
              value={filters.priority || ""}
              onChange={e =>
                onFiltersChange({
                  priority: e.target.value as TodoFilters["priority"],
                })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las prioridades</option>
              <option value="high">{PRIORITY_ICONS.high} Alta</option>
              <option value="medium">{PRIORITY_ICONS.medium} Media</option>
              <option value="low">{PRIORITY_ICONS.low} Baja</option>
            </select>
          </div>

          {/* Etiquetas */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Etiquetas
            </label>
            <input
              type="text"
              placeholder="Escribir etiqueta y Enter"
              onKeyDown={e => {
                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                  const newTag = e.currentTarget.value.trim();
                  if (!filters.tags.includes(newTag)) {
                    onFiltersChange({ tags: [...filters.tags, newTag] });
                  }
                  e.currentTarget.value = "";
                }
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />

            {/* Tags seleccionadas */}
            {filters.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {filters.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800"
                  >
                    {tag}
                    <button
                      onClick={() =>
                        onFiltersChange({
                          tags: filters.tags.filter(t => t !== tag),
                        })
                      }
                      className="hover:text-blue-600"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
