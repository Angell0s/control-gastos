#bot\src\bot\main.py
import asyncio
import logging
import sys
from os import getenv

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

# Importamos el router de autenticación
from handlers import auth
from config import settings # Asegúrate de tener tu config.py

# Configuración básica de logs
logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger(__name__)

async def main():
    # 1. Obtener token
    token = settings.TELEGRAM_TOKEN # O os.getenv("TELEGRAM_TOKEN")
    if not token:
        logger.error("❌ TELEGRAM_TOKEN no encontrado")
        return

    # 2. Inicializar Bot y Dispatcher (Aiogram 3.x)
    bot = Bot(token=token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher()

    # 3. Registrar Routers
    dp.include_router(auth.router)
    # dp.include_router(expenses.router) # Futuros routers

    # 4. Iniciar Polling
    logger.info("🚀 Bot iniciado y escuchando...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("🛑 Bot detenido")
import asyncio
import logging
import sys
from os import getenv

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

# Importamos el router de autenticación
from handlers import auth
from config import settings # Asegúrate de tener tu config.py

# Configuración básica de logs
logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger(__name__)

async def main():
    # 1. Obtener token
    token = settings.TELEGRAM_TOKEN # O os.getenv("TELEGRAM_TOKEN")
    if not token:
        logger.error("❌ TELEGRAM_TOKEN no encontrado")
        return

    # 2. Inicializar Bot y Dispatcher (Aiogram 3.x)
    bot = Bot(token=token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher()

    # 3. Registrar Routers
    dp.include_router(auth.router)
    # dp.include_router(expenses.router) # Futuros routers

    # 4. Iniciar Polling
    logger.info("🚀 Bot iniciado y escuchando...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("🛑 Bot detenido")
