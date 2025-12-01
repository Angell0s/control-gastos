# 💰 Control de Gastos Personal

Una aplicación Full-Stack robusta para la gestión de finanzas personales, construida con arquitectura moderna, escalable y contenedorizada.

## 🚀 Tech Stack

*   **Backend:** Python 3.10+, FastAPI, SQLAlchemy, Pydantic v2.
*   **Base de Datos:** PostgreSQL 15 (vía Docker).
*   **Migraciones:** Alembic.
*   **Frontend:** Next.js (En desarrollo).
*   **Infraestructura:** Docker Compose.

---

## 📂 Estructura del Proyecto

El proyecto sigue una arquitectura modular:

```
control-gastos/
├── .env # Variables de entorno globales (NO SUBIR A GIT)
├── .gitignore # Archivos ignorados
├── docker-compose.yml # Orquestación de servicios (DB, Redis, etc.)
├── backend/ # API REST en FastAPI
│ ├── alembic/ # Scripts de migración de base de datos
│ ├── app/
│ │ ├── api/ # Endpoints (Routers)
│ │ ├── core/ # Configuración y Seguridad
│ │ ├── db/ # Conexión a BD y Sesiones
│ │ ├── models/ # Modelos SQLAlchemy (Tablas)
│ │ └── schemas/ # Esquemas Pydantic (Validación y Respuesta)
│ └── initial_data.py # Script para crear usuario administrador
└── frontend/ # (Próximamente)
```
---

## 🛠️ Configuración e Instalación

Este proyecto utiliza un **Flujo de Trabajo Híbrido**: La base de datos corre en Docker, pero el Backend se ejecuta localmente para facilitar el desarrollo y depuración.

### 1. Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto (basado en `.env.example` si existe):

Configuración de Base de Datos
POSTGRES_USER=admin_gastos
POSTGRES_PASSWORD=tu_password_seguro
POSTGRES_DB=gastos_db
POSTGRES_HOST=db
POSTGRES_PORT=5432

Configuración de App
SECRET_KEY=tu_super_secret_key_generada
ADMIN_EMAIL=admin@gastos.com # ¡Usa un dominio válido (.com), no .local!
ADMIN_PASSWORD=admin123

### 2. Levantar la Infraestructura (Docker)
Inicia solo el contenedor de base de datos:

docker-compose up -d db

### 3. Configurar el Backend (Local)

cd backend

1. Crear entorno virtual
python -m venv venv

2. Activar entorno (Windows PowerShell)
.\venv\Scripts\activate

3. Instalar dependencias
pip install -r requirements.txt

4. Aplicar migraciones a la base de datos
alembic upgrade head

5. Crear datos iniciales (Usuario Admin)
python initial_data.py

---

## ▶️ Ejecución

Para levantar el servidor de desarrollo:

Desde la carpeta backend/
uvicorn app.main:app --reload

*   **Documentación Interactiva (Swagger UI):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
*   **Documentación Alternativa (ReDoc):** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🧪 Comandos Útiles

### Migraciones (Alembic)
Cada vez que modifiques un modelo en `app/models/`:

1. Crear el archivo de migración
alembic revision --autogenerate -m "descripcion_del_cambio"

2. Aplicar cambios a la DB
alembic upgrade head

### Limpieza de Base de Datos
Si necesitas empezar de cero absoluto:

En la raíz del proyecto
docker-compose down -v # Borra contenedores y volúmenes de datos
docker-compose up -d db # Levanta una DB limpia

---

## 🐛 Solución de Problemas Comunes

**1. Error `bcrypt` version / `passlib`**
Si obtienes un error relacionado con `bcrypt` al crear el usuario, asegúrate de tener la versión compatible:
`pip install "bcrypt==4.0.1"`

**2. Error de validación de Email (`.local`)**
Pydantic rechaza correos terminados en `.local`. Asegúrate de usar `.com` u otro dominio válido en tu `.env` para el `ADMIN_EMAIL`.

**3. Error de conexión a DB en local**
El sistema está configurado para detectar automáticamente el entorno.
*   **Local:** Se conecta a `localhost`.
*   **Docker:** Se conecta a `db` (host interno).
*   Si falla en local, verifica que el contenedor Docker esté corriendo (`docker ps`) y exponiendo el puerto `5432`.