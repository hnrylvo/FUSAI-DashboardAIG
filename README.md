# Dashboard de Cartera · Apoyo Integral Guatemala, S.A. (Grupo FUSAI)

> **Enterprise-grade Portfolio & Credit Risk Analytics Platform** migrado y desacoplado del archivo legado `Dashboard_Cartera_AIG.html`, preservando el **100% de la lógica matemática, reglas de negocio, filtros globales y transformaciones de datos** con una arquitectura desacoplada full-stack y una interfaz de usuario moderna en React 19 + TypeScript.

---

## 🏛 Arquitectura del Proyecto

El repositorio está estructurado en capas limpias y desacopladas:

```
├── backend/                  # API RESTful en Node.js + Express + TypeScript
│   ├── data/                 # Semilla canónica de cierres (seed.json) y almacenamiento de reportes
│   ├── src/
│   │   ├── auth/             # Sesiones JWT seguras en cookies HttpOnly (SameSite=Lax)
│   │   ├── config.ts         # Validación centralizada de variables de entorno
│   │   ├── data/             # Carga de semilla desde seed.json y persistencia atómica
│   │   ├── db/               # Integración directa con base de datos on-premises (SQL Server)
│   │   │   ├── pool.ts       # Pool seguro con reconexión, health-checks y TLS obligatorio
│   │   │   ├── readonly.ts   # Guardia de solo lectura estricta (rechaza mutaciones)
│   │   │   └── repository.ts # Repositorio de consultas SELECT parametrizadas
│   │   ├── engine/           # Motor de cálculo matemático (1:1 con el motor analítico original)
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
│   │   ├── fixtures/         # Fixture del script legacy para verificación de paridad
│   │   ├── db-check.ts       # Diagnóstico de conexión TCP, TLS y permisos de base de datos
│   │   ├── parity.ts         # Test de paridad matemática (compara contra el script de referencia)
│   │   └── hash-password.ts  # Generador de hashes bcrypt para cuentas corporativas
│   ├── .env.example          # Plantilla documentada de variables de entorno
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                 # Single Page Application en React 19 + Vite 8 + Tailwind CSS v4
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/       # CarteraTrendChart, MoraTrendChart, ColocacionChart, PaymentDaysChart, CompositionDoughnutChart
│   │   │   ├── layout/       # Header, Sidebar, FilterBar, Footer, LayoutWrapper
│   │   │   └── ui/           # Button, Card, Badge, Skeleton, KpiCard, CustomChartLegend, MultiSelectDropdown
│   │   ├── hooks/            # usePortfolioData, useFilters, usePagination
│   │   ├── pages/
│   │   │   ├── Dashboard/    # OverviewSection, CompositionSection, RankingsSection, OperationsSection, RetentionSection
│   │   │   └── Login/        # LoginPage modular
│   │   ├── routes/           # ProtectedRoute (guard de sesión) y AppRoutes
│   │   ├── services/         # api client modular
│   │   ├── store/            # Estado global con Zustand (useAuthStore, useDashboardStore)
│   │   ├── styles/           # Tokens institucionales y tema Tailwind
│   │   ├── types/            # Tipos e interfaces de datos estrictamente tipadas
│   │   └── utils/            # formatters, mockData (anónimo) y portfolioCalculations (motor cliente)
│   ├── public/               # Favicon SVG corporativo de Apoyo Integral
│   ├── index.html            # Plantilla con tipografías Inter y Plus Jakarta Sans
│   ├── package.json
│   └── vite.config.ts        # Configuración con @tailwindcss/vite y proxy reverso /api
│
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
   - **Google OAuth 2.0 (Sign-In with Google):** Flujo de producción con el componente oficial `<GoogleLogin />` (`@react-oauth/google`) en React y verificación criptográfica estricta en el servidor Node.js mediante `google-auth-library`. Valida audiencia (`aud`), emisor (`iss`), expiración (`exp`) y restricción por dominios corporativos autorizados (`GOOGLE_ALLOWED_DOMAINS`).
   - **Simulación OAuth2:** Modo fallback para desarrollo local cuando no hay conexión a internet o credenciales configuradas.

### Cuentas Demo de Prueba Rápida

En entorno de desarrollo se incluyen dos cuentas preconfiguradas con botones de auto-llenado en la pantalla de inicio de sesión:

| Rol | Correo Electrónico | Contraseña | Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `riesgos@apoyointegral.com.gt` | `Cartera2026!` | Visualización + Carga de Cierres |
| **Analista** | `direccion@apoyointegral.com.gt` | `Direccion2026!` | Visualización y Reportes |

---

## 🗄️ Conexión Directa a Base de Datos On-Premises (SQL Server)

El backend de Node.js integra un cliente de base de datos de alto rendimiento y grado bancario para sincronizar dinámicamente la cartera activa y los catálogos institucionales directamente desde el servidor on-premises de Apoyo Integral Guatemala (`192.168.1.81`).

### 1. Política Estricta de Solo Lectura (Zero-Write Policy)
- **Defensa en Profundidad:** El backend aplica una guardia estricta (`src/db/readonly.ts`) que analiza todo texto SQL antes de enviarlo al socket de red. Rechaza de forma inmediata e incondicional cualquier sentencia que no sea un `SELECT` (o `WITH ... SELECT`) y bloquea palabras clave como `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `EXEC`, `MERGE` o sentencias transaccionales (`BEGIN`, `COMMIT`, `ROLLBACK`).
- **Permisos de Base de Datos:** El usuario corporativo asignado (`HenryAIG`) está restringido a permisos estrictos de consulta (`db_datareader` en `RESUMENAIG`).
- **Consultas Parametrizadas:** Todos los filtros y parámetros dinámicos se transmiten mediante parámetros tipados (`sql.NVarChar`, `sql.Int`), eliminando por diseño cualquier riesgo de inyección SQL.

