# 📝 URLs y Configuración para Deploy

## 🔗 URLs importantes

### 🌐 Plataformas de deploy

- **Vercel**: https://vercel.com
- **Railway**: https://railway.app

### 📋 Repositorio GitHub

- Crear en: https://github.com/new
- Nombre sugerido: `todo-app-fullstack`

## 🔧 Variables de entorno que necesitarás

### Para Railway (Backend)

```env
NODE_ENV=production
JWT_SECRET=tu-secreto-super-seguro-cambiar-12345
JWT_REFRESH_SECRET=tu-secreto-refresh-super-seguro-67890
FRONTEND_URL=https://[TU-APP].vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Para Vercel (Frontend)

```env
VITE_API_URL=https://[TU-PROYECTO].railway.app/api
NODE_ENV=production
```

## 📋 Checklist de Deploy

### ✅ Preparación

- [ ] Código funcionando localmente
- [ ] Git inicializado
- [ ] Repositorio en GitHub creado
- [ ] Código subido a GitHub

### ✅ Railway (Backend)

- [ ] Cuenta creada en Railway
- [ ] Proyecto creado desde GitHub
- [ ] Root directory configurado: `/backend`
- [ ] Variables de entorno agregadas
- [ ] Deploy exitoso
- [ ] URL del backend copiada

### ✅ Vercel (Frontend)

- [ ] Cuenta creada en Vercel
- [ ] Proyecto importado desde GitHub
- [ ] Variables de entorno configuradas
- [ ] Deploy exitoso
- [ ] URL del frontend copiada

### ✅ Configuración cruzada

- [ ] FRONTEND_URL actualizada en Railway
- [ ] VITE_API_URL actualizada en Vercel
- [ ] Ambos servicios redeployados

### ✅ Testing

- [ ] Backend health check funciona: `/api/health`
- [ ] Frontend carga correctamente
- [ ] Registro de usuario funciona
- [ ] Login funciona
- [ ] CRUD de todos funciona
- [ ] Sincronización funciona

## 🚨 Comandos útiles

### Preparar para deploy

```bash
npm run deploy:check
```

### Build local para testing

```bash
npm run build
npm run preview
```

### Ver logs en Railway

```bash
railway logs --follow
```

### Deploy manual en Vercel

```bash
npx vercel --prod
```

## 🔍 Debugging

### Si el frontend no conecta con el backend:

1. Verificar que VITE_API_URL esté correcto
2. Verificar que Railway esté corriendo
3. Revisar CORS en el backend
4. Verificar que FRONTEND_URL en Railway sea correcto

### Si hay errores de autenticación:

1. Verificar JWT_SECRET en Railway
2. Revisar que no haya espacios en las variables
3. Verificar timestamps entre frontend y backend

### Si la base de datos no funciona:

1. Railway puede reiniciar contenedores
2. Los datos se pueden perder en SQLite
3. Considerar migrar a PostgreSQL para persistencia

## 🎯 URLs finales

Una vez deployado, tendrás:

- **Frontend**: https://[TU-APP].vercel.app
- **Backend**: https://[TU-PROYECTO].railway.app
- **API Health**: https://[TU-PROYECTO].railway.app/api/health

## 🔄 Auto-deploy

Ambas plataformas se actualizarán automáticamente cuando hagas `git push` a la rama `main`.
