# TODO App Full-Stack 🚀

Una aplicación completa de gestión de tareas (TODO) con **React**, **TypeScript**, **TailwindCSS**, **Node.js**, **Express** y **SQLite**. Incluye autenticación de usuarios, sincronización offline/online, y todas las características avanzadas de productividad.

## ✨ Características Principales

### 🎯 Gestión de Tareas

- ✅ Crear, editar, eliminar y completar tareas
- 🏷️ Categorías personalizables con iconos
- ⚡ 4 niveles de prioridad (Baja, Media, Alta, Urgente)
- � Fechas de vencimiento con alertas
- 🏷️ Sistema de etiquetas (tags)
- 📝 Descripciones detalladas

### 🔍 Búsqueda y Filtros

- � Búsqueda en tiempo real por título y descripción
- � Filtros por categoría, prioridad y estado
- 📅 Filtros por fecha de vencimiento
- �️ Filtros por etiquetas

### 📊 Estadísticas y Análisis

- 📈 Panel de estadísticas en tiempo real
- 📊 Gráficos de progreso por categoría
- ⏱️ Análisis de productividad
- 🎯 Metas y objetivos

### 🎨 Interfaz de Usuario

- 🌙 Tema claro/oscuro automático
- 📱 Diseño responsive (móvil, tablet, escritorio)
- ⚡ Animaciones fluidas
- 🎨 Interfaz moderna con TailwindCSS
- ♿ Accesibilidad completa

### 🔐 Autenticación y Usuarios

- 📝 Registro de usuarios
- 🔑 Inicio de sesión seguro
- 🛡️ Autenticación JWT
- 👤 Perfiles de usuario
- 🔒 Protección de rutas

### 🔄 Sincronización

- 📶 Detección automática de conectividad
- 💾 Funcionalidad offline completa
- 🔄 Sincronización automática al reconectar
- ⚠️ Resolución de conflictos
- 💾 Backup local automático

### 📤 Importar/Exportar

- 📁 Exportar a JSON
- 📥 Importar desde JSON
- 💾 Backup automático
- 🔄 Migración de datos

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js 18+
- npm 9+

### 1. Instalar dependencias del Frontend

```bash
npm install
```

### 2. Instalar dependencias del Backend

```bash
cd backend
npm install
```

### 3. Configurar variables de entorno

Crear archivo `.env` en la carpeta `backend`:

```env
# Puerto del servidor
PORT=3001

# JWT Secret (cambiar en producción)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# Base de datos
DB_PATH=./database/todos.db

# CORS
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Entorno
NODE_ENV=development
```

### 4. Iniciar los servidores

**Backend (puerto 3001):**

```bash
cd backend
npm start
```

**Frontend (puerto 3000):**

```bash
npm run dev
```

### 5. Acceder a la aplicación

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/api/health

## �️ Arquitectura Técnica

### Frontend

- **React 19** - Librería de interfaz de usuario
- **TypeScript** - Tipado estático
- **TailwindCSS** - Framework de estilos
- **Vite** - Bundler y servidor de desarrollo
- **SQL.js** - Base de datos SQLite en el navegador

### Backend

- **Node.js** - Runtime de JavaScript
- **Express** - Framework web
- **SQLite3** - Base de datos
- **JWT** - Autenticación de tokens
- **bcrypt** - Hashing de contraseñas
- **CORS** - Compartir recursos entre orígenes

## 📚 API Endpoints

### Autenticación

- `POST /api/users/register` - Registro de usuario
- `POST /api/users/login` - Inicio de sesión
- `GET /api/users/verify` - Verificar token

### Gestión de TODOs

- `GET /api/todos` - Obtener todas las tareas
- `POST /api/todos` - Crear nueva tarea
- `PUT /api/todos/:id` - Actualizar tarea
- `DELETE /api/todos/:id` - Eliminar tarea
- `GET /api/todos/stats` - Estadísticas

### Sincronización

- `POST /api/sync/upload` - Subir cambios locales
- `GET /api/sync/download` - Descargar cambios del servidor
- `GET /api/sync/status` - Estado de sincronización
- `POST /api/sync/resolve-conflict` - Resolver conflictos

## 🛡️ Seguridad

- 🔐 Autenticación JWT con refresh tokens
- 🛡️ Validación de entrada en frontend y backend
- 🔒 Rate limiting para prevenir ataques
- 🛡️ Helmet.js para headers de seguridad
- 🔐 Hashing seguro de contraseñas con bcrypt
- ⚡ CORS configurado apropiadamente

## 🔄 Funcionalidad Offline

1. **Detección de conectividad**: Monitor automático del estado de la red
2. **Almacenamiento local**: SQLite en el navegador para datos offline
3. **Sincronización inteligente**: Merge automático de cambios al reconectar
4. **Resolución de conflictos**: UI para resolver conflictos de datos
5. **Backup automático**: Guardado local de seguridad

## 🏗️ Estructura del Proyecto

```
react-tailwindcss/
├── backend/                 # Servidor Node.js/Express
│   ├── database/           # Configuración de base de datos
│   ├── middleware/         # Middlewares personalizados
│   ├── routes/            # Rutas del API
│   ├── .env               # Variables de entorno
│   ├── package.json       # Dependencias del backend
│   └── server.js          # Servidor principal
├── src/                   # Frontend React
│   ├── components/        # Componentes React
│   ├── hooks/             # React Hooks personalizados
│   ├── services/          # Servicios
│   ├── types/             # Definiciones TypeScript
│   ├── utils/             # Utilidades
│   └── AppWithAuth.tsx    # Componente principal con auth
├── package.json           # Dependencias del frontend
├── vite.config.ts         # Configuración de Vite
├── tailwind.config.ts     # Configuración de TailwindCSS
└── README.md             # Esta documentación
```

## 🎯 Estado Actual

✅ **COMPLETADO:**

- Frontend completo con React + TypeScript + TailwindCSS
- Backend Node.js + Express + SQLite
- Autenticación JWT completa
- Sincronización offline/online
- Resolución de conflictos
- Sistema de categorías y prioridades
- Búsqueda y filtros avanzados
- Estadísticas en tiempo real
- Tema claro/oscuro
- Diseño responsive
- Exportar/Importar datos

🚀 **SERVIDORES ACTIVOS:**

- Backend: http://localhost:3001 ✅
- Frontend: http://localhost:3000 ✅

---

⭐ **¡Aplicación TODO completa con todas las características avanzadas!** ⭐
