from flask import Blueprint, jsonify

from auth import exige_login
from db import exigir_caixa_aberto, get_db
from utils import FORMAS_VENDA, ErroNegocio, dados_json, inteiro

bp = Blueprint('vendas', __name__)


@bp.post('/vendas')
@exige_login
def realizar_venda():
    dados = dados_json()
    forma = dados.get('forma_pagamento')
    if forma not in FORMAS_VENDA:
        raise ErroNegocio('Forma de pagamento inválida.')

    # Junta linhas repetidas do mesmo produto e valida as quantidades.
    itens = {}
    for item in dados.get('itens') or []:
        codigo = str(item.get('codigo') or '')
        quantidade = inteiro(item.get('quantidade'))
        if not codigo or quantidade is None or quantidade <= 0:
            raise ErroNegocio('Item inválido no carrinho.')
        itens[codigo] = itens.get(codigo, 0) + quantidade
    if not itens:
        raise ErroNegocio('O carrinho está vazio.')

    db = get_db()
    db.execute('BEGIN IMMEDIATE')  # trava escrita: confere estoque e baixa sem corrida
    try:
        caixa = exigir_caixa_aberto(db, 'Não é possível vender com o caixa fechado.')

        total = 0
        linhas = []
        for codigo, quantidade in itens.items():
            produto = db.execute(
                'SELECT nome, preco_venda, estoque, status FROM produtos WHERE codigo = ?', (codigo,)
            ).fetchone()
            if not produto or produto['status'] != 'ATIVO':
                raise ErroNegocio(f'Produto {codigo} não encontrado.')
            if produto['estoque'] < quantidade:
                raise ErroNegocio(
                    f"Estoque insuficiente para '{produto['nome']}'. "
                    f"Disponível: {produto['estoque']}, solicitado: {quantidade}."
                )
            db.execute('UPDATE produtos SET estoque = estoque - ? WHERE codigo = ?', (quantidade, codigo))
            total += produto['preco_venda'] * quantidade  # preço vem do banco, não do navegador
            linhas.append((codigo, quantidade, produto['preco_venda']))

        cur = db.execute(
            'INSERT INTO vendas (caixa_id, total, forma_pagamento) VALUES (?, ?, ?)',
            (caixa['id'], total, forma),
        )
        venda_id = cur.lastrowid
        db.executemany(
            'INSERT INTO itens_venda (venda_id, produto_codigo, quantidade, preco_unitario) '
            'VALUES (?, ?, ?, ?)',
            [(venda_id, *linha) for linha in linhas],
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    return jsonify({'sucesso': True, 'venda_id': venda_id, 'total': total}), 201
