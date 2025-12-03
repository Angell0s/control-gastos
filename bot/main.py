import asyncio
import logging
from aiogram import Bot, Dispatcher
from config import settings
from handlers import auth
from services.api_client import api_client

logging.basicConfig(level=logging.INFO)

async def on_startup():
    print(f"🚀 Bot iniciado. Conectando a API: {settings.API_URL}")

async def on_shutdown():
    await api_client.close()
    print("🛑 Bot detenido")

async def main():
    bot = Bot(token=settings.BOT_TOKEN)
    dp = Dispatcher()
    
    dp.include_router(auth.router)
    dp.startup.register(on_startup)
    dp.shutdown.register(on_shutdown)

    # Elimina webhooks pendientes si los hubiera (útil para local)
    await bot.delete_webhook(drop_pending_updates=True)
    
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
