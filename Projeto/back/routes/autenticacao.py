from flask import Blueprint, jsonify
from werkzeug.security import check_password_hash

from auth import gerar_token
from db import get_db
from utils import dados_json, erro

bp = Blueprint('autenticacao', __name__)


@bp.post('/login')
def login():
    dados = dados_json()
    usuario = get_db().execute(
        'SELECT * FROM usuarios WHERE usuario = ?', (str(dados.get('usuario') or '').strip(),)
    ).fetchone()

    if not usuario or not check_password_hash(usuario['senha_hash'], str(dados.get('senha') or '')):
        return erro('Usuário ou senha incorretos.', 401)

    return jsonify({
        'sucesso': True,
        'token': gerar_token(usuario),
        'usuario': usuario['usuario'],
        'cargo': usuario['cargo'],
    })
