from aiogram import Router, F
from aiogram.types import Message, ReplyKeyboardRemove
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

from keyboards.reply import kb_request_phone
from services.api_client import api_client

router = Router()

# Definimos los estados para la "conversación" de login
class AuthStates(StatesGroup):
    waiting_for_email = State()

@router.message(Command("start"))
async def cmd_start(message: Message, state: FSMContext):
    """
    Al iniciar, primero intentamos Login Silencioso.
    Si falla, pedimos teléfono.
    """
    chat_id = message.chat.id
    
    # Intento de Login Silencioso (Paso 3)
    user_data = await api_client.login_silent(chat_id)
    
    if user_data:
        await state.update_data(jwt_token=user_data["access_token"])
        await message.answer(f"👋 ¡Hola de nuevo {user_data['user_name']}! Sesión restaurada.")
        return

    # Si no hay login previo, pedimos teléfono (Paso 0)
    await message.answer(
        "👋 ¡Hola! Para comenzar, necesito verificar tu cuenta.\n"
        "Por favor, toca el botón para compartir tu número:",
        reply_markup=kb_request_phone()
    )

@router.message(F.contact)
async def handle_contact(message: Message, state: FSMContext):
    contact = message.contact
    
    # Seguridad básica
    if contact.user_id != message.from_user.id:
        await message.answer("⚠️ Error: Por favor comparte TU propio contacto.")
        return

    phone = contact.phone_number  # ← Extrae el teléfono
    
    # 🔍 AQUÍ IMPRIMES TODO para debugging
    print(f"📱 Teléfono recibido: '{phone}'")
    print(f"📱 Tipo: {type(phone)}")
    print(f"📱 Longitud: {len(phone)}")
    print(f"📱 Chat ID: {message.chat.id}")
    print("-" * 50)
    
    # Paso 1: Verificar teléfono en Backend
    exists = await api_client.check_phone(phone)  # ← Ya está limpio aquí
    
    if exists:
        # Guardamos datos temporales
        await state.update_data(phone=phone, chat_id=message.chat.id)
        
        await message.answer(
            "✅ Número encontrado.\n"
            "Para verificar que eres tú, escribe tu **correo electrónico** registrado:",
            reply_markup=ReplyKeyboardRemove()
        )
        await state.set_state(AuthStates.waiting_for_email)
    else:
        await message.answer("❌ Este número no está registrado en el sistema.")


@router.message(AuthStates.waiting_for_email)
async def handle_email(message: Message, state: FSMContext):
    email = message.text.strip()
    data = await state.get_data()
    
    # Paso 2: Autenticación final
    response = await api_client.login_secure(
        phone=data['phone'],
        email=email,
        chat_id=data['chat_id']
    )
    
    if response and "access_token" in response:
        await state.update_data(jwt_token=response["access_token"])
        await message.answer(f"🎉 ¡Bienvenido {response['user_name']}! Has iniciado sesión correctamente.")
        await state.set_state(None) # Fin de la conversación de auth
    else:
        await message.answer("❌ El correo no coincide o hubo un error. Inténtalo de nuevo:")
