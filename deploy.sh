#!/bin/bash

# Script de deploy automático para TODO App Full-Stack

echo "🚀 Iniciando proceso de deploy..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "Este script debe ejecutarse desde la raíz del proyecto"
    exit 1
fi

print_status "Verificando dependencias del frontend..."
npm install

print_status "Ejecutando linting..."
npm run lint:fix

print_status "Verificando tipos TypeScript..."
npm run type-check

print_status "Construyendo frontend para producción..."
npm run build

print_status "Verificando dependencias del backend..."
cd backend
npm install

print_status "Volviendo al directorio raíz..."
cd ..

print_status "Verificando archivos de configuración..."

# Verificar que existen los archivos necesarios
if [ ! -f "vercel.json" ]; then
    print_warning "vercel.json no encontrado"
fi

if [ ! -f "backend/railway.json" ]; then
    print_warning "backend/railway.json no encontrado"
fi

if [ ! -f ".env.production" ]; then
    print_warning ".env.production no encontrado"
fi

print_status "Build completado exitosamente!"
echo ""
echo -e "${GREEN}🎉 Tu proyecto está listo para deploy!${NC}"
echo ""
echo "Próximos pasos:"
echo "1. Subir código a GitHub: git add . && git commit -m 'Ready for deploy' && git push"
echo "2. Configurar Railway para el backend"
echo "3. Configurar Vercel para el frontend"
echo ""
echo "Ver DEPLOY.md para instrucciones detalladas"