/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  // agrega aquí otras si las usas:
  // readonly VITE_CLOUDINARY_CLOUD_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}