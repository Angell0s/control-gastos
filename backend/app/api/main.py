from fastapi import APIRouter
from app.api.routers import users

api_router = APIRouter()

# Aquí agregamos las rutas con sus prefijos
api_router.include_router(users.router, prefix="/users", tags=["users"])
# En el futuro agregarás:
# api_router.include_router(gastos.router, prefix="/gastos", tags=["gastos"])
