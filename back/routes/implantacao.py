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
    """Registra, uma única vez, os saldos que a empresa tinha antes de usar o sistema:
    dinheiro em espécie no caixa e saldo no banco (PIX/conta)."""
    dados = dados_json()
    db = get_db()
    if implantacao(db):
        raise ErroNegocio('Os saldos iniciais já foram registrados e não podem ser alterados.', 409)

    saldo_caixa = inteiro(dados.get('saldo_caixa'))
    saldo_banco = inteiro(dados.get('saldo_banco'))
    if saldo_caixa is None or saldo_caixa < 0:
        raise ErroNegocio('Informe o saldo inicial em caixa (zero ou mais).')
    if saldo_banco is None or saldo_banco < 0:
        raise ErroNegocio('Informe o saldo inicial em banco (zero ou mais).')

    db.execute(
        'INSERT INTO implantacao (id, saldo_caixa, saldo_banco, usuario, observacao) VALUES (1, ?, ?, ?, ?)',
        (saldo_caixa, saldo_banco, g.usuario['usuario'], str(dados.get('observacao') or '').strip()[:200]),
    )
    db.commit()
    return jsonify({'sucesso': True, 'mensagem': 'Saldos iniciais registrados!'}), 201