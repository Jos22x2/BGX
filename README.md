# BGX — Mensajería y Videollamadas en Tiempo Real

BGX es una plataforma web moderna de mensajería instantánea y llamadas de voz/video WebRTC peer-to-peer en tiempo real, desarrollada con **React 19**, **TypeScript**, **Tailwind CSS**, **Vite** y **Supabase** (PostgreSQL Realtime + Auth).

---

## 🚀 Despliegue en Render (Paso a Paso)

El proyecto es un frontend estático (SPA) completamente listo para desplegarse como **Static Site** en **Render**:

### 1. Subir el repositorio a GitHub / GitLab
Asegúrate de que tu código esté en un repositorio Git remoto.

### 2. Crear un Static Site en Render
1. Ve a [dashboard.render.com](https://dashboard.render.com) e inicia sesión.
2. Haz clic en **New +** y selecciona **Static Site** (o usa el botón de Blueprint con `render.yaml`).
3. Conecta tu cuenta de GitHub/GitLab y selecciona el repositorio de BGX.

### 3. Configurar Build & Environment
1. **Build & Output Settings**:
   - **Name**: `bgx` (o el nombre que prefieras)
   - **Branch**: `main`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
   *(Render también leerá la configuración automáticamente si usas `render.yaml`)*.
2. En la sección **Environment Variables**, agrega:
   - `VITE_SUPABASE_URL`: La URL de tu proyecto Supabase (ej. `https://xyzcompany.supabase.co`).
   - `VITE_SUPABASE_ANON_KEY`: La clave pública anónima (anon public key) de Supabase.
3. Haz clic en **Create Static Site** para iniciar el despliegue.

---

## 🗄️ Configuración de la Base de Datos en Supabase

1. Crea un proyecto nuevo en [supabase.com](https://supabase.com).
2. Abre la pestaña **SQL Editor** en el panel de Supabase.
3. Copia y ejecuta el script completo que se encuentra en `src/lib/supabase-schema.sql` (o desde la pestaña **Esquema SQL** dentro de la app BGX).
4. El script creará:
   - Tabla `profiles` (con sincronización automática desde `auth.users`).
   - Tablas `chats`, `chat_participants`, `messages` y `calls`.
   - Publicaciones en `supabase_realtime` para mensajería y estados.
   - Políticas RLS seguras.

---

## 💻 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Iniciar servidor de desarrollo
npm run dev
```

El servidor local se ejecutará en `http://localhost:3000`.

---

## 🛠️ Tecnologías Utilizadas

- **React 19** & **TypeScript**
- **Vite** para bundling ultrarrápido
- **Tailwind CSS v4** & **Lucide React**
- **Supabase Realtime & Auth** (PostgreSQL)
- **WebRTC API** nativo para llamadas de audio y video
