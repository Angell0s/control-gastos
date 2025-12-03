#bot\keyboards\reply.py
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
from aiogram.utils.keyboard import ReplyKeyboardBuilder

def kb_request_phone() -> ReplyKeyboardMarkup:
    """Teclado para pedir el contacto (Login)"""
    builder = ReplyKeyboardBuilder()
    builder.button(text="📱 Compartir mi Teléfono", request_contact=True)
    return builder.as_markup(resize_keyboard=True, one_time_keyboard=True)

def kb_main_menu() -> ReplyKeyboardMarkup:
    """Menú Principal después de loguearse"""
    builder = ReplyKeyboardBuilder()
    
    # Fila 1: Acciones principales
    builder.button(text="💰 Registrar Gasto")
    builder.button(text="📊 Ver Mis Gastos")
    
    # Fila 2: Configuración
    builder.button(text="⚙️ Mi Cuenta") # Muestra info y opción de desvincular
    builder.button(text="🚪 Desvincular / Salir")
    
    # Ajustamos el diseño: 2 botones arriba, 2 abajo
    builder.adjust(2, 2)
    
    return builder.as_markup(resize_keyboard=True)