### 2. Seguridad en Capa de Transporte (Cifrado End-to-End TLS / SSL)
- **Cifrado de Socket DB:** La conexión con SQL Server (`192.168.1.81:1433`) negocia obligatoriamente cifrado `TLSv1.2` (`DB_ENCRYPT=true` o modo `strict` para TDS 8.0).
- **Validación de Cifrado en Servidor:** Al conectar, el pool verifica contra `sys.dm_exec_connections` que `encrypt_option = TRUE`.
- **Credenciales Seguras:** Las credenciales nunca están presentes en el código fuente; se leen exclusivamente desde variables de entorno (`backend/.env`), excluido del repositorio mediante `.gitignore`.
- **API Segura:** La capa API admite ejecución nativa sobre HTTPS (`HTTPS_ENABLED=true`) o terminación TLS mediante reverse proxy corporativo, transmitiendo la sesión JWT mediante cookies `HttpOnly; SameSite=Lax`.

### 3. Pool de Conexiones & Resiliencia
- **Pool de Conexiones:** Mínimo de 2 y máximo de 10 conexiones simultáneas (`DB_POOL_MIN`, `DB_POOL_MAX`), reutilizando sockets y evitando sobrecargar el motor de base de datos.
- **Reconexión Automática con Backoff Exponencial:** Si la red local o la VPN fluctúan, el cliente reintenta la conexión hasta 5 veces con intervalos de retroceso progresivo y jitter aleatorio.
- **Health-Checks Periódicos:** Sondeo continuo mediante `SELECT 1` para detectar conexiones inactivas y medir la latencia en tiempo real.
- **Graceful Shutdown:** Al recibir señales `SIGINT` o `SIGTERM`, el servidor drena ordenadamente el pool sin interrumpir lecturas activas.

### 4. Diagnóstico de Conexión y Catálogo de BD
Para validar la conectividad, el cifrado TLS y los permisos sin necesidad de levantar el servidor web:

```bash
# Diagnóstico rápido de conexión y salud del pool
npm run db:check

# Exploración del catálogo de tablas y vistas en la base de datos
npm run db:check -- --discover
```

### 5. Guía de Red, VPN y Firewall (LAN 192.168.1.x)
Si el diagnóstico reporta `TCP 192.168.1.81:1433 NO alcanzable`:
1. **Verificar Conexión de Red:** Asegúrese de estar conectado físicamente a la red LAN de la oficina o con la VPN institucional activa (acceso a la subred `192.168.1.0/24`).
2. **Ruta IP Local:** Compruebe que su adaptador de red tiene ruta hacia el gateway:
   ```powershell
   Test-NetConnection -ComputerName 192.168.1.81 -Port 1433
   ```
3. **Regla de Firewall de Windows:** En el servidor de base de datos, el puerto `1433 TCP` debe estar permitido en el perfil de red privada/dominio:
   ```powershell
   New-NetFirewallRule -DisplayName "SQL Server (TCP 1433)" -Direction Inbound -LocalPort 1433 -Protocol TCP -Action Allow
   ```
4. **Habilitación de TCP/IP en SQL Server Configuration Manager:** En el servidor on-premises, verifique que en *SQL Server Network Configuration -> Protocols for [Instance]*, el protocolo `TCP/IP` esté en estado **Enabled** y escuchando en el puerto `1433`.

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
- `GET /api/auth/providers` — Consulta de proveedores de autenticación disponibles, Client ID público y cuentas demo.
- `POST /api/auth/login` — Autenticación con correo y contraseña.
- `POST /api/auth/google` — Verificación del ID Token de Google (`credential`) con `google-auth-library` y generación de sesión.
- `POST /api/auth/logout` — Destrucción de sesión y limpieza de cookies.
- `GET /api/auth/me` — Datos del usuario autenticado.
- `GET /api/auth/google` — Inicio de flujo alternativo Google OAuth2 por redirección.
- `GET /api/auth/google/callback` — Retorno y validación de tokens OAuth2 por código de autorización.
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
- `GET /api/portfolio/db/status` — Estado de salud del pool, latencia en ms, verificación TLS y confirmación de política de solo lectura.
- `POST /api/portfolio/db/refresh` — Sincronización dinámica bajo demanda desde SQL Server (actualiza el cierre activo sin reiniciar el servicio).
- `GET /api/portfolio/db/clients` — Paginación y búsqueda parametrizada de registros de clientes (`page`, `pageSize`, `search`).
- `GET /api/portfolio/db/branches` — Listado de agencias con métricas agregadas de cartera y saldo total.
- `GET /api/portfolio/db/officers` — Catálogo de asesores y gestores de cobro.
- `GET /api/portfolio/db/snapshots` — Historial de cortes y snapshots de análisis detectados en la base de datos.

### `/api/upload` *(Requiere rol Administrador)*
- `POST /api/upload` — Carga masiva de archivos `.xls` o `.xlsx` con detección inteligente de fecha de corte o sobreescritura manual.

---

## 📄 Licencia y Confidencialidad

**Apoyo Integral Guatemala, S.A. · Grupo FUSAI**  
Material confidencial para uso interno exclusivo de Riesgos, Junta Directiva y entes de interés autorizados. Todos los derechos reservados.
