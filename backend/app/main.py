#backend\app\main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.main import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"/api/v1/openapi.json"
)

# Configurar CORS (Para que tu Frontend pueda conectarse después)
# En tu main.py
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.12:3000",  # <--- Tu IP específica
    "http://192.168.1.7:3000",
    "http://192.168.1.7:61772",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # Usar la lista, NO ["*"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir el router principal
app.include_router(api_router, prefix="/api/v1")

# Ruta simple de salud
@app.get("/")
def root():
    return {"message": "Bienvenido a la API de Control de Gastos"}
