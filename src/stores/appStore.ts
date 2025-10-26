// React imports at the top
import { useEffect, useState } from "react";
import type { AppSettings, TodoFilters } from "../types/todo";

interface AppStore {
  // Theme state
  theme: "light" | "dark" | "system";
  isDarkMode: boolean;

  // Settings
  settings: AppSettings;

  // Filters
  filters: TodoFilters;

  // UI State
  isSettingsOpen: boolean;
  isExportModalOpen: boolean;
  isImportModalOpen: boolean;
  sidebarOpen: boolean;

  // Actions
  setTheme: (theme: "light" | "dark" | "system") => void;
  toggleTheme: () => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setFilters: (filters: Partial<TodoFilters>) => void;
  resetFilters: () => void;
  toggleSettings: () => void;
  toggleExportModal: () => void;
  toggleImportModal: () => void;
  toggleSidebar: () => void;
}

// Estado inicial
const initialSettings: AppSettings = {
  theme: "system",
  language: "es",
  notifications: true,
  defaultCategory: "personal",
  defaultPriority: "medium",
};

const initialFilters: TodoFilters = {
  search: "",
  category: null,
  priority: null,
  status: "all",
  tags: [],
};

// Detectar tema del sistema
const getSystemTheme = (): boolean => {
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
};

// Simple store implementation without external dependencies
class SimpleStore {
  private state: AppStore;
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Cargar desde localStorage
    const savedSettings = localStorage.getItem("todo-settings");
    const savedFilters = localStorage.getItem("todo-filters");

    const settings = savedSettings
      ? JSON.parse(savedSettings)
      : initialSettings;
    const filters = savedFilters ? JSON.parse(savedFilters) : initialFilters;

    this.state = {
      theme: settings.theme,
      isDarkMode:
        settings.theme === "dark" ||
        (settings.theme === "system" && getSystemTheme()),
      settings,
      filters,
      isSettingsOpen: false,
      isExportModalOpen: false,
      isImportModalOpen: false,
      sidebarOpen: false,

      setTheme: theme => {
        this.setState({
          theme,
          isDarkMode:
            theme === "dark" || (theme === "system" && getSystemTheme()),
          settings: { ...this.state.settings, theme },
        });
        this.saveSettings();
      },

      toggleTheme: () => {
        const newTheme = this.state.theme === "light" ? "dark" : "light";
        this.state.setTheme(newTheme);
      },

      updateSettings: newSettings => {
        const settings = { ...this.state.settings, ...newSettings };
        this.setState({ settings });
        this.saveSettings();
      },

      setFilters: newFilters => {
        const filters = { ...this.state.filters, ...newFilters };
        this.setState({ filters });
        this.saveFilters();
      },

      resetFilters: () => {
        this.setState({ filters: initialFilters });
        this.saveFilters();
      },

      toggleSettings: () => {
        this.setState({ isSettingsOpen: !this.state.isSettingsOpen });
      },

      toggleExportModal: () => {
        this.setState({ isExportModalOpen: !this.state.isExportModalOpen });
      },

      toggleImportModal: () => {
        this.setState({ isImportModalOpen: !this.state.isImportModalOpen });
      },

      toggleSidebar: () => {
        this.setState({ sidebarOpen: !this.state.sidebarOpen });
      },
    };

    // Escuchar cambios del tema del sistema
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", () => {
        if (this.state.settings.theme === "system") {
          this.setState({ isDarkMode: mediaQuery.matches });
        }
      });
    }
  }

  private setState(newState: Partial<AppStore>) {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  private saveSettings() {
    localStorage.setItem("todo-settings", JSON.stringify(this.state.settings));
  }

  private saveFilters() {
    localStorage.setItem("todo-filters", JSON.stringify(this.state.filters));
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  getState() {
    return this.state;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const appStore = new SimpleStore();

// Hook para usar el store
export const useAppStore = <T>(selector: (state: AppStore) => T): T => {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const unsubscribe = appStore.subscribe(() => {
      forceUpdate({});
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return selector(appStore.getState());
};
