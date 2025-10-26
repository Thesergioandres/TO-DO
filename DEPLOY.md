# 🚀 Guía de Despliegue: Vercel + Railway

## 📋 Resumen

- **Frontend**: Vercel (React + TypeScript + TailwindCSS)
- **Backend**: Railway (Node.js + Express + SQLite)

## 🚀 PASO 1: Preparar el código

### 1.1 Crear repositorio en GitHub

```bash
# En la carpeta del proyecto
git init
git add .
git commit -m "Initial commit: TODO App Full-Stack"

# Crear repositorio en GitHub y conectar
git remote add origin https://github.com/TU-USUARIO/todo-app-fullstack.git
git branch -M main
git push -u origin main
```

## 🔧 PASO 2: Desplegar Backend en Railway

### 2.1 Crear cuenta en Railway

1. Ir a [railway.app](https://railway.app)
2. Registrarse con GitHub
3. Autorizar Railway

### 2.2 Crear nuevo proyecto

1. Click en "New Project"
2. Seleccionar "Deploy from GitHub repo"
3. Elegir tu repositorio `todo-app-fullstack`
4. Railway detectará automáticamente el backend

### 2.3 Configurar variables de entorno

En el dashboard de Railway, ir a "Variables" y agregar:

```env
NODE_ENV=production
JWT_SECRET=tu-secreto-super-seguro-cambiar-en-produccion-12345
JWT_REFRESH_SECRET=tu-secreto-refresh-super-seguro-67890
FRONTEND_URL=https://tu-app.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2.4 Configurar el directorio raíz

1. En "Settings" → "Source"
2. Cambiar "Root Directory" a `/backend`
3. Railway redesplegará automáticamente

### 2.5 Obtener URL del backend

- Railway te dará una URL como: `https://tu-proyecto.railway.app`
- **¡Guarda esta URL!** La necesitarás para el frontend

## 🌐 PASO 3: Desplegar Frontend en Vercel

### 3.1 Crear cuenta en Vercel

1. Ir a [vercel.com](https://vercel.com)
2. Registrarse con GitHub
3. Autorizar Vercel

### 3.2 Importar proyecto

1. Click en "Add New" → "Project"
2. Importar desde GitHub
3. Seleccionar tu repositorio `todo-app-fullstack`

### 3.3 Configurar el proyecto

```
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### 3.4 Configurar variables de entorno

En "Environment Variables" agregar:

```env
VITE_API_URL=https://tu-proyecto.railway.app/api
NODE_ENV=production
```

**⚠️ IMPORTANTE**: Reemplaza `tu-proyecto.railway.app` con la URL real de Railway

### 3.5 Deploy

1. Click en "Deploy"
2. Vercel construirá y desplegará automáticamente
3. Te dará una URL como: `https://tu-app.vercel.app`

## 🔄 PASO 4: Actualizar URLs cruzadas

### 4.1 Actualizar Railway

1. Ir al dashboard de Railway
2. En "Variables", actualizar:

```env
FRONTEND_URL=https://tu-app.vercel.app
```

### 4.2 Verificar Vercel

- Asegúrate de que `VITE_API_URL` apunte a tu Railway URL

## ✅ PASO 5: Probar la aplicación

### 5.1 Verificar backend

- Ir a: `https://tu-proyecto.railway.app/api/health`
- Deberías ver: `{"status":"OK","timestamp":"...","version":"1.0.0"}`

### 5.2 Verificar frontend

- Ir a: `https://tu-app.vercel.app`
- Registrar una cuenta nueva
- Crear tareas
- Verificar sincronización

## 🔧 PASO 6: Configuración adicional (Opcional)

### 6.1 Dominio personalizado en Vercel

1. En Vercel → "Settings" → "Domains"
2. Agregar tu dominio personalizado
3. Configurar DNS según las instrucciones

### 6.2 Dominio personalizado en Railway

1. En Railway → "Settings" → "Domains"
2. Agregar tu subdominio para API
3. Actualizar `VITE_API_URL` en Vercel

## 🛠️ PASO 7: Automatización CI/CD

### 7.1 Auto-deploy configurado

- **Vercel**: Se despliega automáticamente en cada push a `main`
- **Railway**: Se redespliega automáticamente en cada push

### 7.2 Ramas de desarrollo

```bash
# Crear rama de desarrollo
git checkout -b develop

# Railway y Vercel pueden detectar ramas y crear deploys de preview
```

## 🚨 Solución de problemas comunes

### Error de CORS

- Verificar que `FRONTEND_URL` en Railway sea correcto
- Revisar que no haya espacios extra en las URLs

### Error 500 en backend

- Verificar variables de entorno en Railway
- Revisar logs en Railway dashboard

### Frontend no se conecta al backend

- Verificar que `VITE_API_URL` esté correcto
- Verificar que Railway esté funcionando

### Base de datos no funciona

- Railway puede recrear el contenedor, usar variables persistentes
- Considerar migrar a PostgreSQL para producción

## 📊 Monitoreo

### Railway

- Dashboard muestra CPU, RAM, requests
- Logs en tiempo real disponibles

### Vercel

- Analytics integrados
- Métricas de rendimiento

## 💰 Costos

### Gratis incluye:

- **Vercel**: 100GB bandwidth, dominios .vercel.app
- **Railway**: $5 de crédito mensual, 512MB RAM

### Para actualizar:

- **Vercel Pro**: $20/mes (más bandwidth y features)
- **Railway**: Pay-as-you-go después del crédito gratis

## 🎉 ¡Listo!

Tu aplicación TODO Full-Stack está ahora desplegada en internet con:

- ✅ Frontend optimizado en Vercel
- ✅ Backend escalable en Railway
- ✅ Base de datos SQLite funcional
- ✅ Autenticación JWT
- ✅ Sincronización offline/online
- ✅ HTTPS automático
- ✅ CI/CD configurado

¡Comparte tu URL con el mundo! 🌍
