import { useCallback, useEffect, useState } from "react";
import apiService from "../services/api";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { email?: string; username?: string } | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = async () => {
      const token = apiService.getToken();

      if (!token) {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
        });
        return;
      }

      try {
        const isValid = await apiService.verifyToken();

        if (isValid) {
          // TODO: Obtener datos del usuario desde el API
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            user: { email: "usuario@ejemplo.com" }, // Placeholder
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
          });
        }
      } catch (error) {
        console.error("Error verificando autenticación:", error);
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
        });
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await apiService.login({ email, password });

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: { email }, // Placeholder
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Error al iniciar sesión",
      };
    }
  }, []);

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      try {
        await apiService.register({ username, email, password });

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: { email, username },
        });

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Error al registrarse",
        };
      }
    },
    []
  );

  const logout = useCallback(() => {
    apiService.logout();
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });
  }, []);

  return {
    ...authState,
    login,
    register,
    logout,
  };
};
