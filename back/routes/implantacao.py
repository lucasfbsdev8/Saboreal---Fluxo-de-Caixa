from flask import Blueprint, g, jsonify

from auth import exige_gerente, exige_login
from db import get_db, implantacao
from utils import ErroNegocio, dados_json, inteiro

bp = Blueprint('implantacao', __name__)


@bp.get('/implantacao')
@exige_login
def consultar():
    registro = implantacao(get_db())
    if not registro:
        return jsonify({'implantado': False})
    return jsonify({'implantado': True, **dict(registro)})


@bp.post('/implantacao')
@exige_gerente
def registrar():
    """Registra, uma única vez, o dinheiro que havia no caixa antes de usar o sistema."""
    dados = dados_json()
    db = get_db()
    if implantacao(db):
        raise ErroNegocio('O saldo inicial já foi registrado e não pode ser alterado.', 409)

    valor = inteiro(dados.get('valor_inicial'))
    if valor is None or valor < 0:
        raise ErroNegocio('Informe um valor válido (zero ou mais).')

    db.execute(
        'INSERT INTO implantacao (id, valor_inicial, usuario, observacao) VALUES (1, ?, ?, ?)',
        (valor, g.usuario['usuario'], str(dados.get('observacao') or '').strip()[:200]),
    )
    db.commit()
    return jsonify({'sucesso': True, 'mensagem': 'Saldo inicial registrado!'}), 201