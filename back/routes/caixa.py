from flask import Blueprint, g, jsonify

from auth import exige_login
from db import caixa_aberto, get_db, implantacao
from saldos import saldos_acumulados
from utils import CATEGORIAS_SAIDA, FORMAS_SAIDA, ErroNegocio, dados_json, inteiro

bp = Blueprint('caixa', __name__)


def resumo_gaveta(db, caixa):
    """Conferência da gaveta do caixa aberto (só deste turno), em centavos. Usada no fechamento
    e na validação de saídas em dinheiro. NÃO é o saldo geral da empresa: esse vem de
    saldos.saldos_acumulados(), a mesma regra do relatório de fluxo de caixa."""
    linha = db.execute(
        "SELECT "
        "(SELECT COALESCE(SUM(total), 0) FROM vendas "
        " WHERE caixa_id = :c AND forma_pagamento = 'Dinheiro') AS vendas_dinheiro, "
        "(SELECT COALESCE(SUM(valor), 0) FROM movimentacoes_caixa "
        " WHERE caixa_id = :c AND tipo = 'SAIDA' AND forma_pagamento = 'Dinheiro') AS saidas_dinheiro",
        {'c': caixa['id']},
    ).fetchone()
    return {
        'valor_abertura': caixa['valor_abertura'],
        'vendas_dinheiro': linha['vendas_dinheiro'],
        'saidas_dinheiro': linha['saidas_dinheiro'],
        'gaveta_esperada': caixa['valor_abertura'] + linha['vendas_dinheiro'] - linha['saidas_dinheiro'],
    }


def _ultimo_fechamento(db):
    """Saldo anterior da gaveta: o último fechamento; se ainda não houve nenhum, o saldo da implantação."""
    linha = db.execute(
        "SELECT valor_fechamento FROM caixa WHERE status = 'FECHADO' ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if linha and linha['valor_fechamento'] is not None:
        return linha['valor_fechamento']
    registro = implantacao(db)
    return registro['valor_inicial'] if registro else 0


@bp.get('/caixa/status')
@exige_login
def status():
    db = get_db()
    implantado = implantacao(db) is not None
    caixa = caixa_aberto(db)
    if caixa:
        return jsonify({'aberto': True, 'implantado': implantado, 'caixa': dict(caixa),
                        **resumo_gaveta(db, caixa), **saldos_acumulados(db)})
    return jsonify({'aberto': False, 'implantado': implantado, 'ultimo_valor_fechamento': _ultimo_fechamento(db),
                    **saldos_acumulados(db)})


@bp.post('/caixa/abrir')
@exige_login
def abrir():
    dados = dados_json()
    db = get_db()
    if caixa_aberto(db):
        raise ErroNegocio('Já existe um caixa aberto.', 409)

    reforco = inteiro(dados.get('reforco'), 0)
    if reforco < 0:
        raise ErroNegocio('Reforço inválido.')

    db.execute(
        'INSERT INTO caixa (operador, valor_abertura, observacao) VALUES (?, ?, ?)',
        (g.usuario['usuario'], _ultimo_fechamento(db) + reforco, str(dados.get('observacao') or '').strip()),
    )
    db.commit()
    return jsonify({'sucesso': True, 'mensagem': 'Caixa aberto com sucesso!'})


@bp.post('/caixa/fechar')
@exige_login
def fechar():
    dados = dados_json()
    db = get_db()
    caixa = caixa_aberto(db)
    if not caixa:
        raise ErroNegocio('Nenhum caixa aberto.', 409)

    informado = inteiro(dados.get('valor_fechamento'))
    if informado is None or informado < 0:
        raise ErroNegocio('Informe o valor contado no caixa.')

    esperado = resumo_gaveta(db, caixa)['gaveta_esperada']
    diferenca = informado - esperado
    db.execute(
        "UPDATE caixa SET status = 'FECHADO', data_fechamento = datetime('now', 'localtime'), "
        'valor_esperado = ?, valor_fechamento = ?, diferenca = ?, observacao = ? WHERE id = ?',
        (esperado, informado, diferenca, str(dados.get('observacao') or '').strip(), caixa['id']),
    )
    db.commit()
    return jsonify({'sucesso': True, 'mensagem': 'Caixa fechado com sucesso!', 'diferenca': diferenca})


@bp.post('/movimentacoes')
@exige_login
def registrar_saida():
    dados = dados_json()
    db = get_db()
    caixa = caixa_aberto(db)
    if not caixa:
        raise ErroNegocio('Abra o caixa para registrar saídas.', 409)

    categoria = dados.get('categoria')
    forma = dados.get('forma_pagamento')
    valor = inteiro(dados.get('valor'))
    if categoria not in CATEGORIAS_SAIDA:
        raise ErroNegocio('Categoria inválida.')
    if forma not in FORMAS_SAIDA:
        raise ErroNegocio('Forma de pagamento inválida.')
    if valor is None or valor <= 0:
        raise ErroNegocio('Informe um valor maior que zero.')
    if forma == 'Dinheiro' and valor > resumo_gaveta(db, caixa)['gaveta_esperada']:
        raise ErroNegocio('Saldo em dinheiro insuficiente para esta saída.')

    db.execute(
        "INSERT INTO movimentacoes_caixa (caixa_id, tipo, categoria, descricao, valor, forma_pagamento) "
        "VALUES (?, 'SAIDA', ?, ?, ?, ?)",
        (caixa['id'], categoria, str(dados.get('descricao') or '').strip()[:200], valor, forma),
    )
    db.commit()
    return jsonify({'sucesso': True, 'mensagem': 'Saída registrada com sucesso!'})