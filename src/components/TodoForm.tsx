import { Calendar, Flag, Plus, Tag } from "lucide-react";
import React, { useState } from "react";
import type { CreateTodoData } from "../types/todo";
import { DEFAULT_CATEGORIES, PRIORITY_ICONS } from "../utils/constants";

interface TodoFormProps {
  onSubmit: (data: CreateTodoData) => void;
  defaultCategory?: string;
  defaultPriority?: "low" | "medium" | "high" | "urgent";
}

const TodoForm: React.FC<TodoFormProps> = ({
  onSubmit,
  defaultCategory = "personal",
  defaultPriority = "medium",
}) => {
  const [formData, setFormData] = useState<CreateTodoData>({
    title: "",
    description: "",
    priority: defaultPriority,
    category: defaultCategory,
    due_date: "",
    tags: [],
  });

  const [tagInput, setTagInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    onSubmit({
      ...formData,
      title: formData.title.trim(),
      description: formData.description?.trim() || undefined,
      due_date: formData.due_date || undefined,
    });

    // Reset form
    setFormData({
      title: "",
      description: "",
      priority: defaultPriority,
      category: defaultCategory,
      due_date: "",
      tags: [],
    });
    setTagInput("");
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags?.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || [],
    }));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="mb-8 rounded-lg bg-white p-6 shadow-md">
      <div className="mb-6 flex items-center gap-2">
        <Plus className="text-blue-600" size={24} />
        <h2 className="text-xl font-semibold text-gray-800">Nueva Tarea</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Título */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Título *
          </label>
          <input
            type="text"
            placeholder="¿Qué necesitas hacer?"
            value={formData.title}
            onChange={e =>
              setFormData(prev => ({ ...prev, title: e.target.value }))
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-transparent focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Descripción
          </label>
          <textarea
            placeholder="Detalles adicionales (opcional)..."
            value={formData.description}
            onChange={e =>
              setFormData(prev => ({ ...prev, description: e.target.value }))
            }
            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        {/* Campos en línea */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Categoría */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              <Tag size={16} className="mr-1 inline" />
              Categoría
            </label>
            <select
              value={formData.category}
              onChange={e =>
                setFormData(prev => ({ ...prev, category: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
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
              <Flag size={16} className="mr-1 inline" />
              Prioridad
            </label>
            <select
              value={formData.priority}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  priority: e.target.value as "low" | "medium" | "high",
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">{PRIORITY_ICONS.low} Baja</option>
              <option value="medium">{PRIORITY_ICONS.medium} Media</option>
              <option value="high">{PRIORITY_ICONS.high} Alta</option>
            </select>
          </div>

          {/* Fecha de vencimiento */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              <Calendar size={16} className="mr-1 inline" />
              Fecha límite
            </label>
            <input
              type="datetime-local"
              value={formData.due_date}
              onChange={e =>
                setFormData(prev => ({ ...prev, due_date: e.target.value }))
              }
              min={new Date().toISOString().slice(0, 16)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Etiquetas */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Etiquetas
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Agregar etiqueta..."
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={addTag}
              disabled={!tagInput.trim()}
              className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Agregar
            </button>
          </div>

          {/* Tags seleccionadas */}
          {formData.tags && formData.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {formData.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-blue-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={!formData.title.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={20} />
          Crear Tarea
        </button>
      </form>
    </div>
  );
};

export default TodoForm;
