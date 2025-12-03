import aiohttp
import logging
from typing import Optional, Dict, Any
from config import settings

logger = logging.getLogger(__name__)

class BackendClient:
    def __init__(self):
        self.base_url = settings.API_URL
        self.session = None

    async def get_session(self):
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    async def close(self):
        if self.session:
            await self.session.close()

    async def check_phone(self, phone: str) -> bool:
        """Paso 1: Verificar si existe el teléfono"""
        session = await self.get_session()
        try:
            async with session.post(f"{self.base_url}/api/v1/telegram/check-phone", json={"phone": phone}) as resp:
                return resp.status == 200
        except Exception as e:
            logger.error(f"Error check_phone: {e}")
            return False

    async def login_secure(self, phone: str, email: str, chat_id: int) -> Optional[Dict]:
        """Paso 2: Login con validación completa"""
        session = await self.get_session()
        payload = {"phone": phone, "email": email, "telegram_chat_id": chat_id}
        try:
            async with session.post(f"{self.base_url}/api/v1/telegram/login-secure", json=payload) as resp:
                if resp.status == 200:
                    return await resp.json()
                return None
        except Exception as e:
            logger.error(f"Error login_secure: {e}")
            return None

    async def login_silent(self, chat_id: int) -> Optional[Dict]:
        """Paso 3: Login automático por ID"""
        session = await self.get_session()
        try:
            async with session.post(f"{self.base_url}/api/v1/telegram/login-silent", json={"telegram_chat_id": chat_id}) as resp:
                if resp.status == 200:
                    return await resp.json()
                return None
        except Exception as e:
            logger.error(f"Error login_silent: {e}")
            return None

api_client = BackendClient()
