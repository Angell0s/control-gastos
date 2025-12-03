#bot\handlers\auth.py
from aiogram import Router, F
from aiogram.types import Message, ReplyKeyboardRemove
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

# Importamos el nuevo menú
from keyboards.reply import kb_request_phone, kb_main_menu
from services.api_client import api_client

router = Router()

class AuthStates(StatesGroup):
    waiting_for_email = State()

@router.message(Command("start"))
async def cmd_start(message: Message, state: FSMContext):
    chat_id = message.chat.id
    
    # 1. Login Silencioso
    user_data = await api_client.login_silent(chat_id)
    
    if user_data:
        await state.update_data(jwt_token=user_data["access_token"])
        # ✅ Mostramos el Menú Principal
        await message.answer(
            f"👋 ¡Hola de nuevo {user_data['user_name']}!\n¿Qué deseas hacer hoy?",
            reply_markup=kb_main_menu() 
        )
        return

    # 2. Si falla, pedir teléfono
    await message.answer(
        "👋 ¡Hola! Para comenzar, necesito verificar tu cuenta.\n"
        "Por favor, toca el botón para compartir tu número:",
        reply_markup=kb_request_phone()
    )

# ✅ MANEJO DEL BOTÓN "Desvincular / Salir"
# Captura tanto el botón de texto como el comando /logout
@router.message(F.text == "🚪 Desvincular / Salir")
@router.message(Command("logout"))
async def cmd_logout(message: Message, state: FSMContext):
    chat_id = message.chat.id
    
    await state.clear()
    success = await api_client.unlink_account(chat_id)
    
    if success:
        await message.answer(
            "✅ **Cuenta desvinculada correctamente.**\n\n"
            "Tus datos han sido borrados de este chat.\n"
            "Para entrar de nuevo, usa /start.",
            reply_markup=ReplyKeyboardRemove(), # Quitamos el menú
            parse_mode="Markdown"
        )
    else:
        await message.answer(
            "⚠️ Error al desvincular (o ya estabas fuera).",
            reply_markup=ReplyKeyboardRemove()
        )

@router.message(F.contact)
async def handle_contact(message: Message, state: FSMContext):
    contact = message.contact
    
    if contact.user_id != message.from_user.id:
        await message.answer("⚠️ Comparte TU propio contacto.")
        return

    exists = await api_client.check_phone(contact.phone_number)
    
    if exists:
        await state.update_data(phone=contact.phone_number, chat_id=message.chat.id)
        await message.answer(
            "✅ Teléfono verificado.\nAhora escribe tu **email**:",
            reply_markup=ReplyKeyboardRemove()
        )
        await state.set_state(AuthStates.waiting_for_email)
    else:
        await message.answer("❌ Número no registrado en el sistema.")

@router.message(AuthStates.waiting_for_email)
async def handle_email(message: Message, state: FSMContext):
    email = message.text.strip()
    data = await state.get_data()
    
    response = await api_client.login_secure(
        phone=data['phone'],
        email=email,
        chat_id=data['chat_id']
    )
    
    if response and "access_token" in response:
        await state.update_data(jwt_token=response["access_token"])
        
        # ✅ Login exitoso -> Mostrar Menú Principal
        await message.answer(
            f"🎉 ¡Bienvenido {response['user_name']}!",
            reply_markup=kb_main_menu()
        )
        await state.set_state(None)
    else:
        await message.answer("❌ Email incorrecto. Intenta de nuevo:")
