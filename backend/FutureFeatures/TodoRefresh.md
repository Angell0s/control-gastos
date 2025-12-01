# 📝 Nota Técnica: Implementación de Refresh Tokens y Sesiones en Base de Datos

**Estado:** Pendiente (Fase 2 - Optimización de Seguridad)
**Objetivo:** Migrar de autenticación *Stateless* (solo JWT) a un sistema Híbrido con **Refresh Tokens** almacenados en Base de Datos.
**Propósito:** Permitir la revocación de sesiones (Cerrar sesión en todos los dispositivos) y mantener sesiones activas por periodos largos ("Recuérdame").

---

## 1. Cambios en Base de Datos (Modelos)

No se recomienda agregar una columna a la tabla `users` (ya que limitaría al usuario a una sola sesión). Se debe crear una tabla relacional 1:N.

### Nueva Tabla: `refresh_tokens`
Esta tabla almacenará los tokens de larga duración emitidos para cada usuario.

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `Integer` (PK) | Identificador único del registro. |
| `token` | `String` | El token de refresco (Recomendación: **Almacenar el Hash del token**, no el token plano, igual que los passwords). |
| `user_id` | `Integer` (FK) | Relación con la tabla `users`. |
| `expires_at` | `DateTime` | Fecha de expiración absoluta del token (ej. 30 días). |
| `created_at` | `DateTime` | Fecha de creación (para auditoría). |
| `revoked` | `Boolean` | (Opcional) Para mantener historial en lugar de borrar físicamente el registro (Soft Delete). |

---

## 2. Cambios en la API (Endpoints)

Se deben modificar y crear los siguientes endpoints en `app/api/routers/auth.py`:

### A. Modificar `POST /login`
*   **Actual:** Devuelve solo `access_token`.
*   **Nuevo:** Debe generar dos tokens:
    1.  `access_token`: JWT de vida corta (15-30 min).
    2.  `refresh_token`: Cadena aleatoria segura (o JWT de vida larga, ej. 7 días).
*   **Acción:** Guardar el `refresh_token` (hasheado) en la tabla `refresh_tokens` vinculado al usuario.
*   **Response:** Devolver ambos tokens al frontend.

### B. Crear `POST /refresh-token`
*   **Input:** Recibe el `refresh_token` (desde el body o una HttpOnly Cookie).
*   **Lógica:**
    1.  Busca el token en la tabla `refresh_tokens`.
    2.  Verifica si existe, si no ha expirado y si pertenece al usuario.
    3.  Si es válido: Genera y devuelve un **NUEVO** `access_token`.
    4.  (Opcional: Rotación) Genera un nuevo `refresh_token` y borra el anterior para mayor seguridad.

### C. Crear `POST /logout`
*   **Input:** Recibe el `refresh_token` actual.
*   **Lógica:** Elimina (o marca como `revoked=True`) el registro correspondiente en la tabla `refresh_tokens`.
*   **Resultado:** El token ya no sirve para pedir nuevos accesos. Efectivamente, se cierra la sesión.

---

## 3. Prompt para la IA (Copiar y Pegar)

Si pides ayuda a una IA en el futuro, usa este prompt:

> "Actúa como un experto en Seguridad Backend con FastAPI. Quiero implementar un sistema de Refresh Tokens con persistencia en base de datos para permitir la revocación de sesiones.
>
> 1.  Crea el modelo SQLAlchemy `RefreshToken` relacionado con `User`.
> 2.  Actualiza el endpoint de login para emitir un par de tokens y guardar el refresh token en la BD.
> 3.  Crea el endpoint `/refresh` que valide contra la base de datos y emita nuevos access tokens.
> 4.  Crea el endpoint `/logout` que elimine el token de la BD.
>
> Usa `passlib` para hashear el token antes de guardarlo. Mantén el estilo de código actual del proyecto (SessionLocal, Pydantic v2)."

