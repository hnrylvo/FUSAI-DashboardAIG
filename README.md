# Dashboard de Cartera · Apoyo Integral Guatemala, S.A. (Grupo FUSAI)

> **Enterprise-grade Portfolio & Credit Risk Analytics Platform** basada en el archivo original `Dashboard_Cartera_AIG.html`, preservando el **100% de la lógica matemática, reglas de negocio, filtros globales y transformaciones de datos** con una arquitectura desacoplada full-stack y una interfaz de usuario moderna.

---

## 🏛 Arquitectura del Proyecto

El repositorio está estructurado en capas limpias y desacopladas:

```
├── backend/                  # API RESTful en Node.js + Express + TypeScript
│   ├── src/
│   │   ├── auth/             # Sesiones JWT seguras en cookies HttpOnly (SameSite=Lax)
│   │   ├── config.ts         # Validación centralizada de variables de entorno
│   │   ├── data/             # Carga de semilla desde HTML original y persistencia atómica
│   │   ├── engine/           # Motor de cálculo matemático (1:1 con el HTML original)
│   │   │   ├── core.ts       # Constantes KEYS canónicas, helpers de acceso g(r,k) y agregación
│   │   │   ├── filters.ts    # Filtros globales (7 originales) y contexto memoizado Ctx
│   │   │   ├── overview.ts   # KPIs, tendencias mensuales y colocación
│   │   │   ├── composition.ts# Distribuciones por producto y rangos de saldo
│   │   │   ├── operations.ts # Rankings TOP, días de pago (1-31), vencimientos y precobro
│   │   │   ├── retention.ts  # Deserción de clientes y matriz de rodamiento de mora
│   │   │   └── ingest.ts     # Ingesta y parseo de libros de Excel (.xls / .xlsx)
│   │   ├── http/             # Manejo estandarizado de errores HTTP y validación Zod
│   │   ├── routes/           # Endpoints modulares (/api/auth, /api/portfolio, /api/upload)
│   │   ├── app.ts            # Configuración de Express, Helmet CSP y CORS
│   │   └── server.ts         # Arranque del servidor con TZ=America/Guatemala
│   ├── scripts/
│   │   ├── parity.ts         # Test de paridad matemática (compara contra el script original)
│   │   └── hash-password.ts  # Generador de hashes bcrypt para cuentas corporativas
│   ├── .env.example          # Plantilla documentada de variables de entorno
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                 # Single Page Application en React 19 + Vite 8 + Tailwind CSS v4
│   ├── src/
│   │   ├── api/              # Cliente HTTP tipado con manejo de credenciales y errores
│   │   ├── components/
│   │   │   ├── common/       # Header institucional, FilterBar, MultiSelectDropdown, KpiCard, UploadModal
│   │   │   └── tabs/         # Vistas: OverviewTab, CompositionTab, RankingsTab, OperationsTab, RetentionTab
│   │   ├── lib/              # Formatters de Quetzales (fQ, fQ2, fPct, fN), Chart.js registry
│   │   ├── pages/            # LoginPage (split-screen) y DashboardPage
│   │   ├── routes/           # ProtectedRoute (guard de sesión) y AppRoutes
│   │   ├── store/            # Estado global con Zustand (useAuthStore, useDashboardStore)
│   │   └── types/            # Tipos e interfaces de datos
│   ├── public/               # Favicon SVG corporativo de Apoyo Integral
│   ├── index.html            # Plantilla con tipografías Inter y Plus Jakarta Sans
│   ├── package.json
│   └── vite.config.ts        # Configuración con @tailwindcss/vite y proxy reverso /api
│
├── Dashboard_Cartera_AIG.html# Archivo HTML original con datos de cartera embebidos (fuente de verdad)
├── package.json              # Scripts orquestadores del workspace
└── README.md
```

---

## ⚡ Verificación de Paridad Matemática (100% Idéntico)

Para garantizar total fidelidad financiera, el proyecto incluye un script de paridad automática (`scripts/parity.ts`). Este script ejecuta el `<script>` original de `Dashboard_Cartera_AIG.html` dentro de un entorno virtualizado de Node.js (con DOM y Chart.js simulados) y evalúa **2,428 comprobaciones independientes**:

