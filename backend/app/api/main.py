#backend\app\api\main.py
from fastapi import APIRouter
from app.api.routers import users, expenses, auth, categories

api_router = APIRouter()

api_router.include_router(auth.router, tags=["login"])

# Aquí agregamos las rutas con sus prefijos
api_router.include_router(users.router, prefix="/users", tags=["users"])
# En el futuro agregarás:
# api_router.include_router(gastos.router, prefix="/gastos", tags=["gastos"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["expenses"])

api_router.include_router(users.router, prefix="/categories", tags=["categories"])