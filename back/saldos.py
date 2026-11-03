"""Saldos acumulados da empresa: UMA única regra de cálculo, usada pela Tela Inicial
(/api/caixa/status) e pelo relatório de Fluxo de Caixa (/api/relatorios/fluxo-caixa).

  Saldo dinheiro (caixa) = saldo informado na implantação + vendas em dinheiro - saídas pagas em dinheiro
  Saldo banco            = vendas por PIX/cartão - saídas pagas por PIX/cartão
  Saldo total            = saldo dinheiro + saldo banco

Valores em centavos. Considera TODAS as vendas e saídas, de qualquer caixa (turno), e não só as do caixa aberto.
"""
from db import implantacao


def saldos_acumulados(db, antes_de=None):
    """antes_de: 'AAAA-MM-DD'. Se informado, considera só o que aconteceu ANTES desse dia
    (usado para obter o saldo inicial de um mês); se None, considera tudo até agora."""
    filtro_venda = ' AND date(data_venda) < :d' if antes_de else ''
    filtro_saida = ' AND date(data_movimentacao) < :d' if antes_de else ''
    linha = db.execute(
        "SELECT "
        "(SELECT COALESCE(SUM(total), 0) FROM vendas "
        f" WHERE forma_pagamento = 'Dinheiro'{filtro_venda}) AS venda_dinheiro, "
        "(SELECT COALESCE(SUM(total), 0) FROM vendas "
        f" WHERE forma_pagamento <> 'Dinheiro'{filtro_venda}) AS venda_banco, "
        "(SELECT COALESCE(SUM(valor), 0) FROM movimentacoes_caixa "
        f" WHERE tipo = 'SAIDA' AND forma_pagamento = 'Dinheiro'{filtro_saida}) AS saida_dinheiro, "
        "(SELECT COALESCE(SUM(valor), 0) FROM movimentacoes_caixa "
        f" WHERE tipo = 'SAIDA' AND forma_pagamento <> 'Dinheiro'{filtro_saida}) AS saida_banco",
        {'d': antes_de} if antes_de else {},
    ).fetchone()

    registro = implantacao(db)
    saldo_inicial = registro['valor_inicial'] if registro else 0
    dinheiro = saldo_inicial + linha['venda_dinheiro'] - linha['saida_dinheiro']
    banco = linha['venda_banco'] - linha['saida_banco']
    return {'saldo_dinheiro': dinheiro, 'saldo_banco': banco, 'valor_atual_total': dinheiro + banco}