- **Cartera total y número de clientes únicos.**
- **PAR 1** (cartera en riesgo $\ge 1$ día y clientes en mora).
- **PAR 30** (cartera en riesgo $\ge 30$ días y clientes).
- **Colocación mensual real** por tipo de crédito (evitando sesgo de cancelaciones históricas).
- **Composiciones porcentuales** por producto y bloque de saldo.
- **Rankings TOP 10** en cada uno de los 5 tramos de morosidad.
- **Distribución de días de pago (1 al 31)** en monto y clientes.
- **Vencimientos de cartera a 30 y 90 días.**
- **Precobros** (créditos con primera cuota estimada dentro de 30 días, `ucp = 0`).
- **Deserciones** de clientes al día entre cierres.
- **Matriz de rodamiento de mora** (celda por celda en clientes y en saldo Q).

Para ejecutar la verificación:

```bash
npm run test:parity
```

**Resultado:**
```
Paridad: 2428/2428 comprobaciones idénticas al HTML original.
✓ El motor nuevo reproduce exactamente el dashboard original.
```

---

## 🎨 Sistema de Diseño & UX

- **Paleta Institucional Elevada:**
  - Azul Marino Primario: `#014F84` (Acentos oscuros: `#023e68`, `#012f50`, `#001f36`).
  - Naranja Corporativo: `#F48437` (Hover/Secundario: `#e0722a`, `#ff9a54`, `#fff6ee`).
  - Semáforos de Riesgo: Verde Esmeralda `#2e9e6b`, Rojo `#d9534f`, Ámbar `#e0a500`.
  - Escala Neutra: Slate moderno (`#0f172a`, `#334155`, `#64748b`, `#cbd5e1`, `#f8fafc`, `#ffffff`).
- **Tipografía:** *Inter* y *Plus Jakarta Sans* con soporte de numerales tabulares (`tabular-nums`) para alineación contable estricta.
- **Experiencia de Usuario:** Microinteracciones fluidas, encabezados fijos adhesivos (*sticky headers*) en tablas y barra de filtros, popovers con búsqueda en tiempo real y selector *Seleccionar todas*.

---

## 🔐 Seguridad y Autenticación

1. **Gestión de Sesión:**
   - Tokens JWT firmados con algoritmo HS256 emitidos en cookies seguras `HttpOnly` con directiva `SameSite=Lax`.
   - Renovación y validación protegida por middleware en todas las rutas bajo `/api/portfolio` y `/api/upload`.
2. **Control de Acceso Basado en Roles (RBAC):**
   - **Administrador (`admin`):** Visualización completa + autorización para cargar nuevos cierres mensuales vía Excel.
   - **Analista (`analyst`):** Acceso de solo lectura a métricas, gráficos, exportaciones y matrices.
3. **Autenticación Híbrida:**
   - **Tradicional:** Validación con correo y contraseña cifrada con `bcryptjs` (cost factor 10-12).
   - **Google OAuth2:** Flujo *Authorization Code* estándar con validación de parámetro `state` anti-CSRF y restricción opcional por dominios corporativos autorizados (`GOOGLE_ALLOWED_DOMAINS`).
   - **Simulación OAuth2:** Modo para desarrollo local sin requerir credenciales de Google Cloud Console.

### Cuentas Demo de Prueba Rápida

En entorno de desarrollo se incluyen dos cuentas preconfiguradas con botones de auto-llenado en la pantalla de inicio de sesión:

| Rol | Correo Electrónico | Contraseña | Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `riesgos@apoyointegral.com.gt` | `Cartera2026!` | Visualización + Carga de Cierres |
| **Analista** | `direccion@apoyointegral.com.gt` | `Direccion2026!` | Visualización y Reportes |

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
- **Node.js** v20.x o superior.
- **npm** v10.x o superior.

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone https://github.com/hnrylvo/FUSAI-DashboardAIG.git
cd FUSAI-DashboardAIG

