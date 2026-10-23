# Dashboard de Cartera · Apoyo Integral Guatemala, S.A. (Grupo FUSAI)

![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)
![SQL Server](https://img.shields.io/badge/SQL_Server-On--Premises-CC292B?logo=microsoftsqlserver&logoColor=white)
![Parity](https://img.shields.io/badge/Paridad_Matemática-2428%2F2428_Checks-success)

> **Enterprise-grade Portfolio & Credit Risk Analytics Platform** desarrollada para **Apoyo Integral Guatemala, S.A. (Grupo FUSAI)**. Plataforma modular de analítica financiera y riesgo crediticio con autenticación corporativa exclusiva mediante **Google Workspace**, sincronización directa en caliente con **Microsoft SQL Server on-premises** y un motor de cálculo financiero que garantiza el **100% de paridad matemática** frente a las reglas de negocio institucionales.

---

## 📑 Tabla de Contenidos
1. [Arquitectura del Sistema](#-arquitectura-del-sistema)
2. [Autenticación Corporativa Exclusiva (Google Sign-In)](#-autenticación-corporativa-exclusiva-google-sign-in)
3. [Verificación de Paridad Matemática (100% Idéntico)](#-verificación-de-paridad-matemática-100-idéntico)
4. [Conexión Directa a Base de Datos On-Premises (SQL Server)](#-conexión-directa-a-base-de-datos-on-premises-sql-server)
5. [Sistema de Diseño & Experiencia de Usuario (UI/UX)](#-sistema-de-diseño--experiencia-de-usuario-uiux)
6. [Instalación y Configuración](#-instalación-y-configuración)
7. [Guía de Scripts Disponibles](#-guía-de-scripts-disponibles)
8. [Catálogo de Endpoints API](#-catálogo-de-endpoints-api)
9. [Compilación y Despliegue en Producción](#-compilación-y-despliegue-en-producción)

---

## 🏛 Arquitectura del Sistema

El proyecto está diseñado bajo un modelo desacoplado full-stack en TypeScript, habiendo eliminado cualquier dependencia de archivos monolíticos HTML y estructurado en capas mantenibles, testeables y de alta cohesión:

```text
├── backend/                             # API RESTful en Node.js + Express + TypeScript
│   ├── data/
│   │   └── seed.json                    # Cierres canónicos semilla (1.53 MB, 9 cortes)
│   ├── src/
│   │   ├── auth/                        # Sesiones seguras JWT en cookies HttpOnly (SameSite=Lax)
│   │   │   └── session.ts               # Firmado criptográfico HS256, lectura y guardias
│   │   ├── config.ts                    # Validación centralizada de variables de entorno
│   │   ├── data/
│   │   │   ├── store.ts                 # Store atómico en memoria con versionado y persistencia
│   │   │   └── users.ts                 # Modelado de usuario Google Identity
│   │   ├── db/                          # Conexión directa a SQL Server On-Premises (RESUMENAIG)
│   │   │   ├── pool.ts                  # Pool resiliente TLSv1.2 con backoff exponencial y health-check
│   │   │   ├── readonly.ts              # Guardia estricta de solo lectura (rechaza mutaciones)
│   │   │   ├── repository.ts            # Consultas SELECT parametrizadas y normalización canónica
│   │   │   ├── vintageBaseline.ts       # Dataset baseline tipado en código de cosechas y cierres históricos
│   │   │   └── vintageRepository.ts     # Repositorio de cosechas con enriquecimiento dinámico desde SQL Server
│   │   ├── engine/                      # Motor analítico y financiero (25 columnas canónicas)
│   │   │   ├── core.ts                  # Columnas canónicas KEYS, helpers de agregación g(r,k)
│   │   │   ├── filters.ts               # Filtros globales, contexto memoizado Ctx y normalización
│   │   │   ├── overview.ts              # Cálculo de KPIs (Cartera, PAR1, PAR30) y series mensuales
│   │   │   ├── composition.ts           # Distribuciones por producto y tramos de saldo
│   │   │   ├── operations.ts            # Rankings TOP 10, días de pago (1-31), vencimientos y precobro
│   │   │   ├── retention.ts             # Deserción de clientes y matriz de rodamiento de mora
│   │   │   └── ingest.ts                # Ingesta y parseo seguro de libros Excel (.xls / .xlsx)
│   │   ├── http/                        # Manejador de errores RFC 7807 y validación Zod
│   │   ├── routes/                      # Endpoints modulares (/api/auth, /api/portfolio, /api/vintage, /api/upload)
│   │   │   ├── auth.ts                  # Flujo de autenticación corporativa Google Sign-In
│   │   │   ├── portfolio.ts             # Analítica de cartera activa, KPIs y consultas DB
│   │   │   ├── vintage.ts               # Endpoints de Vintage de Cosechas y Matrices de Transición
│   │   │   └── upload.ts                # Ingesta y reemplazo seguro de cierres en Excel
│   │   ├── app.ts                       # Configuración de Express, Helmet CSP y CORS
│   │   └── server.ts                    # Servidor con zona horaria America/Guatemala
│   ├── scripts/
│   │   ├── fixtures/legacyScript.js     # Script de referencia canónica para test de paridad
│   │   ├── parity.ts                    # Suite de 2,428 comprobaciones matemáticas automatizadas
│   │   └── db-check.ts                  # Diagnóstico de socket TCP, handshake TLS y permisos DB
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                            # Single Page Application en React 19 + Vite 8 + Tailwind CSS v4
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts                # Cliente API unificado con Axios, endpoints y tipado estricto
│   │   ├── components/
│   │   │   ├── charts/                  # Componentes Chart.js encapsulados y responsivos
│   │   │   │   ├── CarteraTrendChart.tsx
│   │   │   │   ├── MoraTrendChart.tsx
│   │   │   │   ├── ColocacionChart.tsx
│   │   │   │   ├── PaymentDaysChart.tsx
│   │   │   │   └── CompositionDoughnutChart.tsx
│   │   │   ├── layout/                  # Estructura del layout institucional
│   │   │   │   ├── Header.tsx           # Barra institucional con perfil Google y botón de sincronización DB
│   │   │   │   ├── Sidebar.tsx          # Drawer lateral colapsable con navegación por vistas (incluye Cosechas)
│   │   │   │   ├── FilterBar.tsx        # Barra fija de filtros globales con multiselección
│   │   │   │   ├── Footer.tsx           # Pie institucional FUSAI
│   │   │   │   └── LayoutWrapper.tsx    # Contenedor orquestador responsivo con ancho adaptativo
│   │   │   └── ui/                      # Sistema de componentes de diseño atómico
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── Badge.tsx
│   │   │       ├── Skeleton.tsx
│   │   │       ├── KpiCard.tsx
│   │   │       ├── CustomChartLegend.tsx
│   │   │       └── MultiSelectDropdown.tsx
│   │   ├── hooks/                       # Hooks personalizados
│   │   │   ├── usePortfolioData.ts      # Consultas reactivas con TanStack Query v5
│   │   │   ├── useFilters.ts            # Operaciones y conteos de filtros activos
│   │   │   └── usePagination.ts         # Paginador cliente/servidor
│   │   ├── pages/
│   │   │   ├── Dashboard/               # Módulos de analítica por pestaña
│   │   │   │   ├── Overview/            # Vista 1: Resumen General, KPIs y Colocación
│   │   │   │   ├── Composition/         # Vista 2: Composición por Producto y Saldo
│   │   │   │   ├── Rankings/            # Vista 3: Rankings TOP 10 de Cartera en Riesgo
│   │   │   │   ├── Operations/          # Vista 4: Días de Pago, Vencimientos y Precobro
│   │   │   │   ├── Retention/           # Vista 5: Deserción y Matriz de Rodamiento
│   │   │   │   ├── Cosechas/            # Vista 6: Cosechas (Vintage) & Matrices de Transición
│   │   │   │   │   ├── CosechasSection.tsx    # Orquestador del módulo y switch de modo
│   │   │   │   │   ├── VintageView.tsx        # Matriz calórica, curvas SVG dinámicas y exportación Excel
│   │   │   │   │   ├── TransitionView.tsx     # Matrices de migración (1M-12M), evolución y detalle
│   │   │   │   │   ├── CosechasFilters.tsx    # Filtros multidimensionales y switch de Asesor
│   │   │   │   │   ├── TechnicalNotes.tsx     # Notas técnicas, fórmulas y reglas de negocio
│   │   │   │   │   ├── Tooltip.tsx            # Tooltip flotante con viewport bounding
│   │   │   │   │   ├── cosechasCore.ts        # Motor matemático cliente y cálculo de tramos
│   │   │   │   │   └── cosechas.css           # Estilos visuales escopados y escalas cromáticas
│   │   │   │   └── DashboardPage.tsx    # Orquestador del Dashboard con notas técnicas
│   │   │   └── Login/
│   │   │       └── LoginPage.tsx        # Login corporativo exclusivo Google Sign-In
│   │   ├── routes/                      # Enrutamiento protegido (ProtectedRoute, AppRoutes)
│   │   ├── services/                    # Cliente HTTP Axios centralizado con interceptores
│   │   ├── store/                       # Estado global con Zustand (useAuthStore, useDashboardStore)
│   │   ├── styles/                      # Tokens de color institucionales y tema Tailwind CSS
│   │   ├── types/                       # Definiciones de tipos TypeScript estrictos
│   │   └── utils/                       # Motor de cálculos cliente, formateadores y utilidades
│   ├── public/                          # Favicon e isotipos SVG corporativos
│   ├── index.html                       # Documento raíz con tipografías Inter y Plus Jakarta Sans
│   ├── package.json
│   └── vite.config.ts                   # Configuración con @tailwindcss/vite y proxy /api
│
├── package.json                         # Scripts de orquestación del monorepositorio
└── README.md
```

---

## 🔐 Autenticación Corporativa Exclusiva (Google Sign-In)

La autenticación ha sido completamente estandarizada en un flujo exclusivo con **Google Sign-In**, eliminando credenciales locales, contraseñas y cuentas demo para garantizar el estándar de seguridad de Google Identity:

1. **Flujo Criptográfico sin Contraseñas:**
   - El botón oficial `@react-oauth/google` emite un ID Token criptográfico firmado por Google.
   - El backend (`POST /api/auth/google`) valida el token directamente con `google-auth-library` contra las claves públicas de Google, verificando emisor (`accounts.google.com`), audiencia (`GOOGLE_CLIENT_ID`), expiración y correo verificado.
   - **Restricción de Dominio Corporativo:** Solo se autorizan cuentas pertenecientes a los dominios configurados en `GOOGLE_ALLOWED_DOMAINS`.

2. **Gestión de Sesión Segura:**
   - La sesión se firma con JWT (HS256) y se emite dentro de una cookie `HttpOnly`, con atributos `Secure` y directiva `SameSite=Lax`.
   - El perfil de usuario almacena exclusivamente los datos de identidad provistos por Google: `name`, `email` y `picture` (avatar).

---

## ⚡ Verificación de Paridad Matemática (100% Idéntico)

Para asegurar absoluta fidelidad contable y de riesgo frente a los cálculos históricos de Apoyo Integral, el proyecto cuenta con un test automatizado de paridad matemática (`scripts/parity.ts`). 

Este script ejecuta en una VM aislada de Node.js el motor analítico de referencia (`legacyScript.js`) y evalúa **2,428 comprobaciones independientes** widget por widget, celda por celda y centavo a centavo:

```bash
npm run test:parity
```

```text
> aig-portfolio-backend@1.0.0 test:parity
> tsx scripts/parity.ts

Paridad: 2428/2428 comprobaciones idénticas al HTML original.
✓ El motor nuevo reproduce exactamente el dashboard original.
```

### Métricas Validadas en la Paridad
- **Cartera Total y Clientes Únicos:** Suma exacta de Saldo de Capital (`sc`) y deduplicación estricta de códigos de cliente (`cod`).
- **Mora Total (PAR 1):** Saldo total de créditos con días de mora $\ge 1$ día y clientes en mora.
- **Cartera en Riesgo (PAR 30):** Créditos con días de mora $\ge 30$ días (saldo completo en riesgo según estándar de microfinanzas).
- **Colocación Mensual Real:** Cómputo exclusivo de créditos desembolsados en el mes del corte (eliminando el sesgo por cancelaciones históricas).
- **Composición de Cartera:** Porcentajes y saldos distribuidos por producto financiero y por 7 rangos de saldo.
- **Rankings TOP 10:** Ordenamiento descendente estricto por saldo de capital en 5 tramos de morosidad.
- **Distribución de Días de Pago:** Concentración de cartera y número de clientes del día 1 al 31 de cada mes.
- **Vencimientos Próximos:** Proyecciones de cancelación a 30 y 90 días posteriores al cierre.
- **Precobro Preventivo:** Créditos al día con `ucp = 0` (última cuota pagada igual a cero) cuya primera amortización cae dentro de los próximos 30 días.
- **Deserción de Clientes:** Detección de clientes al día en el corte inicial ausentes en cortes posteriores.
- **Matriz de Transición de Mora (Rodamiento):** Transición cliente a cliente y saldo a saldo entre cualquier par de cierres temporales.

---

## 🗄️ Conexión Directa a Base de Datos On-Premises (SQL Server)

El backend de Node.js integra un cliente de base de datos de grado institucional para comunicarse directamente con la instancia de SQL Server en la red local.

### 1. Política Estricta de Solo Lectura (Zero-Write Guard)
- **Defensa en Profundidad:** El módulo `src/db/readonly.ts` analiza sintácticamente cada consulta antes de su transmisión al socket. Bloquea e interrumpe de forma inmediata sentencias que no sean `SELECT` o `WITH ... SELECT`, rechazando `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `EXEC` o `MERGE`.
- **Parametrización Tipada:** Todas las consultas aplican tipos nativos de TDS (`sql.NVarChar`, `sql.Int`), mitigando por diseño cualquier intento de inyección de código.

### 2. Cifrado TLS y Resiliencia de Red
- **Cifrado de Socket:** La conexión negocia cifrado TLS obligatorio (`DB_ENCRYPT=true`). Al inicializar el pool, el servidor verifica contra `sys.dm_exec_connections` que `encrypt_option = TRUE`.
- **Pool de Conexiones:** Mínimo de 2 y máximo de 10 conexiones (`DB_POOL_MIN`, `DB_POOL_MAX`), reutilizando sockets abiertos.
- **Reconexión Automática:** Reintentos con retroceso exponencial (*exponential backoff*) y jitter aleatorio en caso de microcortes en la LAN o VPN.
- **Sincronización en Caliente:** El botón **"Actualizar cierre"** en el encabezado ejecuta `POST /api/portfolio/sync`, extrayendo los últimos créditos activos de la base de datos y refrescando la caché de TanStack Query sin necesidad de reiniciar el servicio.

---

## 🎨 Sistema de Diseño & Experiencia de Usuario (UI/UX)

- **Paleta Institucional Elevada:**
  - **Azul Marino Primario:** `#014F84` (Variantes: `#023e68`, `#012f50`, `#001f36`).
  - **Naranja Corporativo:** `#F48437` (Variantes: `#e0722a`, `#ff9a54`, `#fff6ee`).
  - **Semáforos de Riesgo:** Esmeralda `#10b981` (Al día), Ámbar `#f59e0b` (Mora temprana), Rojo `#ef4444` (Mora crítica).
  - **Gama Slate Neutra:** `#0f172a`, `#334155`, `#64748b`, `#cbd5e1`, `#f8fafc`, `#ffffff`.
- **Tipografía Financiera:** Integración de *Inter* y *Plus Jakarta Sans* con numerales tabulares (`font-feature-settings: 'tnum'`) para alineación decimal estricta en tablas contables.
- **Microinteracciones:** Transiciones fluidas de pestaña, barras de filtros fijas al scroll (*sticky*), popovers con búsqueda en vivo, y gráficos responsivos con tooltips formateados en Quetzales (`Q`).

---

## 🚀 Instalación y Configuración

### Prerrequisitos
- **Node.js** $\ge$ v20.x LTS.
- **npm** $\ge$ v10.x.

### 1. Clonar el repositorio
```bash
git clone https://github.com/hnrylvo/FUSAI-DashboardAIG.git
cd FUSAI-DashboardAIG
```

### 2. Instalar dependencias
```bash
# Dependencias del Backend
cd backend && npm install

# Dependencias del Frontend
cd ../frontend && npm install
cd ..
```

### 3. Configurar Variables de Entorno

#### Backend (`backend/.env`)
Crear el archivo `backend/.env` a partir de la plantilla:
```bash
cp backend/.env.example backend/.env
```
Configuración recomendada:
```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=tu_secreto_criptografico_de_al_menos_32_caracteres_2026
SESSION_TTL_HOURS=8

# Origen de datos ('database' para SQL Server en vivo, 'file' para semilla JSON)
DATA_SOURCE=database

# Conexión a SQL Server On-Premises
DB_HOST= Servidor
DB_PORT= Puerto
DB_NAME= TablenNme
DB_USER= User
DB_PASSWORD=t u_contraseña_de_base_de_datos
DB_ENCRYPT= true
DB_TRUST_SERVER_CERT= true
DB_READ_ONLY_INTENT= true

# Google OAuth 2.0
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret_de_google
GOOGLE_ALLOWED_DOMAINS=dominios_permitidos.com
```

#### Frontend (`frontend/.env`)
Crear el archivo `frontend/.env`:
```env
VITE_GOOGLE_CLIENT_ID=tu_google_client_id
```

### 4. Ejecutar en Modo Desarrollo

Levantar backend y frontend simultáneamente desde la raíz:
```bash
npm run dev
```

La aplicación estará disponible de inmediato en **[http://localhost:5173](http://localhost:5173)**.

---

## 🛠 Guía de Scripts Disponibles

En la raíz del proyecto se encuentran disponibles los siguientes comandos de orquestación:

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia en paralelo el servidor API (puerto 4000) y el servidor Vite (puerto 5173). |
| `npm run dev:backend` | Inicia únicamente el backend en modo desarrollo con recarga en caliente (`tsx watch`). |
| `npm run dev:frontend` | Inicia únicamente el frontend con el servidor de desarrollo Vite. |
| `npm run build` | Ejecuta la verificación de tipos TypeScript y la compilación de producción de ambos proyectos. |
| `npm run test:parity` | Ejecuta la suite de paridad matemática (2,428 comprobaciones) en el motor analítico. |
| `npm run db:check` | Diagnostica la conexión de red TCP, handshake TLS y lectura en SQL Server. |
| `npm run start` | Arranca el servidor Node.js en modo producción para servir la API y los activos compilados. |

---

## 📊 Catálogo de Endpoints API

### `/api/auth` (Autenticación Google & Sesiones)
- `GET /api/auth/providers` — Retorna el estado del proveedor de autenticación y el `clientId` público de Google.
- `POST /api/auth/google` — Verifica el ID Token criptográfico emitido por Google y establece la cookie de sesión `HttpOnly`.
- `POST /api/auth/login` — Autenticación secundaria mediante credenciales para roles técnicos / automatizados.
- `GET /api/auth/me` — Devuelve los datos del perfil corporativo de la sesión activa (`name`, `email`, `picture`).
- `POST /api/auth/logout` — Invalida y elimina la cookie de sesión segura.

### `/api/portfolio` *(Requiere Sesión Activa)*
- `GET /api/portfolio/meta` — Catálogo de cortes disponibles, metadatos y opciones consolidadas de filtros.
- `POST /api/portfolio/overview` — Cálculo de los 8 KPIs principales y series históricas de Cartera, Clientes y Morosidad (PAR1/PAR30).
- `POST /api/portfolio/placement` — Colocación mensual por tipo de crédito (Nuevo, Recurrente con Saldo, etc.).
- `POST /api/portfolio/composition` — Distribución de cartera y clientes por producto y por tramo de saldo.
- `POST /api/portfolio/rankings/:bucket` — TOP 10 de créditos en riesgo para tramos `sana`, `b1` (1–30 d), `b2` (31–90 d), `b3` (91–120 d) y `b4` (>120 d).
- `POST /api/portfolio/operations/payment-days` — Distribución de créditos y montos por día de pago del mes (1 al 31).
- `POST /api/portfolio/operations/maturities` — Vencimientos proyectados a 30 y 90 días posteriores al cierre.
- `POST /api/portfolio/operations/pre-collection` — Alertas de precobro para créditos con primera amortización próxima y `ucp = 0`.
- `POST /api/portfolio/retention/attrition` — Análisis de clientes al día que desertaron entre el corte inicial y el final.
- `POST /api/portfolio/retention/transition` — Matriz completa de transición y rodamiento de morosidad (por clientes o monto Q).
- `POST /api/portfolio/sync` — Sincronización bajo demanda directamente contra la base de datos SQL Server on-premises.

### `/api/portfolio/db` *(Consultas SQL Server On-Premises)*
- `GET /api/portfolio/db/status` — Diagnóstico de conectividad con SQL Server (`RESUMENAIG`), salud del pool y política `STRICT_READ_ONLY_SELECT_ENFORCED`.
- `GET /api/portfolio/db/clients` — Paginación y búsqueda server-side de clientes desde `dbo.CLIENTE`.
- `GET /api/portfolio/db/branches` — Catálogo de agencias y sucursales con saldos consolidados de cartera desde `dbo.AGENCIAS`.
- `GET /api/portfolio/db/officers` — Catálogo de asesores de crédito y gestores de cobro desde `dbo.PERSONAL`.
- `GET /api/portfolio/db/snapshots` — Registro de snapshots y fechas de cierre detectadas en la base de datos.

### `/api/vintage` *(Módulo de Cosechas & Matrices de Transición)*
- `GET /api/vintage/data` — Retorna el dataset canónico de análisis de cosechas (Vintage y Matrices de Transición), incluyendo créditos normalizados, dimensiones y series mensuales de snapshots.
- `GET /api/vintage/meta` — Resumen ligero de metadatos: versión del dataset, conteo total de créditos, catálogo de dimensiones y lista ordenada de cierres disponibles.
- `POST /api/vintage/sync` — Sincronización en caliente y estrictamente de solo lectura desde SQL Server (`dbo.CARTERA`, `dbo.CREDITO`, `dbo.CLIENTE`, `dbo.PERSONAL`, `dbo.AGENCIAS`, `dbo.DEPARTAMENTO`), fusionando el corte vigente con el histórico.

### `/api/upload` *(Ingesta de Libros Excel)*
- `POST /api/upload` — Ingesta multipart/form-data de reportes de cartera en formato Excel (`.xls` o `.xlsx`) para incorporación de cierres.

### `/api/health`
- `GET /api/health` — Endpoint de liveness probe del servicio HTTP.

---

## 📦 Compilación y Despliegue en Producción

El backend de Node.js está preparado para servir los activos estáticos minificados del frontend directamente en producción:

```bash
# 1. Compilar ambos proyectos (TypeScript + Vite Bundle)
npm run build

# 2. Iniciar el servidor de producción en el puerto configurado (ej. 4000)
npm run start
```

La plataforma completa queda disponible en un único puerto `http://localhost:4000/`.

---

## 📄 Licencia y Confidencialidad

**Apoyo Integral Guatemala, S.A. · Grupo FUSAI**  
Material confidencial para uso interno exclusivo de la Gerencia de Riesgos, Dirección General y Junta Directiva. Prohibida su copia, distribución o divulgación total o parcial sin autorización expresa por escrito.
