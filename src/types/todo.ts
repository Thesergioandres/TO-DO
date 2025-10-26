export interface Todo {
  id: number;
  client_id?: string; // Para sincronización offline
  title: string;
  description?: string;
  completed: boolean;
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  due_date?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string; // Para soft delete
  version?: number; // Control de versiones
  user_id?: number; // ID del usuario propietario
  is_deleted?: boolean; // Estado de eliminación
}

export interface CreateTodoData {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  category?: string;
  due_date?: string;
  tags?: string[];
}

export interface UpdateTodoData {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: "low" | "medium" | "high" | "urgent";
  category?: string;
  due_date?: string;
  tags?: string[];
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface TodoStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  byPriority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  byCategory: Record<string, number>;
}

export interface TodoFilters {
  search: string;
  category: string | null;
  priority: "low" | "medium" | "high" | "urgent" | null;
  status: "all" | "pending" | "completed" | "overdue";
  tags: string[];
}

export interface AppSettings {
  theme: "light" | "dark" | "system";
  language: "es" | "en";
  notifications: boolean;
  defaultCategory: string;
  defaultPriority: "low" | "medium" | "high" | "urgent";
}
