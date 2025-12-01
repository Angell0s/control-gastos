import os
import logging
from telegram.ext import Application

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    token = os.getenv("TELEGRAM_TOKEN")
    if not token:
        logger.error("TELEGRAM_TOKEN no configurado")
        return
    
    app = Application.builder().token(token).build()
    await app.initialize()
    await app.start()
    logger.info("🤖 Bot de Telegram iniciado")
    await app.run_polling()

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
