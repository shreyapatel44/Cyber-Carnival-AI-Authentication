import sqlite3
import json


def init_db():
    conn = sqlite3.connect("users.db")
    c = conn.cursor()
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS users
        (username TEXT PRIMARY KEY,
        embedding TEXT,
        details TEXT)
    """
    )
    conn.commit()
    conn.close()


def save_user(username, embedding, details):
    conn = sqlite3.connect("users.db")
    c = conn.cursor()
    c.execute(
        "INSERT OR REPLACE INTO users VALUES (?, ?, ?)",
        (username, json.dumps(embedding), json.dumps(details)),
    )
    conn.commit()
    conn.close()


def get_user(username):
    conn = sqlite3.connect("users.db")
    c = conn.cursor()
    c.execute("SELECT embedding, details FROM users WHERE username=?", (username,))
    row = c.fetchone()
    conn.close()

    if row:
        return {"embedding": json.loads(row[0]), "details": json.loads(row[1])}
    return None
