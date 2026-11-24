# Petesh Social Media

Aplicación web para compartir fotografías e interactuar dentro de una comunidad privada. La desarrollé con React y TypeScript, utilizando Supabase para la autenticación y los datos de usuarios, comentarios y mensajes, y Cloudinary para servir las imágenes del álbum.

El proyecto nació como un álbum digital para un grupo específico y fue incorporando funciones de interacción social.

## Tecnologías

- **React 18 y TypeScript:** interfaz y componentes.
- **Vite:** entorno de desarrollo y compilación.
- **Supabase:** autenticación, perfiles, comentarios y mensajería.
- **Supabase Realtime:** recepción de nuevos mensajes mediante suscripciones a cambios en la base de datos.
- **Cloudinary:** entrega y optimización de imágenes.
- **CSS:** estilos y adaptación de la interfaz a distintos tamaños de pantalla.

## Funcionalidades implementadas

- Galería de fotografías con visualización ampliada en un modal.
- Inicio de sesión con Google mediante Supabase Auth.
- Perfil de usuario con nombre visible y avatar; opción para modificar el alias.
- Comentarios en fotografías, respuestas anidadas y eliminación de comentarios desde la interfaz.
- Mensajes privados entre usuarios, con actualización de nuevos mensajes mediante Supabase Realtime.
- Chat en panel lateral y navegación adaptada a pantallas estrechas.

> **Estado del proyecto:** versión de portafolio en desarrollo. Algunas funciones requieren la configuración de Supabase y sus políticas de acceso. El selector «Más comentadas» aparece en la interfaz, pero el ordenamiento por número de comentarios está pendiente de implementar.

## Estructura principal

```text
src/
├── components/
│   ├── AccountMenu.tsx
│   ├── Chat.tsx
│   ├── ChatDrawer.tsx
│   ├── Comments.tsx
│   ├── FloatingChatButton.tsx
│   ├── GalleryGrid.tsx
│   └── PhotoModal.tsx
├── data/
│   └── photos.ts
├── hooks/
│   └── useAuth.ts
├── lib/
│   ├── cloudinary.ts
│   └── supabaseClient.ts
├── providers/
│   └── AuthProvider.tsx
├── App.tsx
└── index.css
```

## Ejecutar el proyecto localmente

**Requisitos:** Node.js y npm; un proyecto de Supabase configurado con los recursos que utiliza la aplicación.

1. Clonar el repositorio:

   ```bash
   git clone https://github.com/WillFran/Petesh-Social-Media.git
   cd Petesh-Social-Media
   ```

2. Instalar las dependencias:

   ```bash
   npm install
   ```

3. Crear un archivo `.env` en la raíz:

   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu_clave_publicable
   ```

4. Iniciar el servidor:

   ```bash
   npm run dev
   ```

La aplicación también requiere configurar el proveedor Google en Supabase Auth y las tablas/políticas correspondientes a `profiles`, `comments` y `messages`. El repositorio no incluye por ahora una migración que permita recrear automáticamente toda la base de datos.

## Capturas

Se agregarán capturas de la galería, los comentarios y el chat después de revisar que no aparezca información de otros usuarios.

## Pendientes

- Implementar realmente el ordenamiento de fotografías por cantidad de comentarios.
- Añadir migraciones SQL y documentación de políticas RLS de Supabase.
- Incorporar pruebas para los flujos principales.
- Revisar la experiencia de navegación y los estados de carga/error.

## Autor

**WillFran** — [GitHub](https://github.com/WillFran)
