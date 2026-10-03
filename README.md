# La L@gunita — Encuesta

## Base de datos
Este proyecto ya usa PostgreSQL en Neon. SQLite ya no es necesario.

## Archivo `.env`
En la raíz del proyecto debe existir:

```env
DATABASE_URL="AQUI_VA_LA_URL_POOLED_DE_NEON"
ADMIN_USER="admin"
ADMIN_PASSWORD="TU_CONTRASEÑA_PRIVADA"
SECRET_KEY="TU_CLAVE_SECRETA_LARGA"
```

El archivo `.env` está ignorado por Git y nunca debe subirse a GitHub.

## Ejecutar localmente

```powershell
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Luego abra:

- Encuesta: http://127.0.0.1:5000
- Administrador: http://127.0.0.1:5000/admin

Al iniciar, Flask crea automáticamente la tabla `responses` en Neon si todavía no existe.

## Render

Build Command:

```text
pip install -r requirements.txt
```

Start Command:

```text
gunicorn app:app
```

En Render agregue estas variables de entorno:

- DATABASE_URL
- ADMIN_USER
- ADMIN_PASSWORD
- SECRET_KEY

Los valores deben ser los mismos que usa localmente en `.env`.
