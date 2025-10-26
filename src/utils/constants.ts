// Categorías predefinidas
export const DEFAULT_CATEGORIES = [
  { id: "personal", name: "Personal", color: "bg-blue-500", icon: "👤" },
  { id: "work", name: "Trabajo", color: "bg-green-500", icon: "💼" },
  { id: "shopping", name: "Compras", color: "bg-purple-500", icon: "🛒" },
  { id: "health", name: "Salud", color: "bg-red-500", icon: "🏥" },
  { id: "education", name: "Educación", color: "bg-yellow-500", icon: "📚" },
  { id: "finance", name: "Finanzas", color: "bg-indigo-500", icon: "💰" },
  { id: "travel", name: "Viajes", color: "bg-pink-500", icon: "✈️" },
  { id: "hobbies", name: "Pasatiempos", color: "bg-orange-500", icon: "🎨" },
];

// Colores para prioridades
export const PRIORITY_COLORS = {
  low: "text-green-600 bg-green-50 border-green-200",
  medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
  high: "text-red-600 bg-red-50 border-red-200",
  urgent: "text-red-800 bg-red-100 border-red-300",
};

// Iconos para prioridades
export const PRIORITY_ICONS = {
  low: "🟢",
  medium: "🟡",
  high: "🔴",
  urgent: "🔥",
};

// Formatear fecha relativa
export const formatRelativeDate = (date: string): string => {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInMs = targetDate.getTime() - now.getTime();
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays < 0) {
    return `Vencida hace ${Math.abs(diffInDays)} días`;
  } else if (diffInDays === 0) {
    return "Vence hoy";
  } else if (diffInDays === 1) {
    return "Vence mañana";
  } else if (diffInDays <= 7) {
    return `Vence en ${diffInDays} días`;
  } else {
    return targetDate.toLocaleDateString("es-ES");
  }
};

// Verificar si una tarea está vencida
export const isOverdue = (dueDate: string): boolean => {
  const now = new Date();
  const targetDate = new Date(dueDate);
  return targetDate < now;
};

// Generar ID único simple
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Validar email simple
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Sanitizar texto
export const sanitizeText = (text: string): string => {
  return text.trim().replace(/[<>]/g, "");
};

// Formatear tamaño de archivo
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Debounce function
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
