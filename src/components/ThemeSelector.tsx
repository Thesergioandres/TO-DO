import { Monitor, Moon, Sun } from "lucide-react";
import React from "react";
import { useAppStore } from "../stores/appStore";

const ThemeSelector: React.FC = () => {
  const theme = useAppStore(state => state.theme);
  const setTheme = useAppStore(state => state.setTheme);

  const themes = [
    { id: "light", name: "Claro", icon: Sun },
    { id: "dark", name: "Oscuro", icon: Moon },
    { id: "system", name: "Sistema", icon: Monitor },
  ] as const;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
      {themes.map(({ id, name, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setTheme(id)}
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            theme === id
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          }`}
          title={`Cambiar a tema ${name.toLowerCase()}`}
        >
          <Icon size={16} />
          <span className="hidden sm:inline">{name}</span>
        </button>
      ))}
    </div>
  );
};

export default ThemeSelector;
