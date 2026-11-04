from flask import Blueprint, jsonify

from auth import exige_login
from db import exigir_caixa_aberto, get_db
from utils import CATEGORIAS_PRODUTO, ErroNegocio, dados_json, inteiro

bp = Blueprint('produtos', __name__)


def _proximo_codigo(db):
    # Considera também os inativos, para nunca reaproveitar um código.
    numeros = [int(l['codigo']) for l in db.execute('SELECT codigo FROM produtos') if l['codigo'].isdigit()]
    return f'{max(numeros, default=0) + 1:02d}'


def _validar(dados):
    nome = str(dados.get('nome') or '').strip()
    if not nome:
        raise ErroNegocio('Informe o nome do produto.')
    categoria = dados.get('categoria')
    if categoria not in CATEGORIAS_PRODUTO:
        raise ErroNegocio('Escolha uma das categorias: ' + ', '.join(CATEGORIAS_PRODUTO) + '.')
    preco = inteiro(dados.get('preco_venda'))
    if preco is None or preco < 0:
        raise ErroNegocio('Preço de venda inválido.')
    return nome[:80], categoria, preco


@bp.get('/produtos')
@exige_login
def listar():
    db = get_db()
    linhas = db.execute(
        "SELECT codigo, nome, categoria, preco_venda, estoque FROM produtos WHERE status = 'ATIVO' "
        'ORDER BY CAST(codigo AS INTEGER), codigo'
    ).fetchall()
    return jsonify({'produtos': [dict(l) for l in linhas], 'proximo_codigo': _proximo_codigo(db)})


@bp.post('/produtos')
@exige_login
def cadastrar():
    db = get_db()
    exigir_caixa_aberto(db, 'Abra o caixa para cadastrar produtos.')
    dados = dados_json()
    nome, categoria, preco = _validar(dados)
    estoque = inteiro(dados.get('estoque'), 0)
    if estoque < 0:
        raise ErroNegocio('Estoque inicial inválido.')

    codigo = _proximo_codigo(db)
    db.execute(
        'INSERT INTO produtos (codigo, nome, categoria, preco_venda, estoque) VALUES (?, ?, ?, ?, ?)',
        (codigo, nome, categoria, preco, estoque),
    )
    db.commit()
    return jsonify({'sucesso': True, 'mensagem': 'Produto cadastrado!', 'codigo': codigo}), 201


@bp.put('/produtos/<codigo>')
@exige_login
def atualizar(codigo):
    db = get_db()
    exigir_caixa_aberto(db, 'Abra o caixa para editar produtos.')
    nome, categoria, preco = _validar(dados_json())
    cur = db.execute(
        "UPDATE produtos SET nome = ?, categoria = ?, preco_venda = ? WHERE codigo = ? AND status = 'ATIVO'",
        (nome, categoria, preco, codigo),
    )
    if cur.rowcount == 0:
        raise ErroNegocio('Produto não encontrado.', 404)
    db.commit()
    return jsonify({'sucesso': True, 'mensagem': 'Produto atualizado!'})


@bp.delete('/produtos/<codigo>')
@exige_login
def remover(codigo):
    # "Excluir" inativa o produto: o histórico de vendas continua íntegro.
    db = get_db()
    exigir_caixa_aberto(db, 'Abra o caixa para excluir produtos.')
    cur = db.execute("UPDATE produtos SET status = 'INATIVO' WHERE codigo = ? AND status = 'ATIVO'", (codigo,))
    if cur.rowcount == 0:
        raise ErroNegocio('Produto não encontrado.', 404)
    db.commit()
    return jsonify({'sucesso': True, 'mensagem': 'Produto removido do catálogo. O histórico de vendas foi preservado.'})


@bp.post('/produtos/estoque')
@exige_login
def ajustar_estoque():
    db = get_db()
    exigir_caixa_aberto(db, 'Abra o caixa para movimentar o estoque.')
    dados = dados_json()
    codigo = str(dados.get('codigo') or '')
    quantidade = inteiro(dados.get('quantidade'))
    if quantidade is None or quantidade == 0:
        raise ErroNegocio('Informe uma quantidade diferente de zero.')

    if not db.execute("SELECT 1 FROM produtos WHERE codigo = ? AND status = 'ATIVO'", (codigo,)).fetchone():
        raise ErroNegocio('Produto não encontrado.', 404)

    cur = db.execute(
        'UPDATE produtos SET estoque = estoque + ? WHERE codigo = ? AND estoque + ? >= 0',
        (quantidade, codigo, quantidade),
    )
    if cur.rowcount == 0:
        raise ErroNegocio('O estoque não pode ficar negativo.')
    db.commit()

    novo = db.execute('SELECT estoque FROM produtos WHERE codigo = ?', (codigo,)).fetchone()['estoque']
    return jsonify({'sucesso': True, 'novo_estoque': novo})
