
import os
import json
from functools import wraps

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash

load_dotenv()

app = Flask(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL")
ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
SECRET_KEY = os.environ.get("SECRET_KEY")

if not DATABASE_URL:
    raise RuntimeError("Falta DATABASE_URL en el archivo .env o en las variables de entorno.")
if not ADMIN_PASSWORD:
    raise RuntimeError("Falta ADMIN_PASSWORD en el archivo .env o en las variables de entorno.")
if not SECRET_KEY:
    raise RuntimeError("Falta SECRET_KEY en el archivo .env o en las variables de entorno.")

app.secret_key = SECRET_KEY

QUESTIONS = {
    1: {"text": "¿Cuál es su rango de edad?", "type": "single"},
    2: {"text": "¿Cuál es su género?", "type": "single"},
    3: {"text": "¿Cuál es su ocupación principal?", "type": "single"},
    4: {"text": "¿En qué zona vive?", "type": "single"},
    5: {"text": "¿Cuál es aproximadamente su ingreso mensual personal?", "type": "single"},
    6: {"text": "¿Con qué frecuencia compra productos o utiliza servicios de papelería?", "type": "single"},
    7: {"text": "¿Cuánto gasta aproximadamente cada vez que visita una papelería?", "type": "single"},
    8: {"text": "¿Qué productos compra con mayor frecuencia?", "type": "multiple"},
    9: {"text": "¿Qué servicios utiliza con mayor frecuencia?", "type": "multiple"},
    10: {"text": "¿En qué momento suele comprar con mayor frecuencia productos de papelería?", "type": "single"},
    11: {"text": "¿Qué factor considera más importante al elegir una papelería?", "type": "single"},
    12: {"text": "¿Qué tan importante es encontrar diferentes productos y servicios en un mismo establecimiento?", "type": "single"},
    13: {"text": "¿Conoce Papelería La L@gunita?", "type": "single"},
    14: {"text": "¿Ha comprado productos o utilizado servicios en Papelería La L@gunita?", "type": "single"},
    15: {"text": "¿Cómo conoció Papelería La L@gunita?", "type": "single"},
    16: {"text": "¿Con qué frecuencia compra en Papelería La L@gunita?", "type": "single"},
    17: {"text": "¿Encuentra normalmente los productos que necesita en La L@gunita?", "type": "single"},
    18: {"text": "¿Cómo calificaría la variedad de productos de Papelería La L@gunita?", "type": "single"},
    19: {"text": "¿Cómo considera los precios de La L@gunita en comparación con otras papelerías?", "type": "single"},
    20: {"text": "¿Cómo calificaría la calidad de los productos de Papelería La L@gunita?", "type": "single"},
    21: {"text": "¿Cómo calificaría la atención recibida en Papelería La L@gunita?", "type": "single"},
    22: {"text": "¿Cómo calificaría la rapidez del servicio?", "type": "single"},
    23: {"text": "¿Considera que el personal brinda un trato amable y respetuoso?", "type": "single"},
    24: {"text": "¿Qué tan satisfecho está en general con Papelería La L@gunita?", "type": "single"},
    25: {"text": "¿Qué tan probable sería que recomendara Papelería La L@gunita a otra persona?", "type": "single"},
    26: {"text": "Además de La L@gunita, ¿compra en otras papelerías?", "type": "single"},
    27: {"text": "¿Cuál es la principal razón por la que elegiría otra papelería?", "type": "single"},
    28: {"text": "¿Qué podría hacer La L@gunita para que usted la prefiriera sobre otras papelerías?", "type": "multiple"},
    29: {"text": "¿Qué servicio adicional le gustaría que Papelería La L@gunita ofreciera?", "type": "text"},
    30: {"text": "¿Qué productos considera que La L@gunita debería agregar o mejorar en variedad?", "type": "text"},
}


def get_db():
    return psycopg2.connect(
        DATABASE_URL,
        cursor_factory=RealDictCursor,
        connect_timeout=10
    )


def init_db():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS responses (
                    id BIGSERIAL PRIMARY KEY,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    answers JSONB NOT NULL
                )
            """)
        conn.commit()
    finally:
        conn.close()


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("admin_logged_in"):
            return redirect(url_for("admin_login"))
        return view(*args, **kwargs)
    return wrapped


@app.route("/")
def index():
    return render_template("index.html", admin_preview=False)


@app.route("/api/submit", methods=["POST"])
def submit():
    data = request.get_json(silent=True) or {}
    answers = data.get("answers", {})

    if not isinstance(answers, dict):
        return jsonify({"ok": False, "message": "Formato de respuestas inválido."}), 400

    required = [str(i) for i in range(1, 15)] + [str(i) for i in range(26, 31)]
    missing = [q for q in required if not answers.get(q)]

    if answers.get("14") == "Sí":
        missing += [str(i) for i in range(15, 26) if not answers.get(str(i))]

    if missing:
        return jsonify({
            "ok": False,
            "message": "Faltan preguntas obligatorias.",
            "missing": sorted(set(missing), key=int)
        }), 400

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO responses (answers) VALUES (%s::jsonb)",
                (json.dumps(answers, ensure_ascii=False),)
            )
        conn.commit()
    finally:
        conn.close()

    return jsonify({"ok": True, "message": "Respuesta guardada correctamente."})


@app.route("/admin", methods=["GET", "POST"])
def admin_login():
    if session.get("admin_logged_in"):
        return redirect(url_for("admin_dashboard"))

    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")

        if username == ADMIN_USER and password == ADMIN_PASSWORD:
            session["admin_logged_in"] = True
            return redirect(url_for("admin_dashboard"))

        flash("Usuario o contraseña incorrectos.", "error")

    return render_template("admin_login.html")


@app.route("/admin/encuesta")
@admin_required
def admin_survey_preview():
    return render_template("index.html", admin_preview=True)


@app.route("/admin/dashboard")
@admin_required
def admin_dashboard():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS n FROM responses")
            total = cur.fetchone()["n"]

            cur.execute("""
                SELECT
                    id,
                    TO_CHAR(
                        created_at AT TIME ZONE 'America/Cancun',
                        'YYYY-MM-DD HH24:MI:SS'
                    ) AS created_at
                FROM responses
                ORDER BY id DESC
                LIMIT 10
            """)
            latest = cur.fetchall()
    finally:
        conn.close()

    return render_template(
        "admin_dashboard.html",
        total=total,
        latest=latest,
        questions=QUESTIONS
    )


@app.route("/admin/api/stats")
@admin_required
def admin_stats():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT answers FROM responses ORDER BY id ASC")
            rows = cur.fetchall()

            cur.execute("""
                SELECT
                    TO_CHAR(
                        DATE_TRUNC('day', created_at AT TIME ZONE 'America/Cancun'),
                        'YYYY-MM-DD'
                    ) AS day,
                    COUNT(*) AS total
                FROM responses
                GROUP BY DATE_TRUNC('day', created_at AT TIME ZONE 'America/Cancun')
                ORDER BY DATE_TRUNC('day', created_at AT TIME ZONE 'America/Cancun') ASC
            """)
            trend_rows = cur.fetchall()
    finally:
        conn.close()

    parsed = []
    for row in rows:
        answers = row["answers"]
        if isinstance(answers, str):
            answers = json.loads(answers)
        parsed.append(answers)

    stats = {}

    for q_num, meta in QUESTIONS.items():
        key = str(q_num)

        if meta["type"] == "text":
            stats[key] = {
                "question": meta["text"],
                "type": "text",
                "responses": [
                    ans.get(key)
                    for ans in parsed
                    if ans.get(key)
                ]
            }
            continue

        counts = {}

        for ans in parsed:
            value = ans.get(key)
            if not value:
                continue

            values = value if isinstance(value, list) else [value]

            for item in values:
                counts[item] = counts.get(item, 0) + 1

        stats[key] = {
            "question": meta["text"],
            "type": meta["type"],
            "labels": list(counts.keys()),
            "values": list(counts.values())
        }

    trend = [
        {"day": row["day"], "total": row["total"]}
        for row in trend_rows
    ]

    # Datos exploratorios para el gráfico de dispersión del panel.
    age_map = {
        "15 a 18 años": 16.5,
        "19 a 25 años": 22,
        "26 a 40 años": 33,
        "41 a 60 años": 50.5,
        "Más de 60 años": 65
    }

    spend_map = {
        "Menos de $50": 25,
        "$50 a $100": 75,
        "$101 a $200": 150,
        "$201 a $500": 350,
        "Más de $500": 550
    }

    scatter = []

    for ans in parsed:
        age = age_map.get(ans.get("1"))
        spend = spend_map.get(ans.get("7"))

        if age is not None and spend is not None:
            scatter.append({"age": age, "spend": spend})

    return jsonify({
        "total": len(parsed),
        "stats": stats,
        "trend": trend,
        "scatter": scatter
    })


@app.route("/admin/api/responses")
@admin_required
def admin_responses():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    id,
                    TO_CHAR(
                        created_at AT TIME ZONE 'America/Cancun',
                        'YYYY-MM-DD HH24:MI:SS'
                    ) AS created_at,
                    answers
                FROM responses
                ORDER BY id DESC
            """)
            rows = cur.fetchall()
    finally:
        conn.close()

    result = []

    for row in rows:
        answers = row["answers"]
        if isinstance(answers, str):
            answers = json.loads(answers)

        result.append({
            "id": row["id"],
            "created_at": row["created_at"],
            "answers": answers
        })

    return jsonify(result)


@app.route("/admin/logout")
def admin_logout():
    session.clear()
    return redirect(url_for("admin_login"))


# También se ejecuta cuando Render inicia la app con Gunicorn.
init_db()


if __name__ == "__main__":
    app.run(debug=True)
