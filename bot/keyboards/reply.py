from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
from aiogram.utils.keyboard import ReplyKeyboardBuilder

def kb_request_phone():
    builder = ReplyKeyboardBuilder()
    # El botón mágico que pide el contacto de forma segura
    builder.button(text="📱 Compartir mi Teléfono", request_contact=True)
    return builder.as_markup(resize_keyboard=True, one_time_keyboard=True)
