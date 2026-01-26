#backend\app\main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.main import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"/api/v1/openapi.json"
)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://pagos.angell0s.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,   
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir el router principal
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "¡Está funcionando!"}
