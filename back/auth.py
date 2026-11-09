import os
import secrets
from functools import wraps

from flask import g, request
from itsdangerous import BadSignature, URLSafeTimedSerializer

from db import DB_PATH
from utils import erro

TOKEN_VALIDADE_SEGUNDOS = 12 * 60 * 60  # 12 horas
_serializador = None


def _chave_secreta():
    chave = os.environ.get('SABOREAL_SECRET')
    if chave:
        return chave
    caminho = os.path.join(os.path.dirname(DB_PATH), '.secret_key')
    if not os.path.exists(caminho):
        with open(caminho, 'w', encoding='utf-8') as arquivo:
            arquivo.write(secrets.token_hex(32))
    with open(caminho, 'r', encoding='utf-8') as arquivo:
        return arquivo.read().strip()


def _serializer():
    global _serializador
    if _serializador is None:
        _serializador = URLSafeTimedSerializer(_chave_secreta(), salt='saboreal-sessao')
    return _serializador


def gerar_token(usuario):
    return _serializer().dumps(
        {'id': usuario['id'], 'usuario': usuario['usuario'], 'cargo': usuario['cargo']}
    )


def exige_login(funcao):
    @wraps(funcao)
    def envelope(*args, **kwargs):
        cabecalho = request.headers.get('Authorization', '')
        if not cabecalho.startswith('Bearer '):
            return erro('Faça login para continuar.', 401)
        try:
            g.usuario = _serializer().loads(cabecalho[7:], max_age=TOKEN_VALIDADE_SEGUNDOS)
        except BadSignature:  # inclui token expirado
            return erro('Sessão expirada. Faça login novamente.', 401)
        return funcao(*args, **kwargs)

    return envelope


def exige_gerente(funcao):
    @exige_login
    @wraps(funcao)
    def envelope(*args, **kwargs):
        if g.usuario.get('cargo') != 'GERENTE':
            return erro('Apenas o gerente pode fazer isso.', 403)
        return funcao(*args, **kwargs)

    return envelope