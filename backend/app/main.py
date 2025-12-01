from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.main import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"/api/v1/openapi.json"
)

# Configurar CORS (Para que tu Frontend pueda conectarse después)
# Por ahora permitimos todo (*) para facilitar el desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
