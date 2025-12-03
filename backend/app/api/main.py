from fastapi import APIRouter
from app.api.routers import users, expenses, auth, categories, telegram

api_router = APIRouter()

api_router.include_router(auth.router, tags=["login"])

# Rutas con prefijos
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])  # ✅ CORREGIDO
api_router.include_router(telegram.router, prefix="/telegram", tags=["telegram"])      # ✅ OK
