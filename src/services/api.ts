import type { Todo, TodoStats } from "../types/todo";

// Forzar el uso de funciones serverless locales en Vercel
const API_BASE_URL = "/api";

export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface SyncStatus {
  last_sync: string | null;
  todo_count: number;
  server_time: string;
}

export interface SyncConflict {
  client_id: string;
  server_todo?: Todo;
  client_todo?: Todo;
  conflict_type: string;
  error?: string;
}

export interface SyncUploadResponse {
  success: boolean;
  processed: Array<{
    client_id: string;
    server_id: number;
    action: "created" | "updated";
  }>;
  conflicts: SyncConflict[];
  timestamp: string;
}

class ApiError extends Error {
  public status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

class ApiService {
  private token: string | null = null;

  constructor() {
    // Recuperar token del localStorage si existe
    this.token = localStorage.getItem("auth_token");
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          response.status,
          data.error || "Error en la petición"
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Error de conectividad
      throw new ApiError(0, "Error de conexión con el servidor");
    }
  }

  // Autenticación
  async register(userData: RegisterData): Promise<ApiResponse> {
    const response = await this.makeRequest<ApiResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    if (
      response.data &&
      typeof response.data === "object" &&
      "token" in response.data
    ) {
      this.setToken((response.data as { token: string }).token);
    }

    return response;
  }

  async login(credentials: LoginCredentials): Promise<ApiResponse> {
    const response = await this.makeRequest<ApiResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (
      response.data &&
      typeof response.data === "object" &&
      "token" in response.data
    ) {
      this.setToken((response.data as { token: string }).token);
    }

    return response;
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem("auth_token");
  }

  async verifyToken(): Promise<boolean> {
    if (!this.token) return false;

    try {
      await this.makeRequest("/users/verify");
      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  // Gestión de TODOs
  async getTodos(since?: string): Promise<Todo[]> {
    const params = since ? `?since=${encodeURIComponent(since)}` : "";
    const response = await this.makeRequest<{ data?: Todo[] } | Todo[]>(
      `/todo${params}`
    );

    if (Array.isArray(response)) {
      return response;
    }

    // Para la nueva API serverless, la respuesta viene en response.data
    return (response as { data?: Todo[] }).data || [];
  }

  async createTodo(todo: Partial<Todo>): Promise<Todo> {
    const response = await this.makeRequest<{ data: Todo }>("/todo", {
      method: "POST",
      body: JSON.stringify(todo),
    });
    return response.data;
  }

  async updateTodo(id: number, todo: Partial<Todo>): Promise<Todo> {
    const response = await this.makeRequest<{ data: Todo }>(`/todo/${id}`, {
      method: "PUT",
      body: JSON.stringify(todo),
    });
    return response.data;
  }

  async deleteTodo(id: number): Promise<ApiResponse> {
    return this.makeRequest(`/todo/${id}`, {
      method: "DELETE",
    });
  }

  async toggleTodoComplete(id: number, completed: boolean): Promise<Todo> {
    const response = await this.makeRequest<{ data: Todo }>(`/todo/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    });
    return response.data;
  }

  async getStats(): Promise<TodoStats> {
    return this.makeRequest("/todo/stats");
  }

  // Sincronización
  async uploadSync(
    todos: Todo[],
    lastSync?: string
  ): Promise<SyncUploadResponse> {
    return this.makeRequest("/todo/sync/upload", {
      method: "POST",
      body: JSON.stringify({ todos, lastSync }),
    });
  }

  async downloadSync(
    since?: string
  ): Promise<{ todos: Todo[]; timestamp: string }> {
    const params = since ? `?since=${encodeURIComponent(since)}` : "";
    return this.makeRequest(`/todo/sync/download${params}`);
  }

  async getSyncStatus(): Promise<SyncStatus> {
    return this.makeRequest("/todo/sync/status");
  }

  async resolveConflict(
    clientId: string,
    resolution: "use_server" | "use_client",
    todoData?: Partial<Todo>
  ): Promise<ApiResponse> {
    return this.makeRequest("/todo/sync/resolve-conflict", {
      method: "POST",
      body: JSON.stringify({
        client_id: clientId,
        resolution,
        todo_data: todoData,
      }),
    });
  }

  // Health check
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    version: string;
  }> {
    return this.makeRequest("/health");
  }

  // Utilidades
  setToken(token: string): void {
    this.token = token;
    localStorage.setItem("auth_token", token);
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

// Instancia singleton
export const apiService = new ApiService();
export default apiService;