# Instalar dependencias del backend
cd backend && npm install

# Instalar dependencias del frontend
cd ../frontend && npm install
cd ..
```

### 2. Configurar Variables de Entorno

Copiar la plantilla en el backend:

```bash
cp backend/.env.example backend/.env
```

Configurar los valores deseados en `backend/.env`:

```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=tu_clave_secreta_jwt_de_al_menos_32_caracteres
SESSION_TTL_HOURS=8
SEED_HTML_PATH=../Dashboard_Cartera_AIG.html
DATA_DIR=./data
MAX_UPLOAD_MB=25

# Opcional: Integración real de Google OAuth2
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
GOOGLE_ALLOWED_DOMAINS=apoyointegral.com.gt,fusai.org
GOOGLE_SIMULATION=true
```

### 3. Ejecutar en Modo Desarrollo

Desde la raíz del proyecto, ejecutar ambos servicios en paralelo:

```bash
npm run dev
```

O en terminales independientes:
```bash
# Terminal 1: Backend API (puerto 4000)
npm run dev:backend

# Terminal 2: Frontend SPA (puerto 5173 con proxy reverso a :4000)
npm run dev:frontend
```

Abra su navegador en **[http://localhost:5173](http://localhost:5173)**.

---

## 📦 Compilación y Despliegue para Producción

El backend está diseñado para servir los archivos estáticos optimizados del frontend en producción, permitiendo un despliegue contenerizado o en servidor único sin requerir servidores web separados:

```bash
# 1. Compilar frontend y backend
npm run build

# 2. Iniciar servidor de producción en el puerto configurado (ej. 4000)
npm run start
```

La aplicación completa estará disponible en `http://localhost:4000/`.

---

## 📊 Endpoints de la API RESTful

### `/api/auth`
- `GET /api/auth/providers` — Consulta de proveedores de autenticación disponibles y cuentas demo.
- `POST /api/auth/login` — Autenticación con correo y contraseña.
- `POST /api/auth/logout` — Destrucción de sesión y limpieza de cookies.
- `GET /api/auth/me` — Datos del usuario autenticado.
- `GET /api/auth/google` — Inicio de flujo Google OAuth2.
- `GET /api/auth/google/callback` — Retorno y validación de tokens OAuth2.
- `POST /api/auth/google/simulate` — Autenticación simulada con cuenta corporativa.

### `/api/portfolio` *(Requiere autenticación)*
- `GET /api/portfolio/meta` — Metadatos, cierres disponibles y opciones para los 7 filtros globales.
- `POST /api/portfolio/overview` — Cálculo de los 8 KPIs principales y series de tiempo mensuales (Cartera, Clientes, PAR 1, PAR 30).
- `POST /api/portfolio/placement` — Colocación mensual acumulada por tipo de crédito.
- `POST /api/portfolio/composition` — Distribuciones por producto y por tramo de saldo de capital.
- `POST /api/portfolio/rankings/:bucket` — TOP 10 con paginación de créditos (`sana`, `b1`, `b2`, `b3`, `b4`).
- `POST /api/portfolio/operations/payment-days` — Distribución por día de pago (1 a 31).
- `POST /api/portfolio/operations/maturities` — Vencimientos próximos (30 y 90 días).
- `POST /api/portfolio/operations/pre-collection` — Alertas de precobro (primera cuota próxima).
- `POST /api/portfolio/retention/attrition` — Deserción de clientes al día entre cierres.
- `POST /api/portfolio/retention/transition` — Matriz de rodamiento de mora (clientes o saldo Q).

### `/api/upload` *(Requiere rol Administrador)*
- `POST /api/upload` — Carga masiva de archivos `.xls` o `.xlsx` con detección inteligente de fecha de corte o sobreescritura manual.

---

## 📄 Licencia y Confidencialidad

**Apoyo Integral Guatemala, S.A. · Grupo FUSAI**  
Material confidencial para uso interno exclusivo de Riesgos, Junta Directiva y entes de interés autorizados. Todos los derechos reservados.
