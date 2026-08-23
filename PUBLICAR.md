# Publicar el juego (Render)

## Paso 1 — Subir a GitHub (una sola vez)

En PowerShell, dentro de la carpeta del juego:

```powershell
gh auth login
```

Elegí **GitHub.com** → **HTTPS** → **Login with a web browser** y seguí los pasos.

Después:

```powershell
gh repo create oly-aventura --public --source=. --remote=origin --push
```

(Si preferís repo privado, cambiá `--public` por `--private`.)

## Paso 2 — Crear el sitio en Render

1. Entrá a https://dashboard.render.com/ y creá cuenta (podés entrar con GitHub).
2. **New +** → **Blueprint**.
3. Conectá el repo `oly-aventura`.
4. Render lee `render.yaml` solo → **Apply**.

En 2–3 minutos tenés un link tipo:

**https://oly-aventura.onrender.com**

Mandalo por WhatsApp a tu familiar.

## Paso 3 — En el celular

- Pantalla **apaisada** (de costado).
- Tocá la pantalla para la música.
- **¡Jugar!**

## Actualizar después de cambios

```powershell
git add -A
git commit -m "Actualización del juego"
git push
```

Render redeploya solo.
