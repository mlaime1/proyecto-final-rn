# Proyecto Final - React Native + Expo + TypeScript

## Descripción

Proyecto React Native con Expo y TypeScript para desarrollo mobile multiplataforma.

## Estructura del Proyecto

- `app/` - Pantallas principales de la aplicación (Expo Router)
- `components/` - Componentes reutilizables
- `hooks/` - Custom React hooks
- `constants/` - Constantes y configuraciones
- `assets/` - Imágenes y recursos estáticos
- `scripts/` - Scripts de utilidad

## Comandos Disponibles

- `npm start` - Iniciar servidor de desarrollo
- `npm run android` - Ejecutar en Android
- `npm run ios` - Ejecutar en iOS (requiere macOS)
- `npm run web` - Ejecutar en navegador web
- `npm run lint` - Verificar código (ESLint)
- `npm run format` - Formatear código (Prettier)
- `npm run reset-project` - Resetear el proyecto

## TypeScript

El proyecto está completamente configurado con TypeScript.

- `tsconfig.json` - Configuración de TypeScript
- Modo strict habilitado
- Rutas de importación configuradas con `@/*`

## Desarrollo

Para comenzar el desarrollo:

1. `npm install` - Instalar dependencias (ya completado)
2. `npm start` - Iniciar servidor de desarrollo
3. Escanear QR con Expo Go app (disponible en App Store/Google Play)

## Tecnologías Usadas

- React 19.1.0
- React Native 0.81.5
- Expo 54.0.33
- Expo Router 6.0.23
- React Navigation 7.x
- TypeScript 5.9.2
- Zustand 5.0.8 - Gestión de estado
- AsyncStorage 2.2.0 - Almacenamiento local
- ESLint 9.x - Linting con TypeScript
- Prettier 3.6.2 - Formateo de código
