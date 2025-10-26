import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Circle,
  Clock,
  Edit3,
  Save,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import React, { useState } from "react";
import type { Todo, UpdateTodoData } from "../types/todo";
import {
  DEFAULT_CATEGORIES,
  PRIORITY_COLORS,
  PRIORITY_ICONS,
  formatRelativeDate,
  isOverdue,
} from "../utils/constants";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onEdit: (id: number, data: UpdateTodoData) => void;
  onDelete: (id: number) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<UpdateTodoData>({
    title: todo.title,
    description: todo.description || "",
    priority: todo.priority,
    category: todo.category,
    due_date: todo.due_date || "",
    tags: [...todo.tags],
  });
  const [tagInput, setTagInput] = useState("");

  const category = DEFAULT_CATEGORIES.find(c => c.id === todo.category);
  const isTaskOverdue =
    todo.due_date && !todo.completed && isOverdue(todo.due_date);

  const handleSave = () => {
    if (!editData.title?.trim()) return;

    onEdit(todo.id, {
      ...editData,
      title: editData.title?.trim(),
      description: editData.description?.trim() || undefined,
      due_date: editData.due_date || undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      title: todo.title,
      description: todo.description || "",
      priority: todo.priority,
      category: todo.category,
      due_date: todo.due_date || "",
      tags: [...todo.tags],
    });
    setTagInput("");
    setIsEditing(false);
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !editData.tags?.includes(tag)) {
      setEditData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || [],
    }));
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border-2 border-blue-200 bg-white p-6 shadow-md">
        <div className="space-y-4">
          {/* Título */}
          <input
            type="text"
            value={editData.title}
            onChange={e =>
              setEditData(prev => ({ ...prev, title: e.target.value }))
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-lg font-medium focus:border-transparent focus:ring-2 focus:ring-blue-500"
            placeholder="Título de la tarea"
          />

          {/* Descripción */}
          <textarea
            value={editData.description}
            onChange={e =>
              setEditData(prev => ({ ...prev, description: e.target.value }))
            }
            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Descripción (opcional)"
          />

          {/* Campos en línea */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Categoría */}
            <select
              value={editData.category}
              onChange={e =>
                setEditData(prev => ({ ...prev, category: e.target.value }))
              }
              className="rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              {DEFAULT_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>

            {/* Prioridad */}
            <select
              value={editData.priority}
              onChange={e =>
                setEditData(prev => ({
                  ...prev,
                  priority: e.target.value as "low" | "medium" | "high",
                }))
              }
              className="rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">{PRIORITY_ICONS.low} Baja</option>
              <option value="medium">{PRIORITY_ICONS.medium} Media</option>
              <option value="high">{PRIORITY_ICONS.high} Alta</option>
            </select>

            {/* Fecha límite */}
            <input
              type="datetime-local"
              value={editData.due_date}
              onChange={e =>
                setEditData(prev => ({ ...prev, due_date: e.target.value }))
              }
              className="rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Etiquetas */}
          <div>
            <div className="mb-2 flex gap-2">
              <input
                type="text"
                placeholder="Agregar etiqueta..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="flex-1 rounded border border-gray-300 px-3 py-1 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addTag}
                disabled={!tagInput.trim()}
                className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                +
              </button>
            </div>

            {editData.tags && editData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {editData.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={!editData.title?.trim()}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={16} />
              Guardar
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 rounded-lg bg-gray-500 px-4 py-2 text-white transition-colors hover:bg-gray-600"
            >
              <X size={16} />
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg bg-white p-6 shadow-md transition-all hover:shadow-lg ${
        todo.completed ? "opacity-75" : ""
      } ${isTaskOverdue ? "border-l-4 border-red-500" : ""}`}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(todo.id)}
          className={`mt-1 transition-colors ${
            todo.completed
              ? "text-green-600"
              : "text-gray-400 hover:text-blue-600"
          }`}
        >
          {todo.completed ? <CheckCircle size={24} /> : <Circle size={24} />}
        </button>

        {/* Contenido principal */}
        <div className="flex-1">
          {/* Header con título y prioridad */}
          <div className="mb-2 flex items-start justify-between">
            <div className="flex flex-1 items-center gap-2">
              <h3
                className={`text-lg font-semibold ${
                  todo.completed
                    ? "text-gray-500 line-through"
                    : "text-gray-800"
                }`}
              >
                {todo.title}
              </h3>

              {/* Indicador de prioridad */}
              <span
                className={`rounded-full border px-2 py-1 text-xs font-medium ${
                  PRIORITY_COLORS[todo.priority]
                }`}
              >
                {PRIORITY_ICONS[todo.priority]} {todo.priority.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Descripción */}
          {todo.description && (
            <p
              className={`mt-2 text-gray-600 ${
                todo.completed ? "text-gray-400 line-through" : ""
              }`}
            >
              {todo.description}
            </p>
          )}

          {/* Metadatos */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            {/* Categoría */}
            <div className="flex items-center gap-1">
              <Tag size={14} className="text-gray-400" />
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${category?.color || "bg-gray-500"} text-white`}
              >
                {category?.icon || "📝"} {category?.name || todo.category}
              </span>
            </div>

            {/* Fecha de vencimiento */}
            {todo.due_date && (
              <div
                className={`flex items-center gap-1 ${
                  isTaskOverdue ? "text-red-600" : "text-gray-500"
                }`}
              >
                {isTaskOverdue ? (
                  <AlertTriangle size={14} />
                ) : (
                  <Calendar size={14} />
                )}
                <span className="text-xs">
                  {formatRelativeDate(todo.due_date)}
                </span>
              </div>
            )}

            {/* Timestamp */}
            <div className="flex items-center gap-1 text-gray-400">
              <Clock size={14} />
              <span className="text-xs">
                {new Date(todo.created_at).toLocaleDateString("es-ES")}
              </span>
            </div>
          </div>

          {/* Etiquetas */}
          {todo.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {todo.tags.map(tag => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
            title="Editar"
          >
            <Edit3 size={18} />
          </button>
          <button
            onClick={() => onDelete(todo.id)}
            className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
            title="Eliminar"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TodoItem;
