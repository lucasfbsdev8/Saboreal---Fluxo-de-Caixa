import calendar
from datetime import date, datetime

from flask import Blueprint, jsonify, request

from auth import exige_login
from db import get_db, implantacao
from saldos import saldos_acumulados
from utils import CATEGORIAS_SAIDA, FORMAS_VENDA, ErroNegocio, inteiro

bp = Blueprint('relatorios', __name__)


def _data(campo):
    texto = request.args.get(campo)
    if not texto:
        return None
    try:
        datetime.strptime(texto, '%Y-%m-%d')
    except ValueError:
        raise ErroNegocio(f'Data inválida em "{campo}".')
    return texto


def _filtro_periodo(coluna):
    """Devolve (sql, params) para filtrar por ?inicio=&fim= (opcionais)."""
    sql, params = '', []
    inicio, fim = _data('inicio'), _data('fim')
    if inicio:
        sql += f' AND date({coluna}) >= ?'
        params.append(inicio)
    if fim:
        sql += f' AND date({coluna}) <= ?'
        params.append(fim)
    return sql, params


@bp.get('/relatorios/fluxo-caixa')
@exige_login
def fluxo_caixa():
    """Fluxo de caixa diário de um mês: entradas (vendas por forma), saídas (por categoria) e saldos."""
    db = get_db()
    agora = datetime.now()
    ano = inteiro(request.args.get('ano'), agora.year)
    mes = inteiro(request.args.get('mes'), agora.month)
    if not 2000 <= ano <= 2100 or not 1 <= mes <= 12:
        raise ErroNegocio('Mês ou ano inválido.')

    prefixo = f'{ano:04d}-{mes:02d}'
    primeiro_dia = f'{prefixo}-01'

    entradas = {}
    for l in db.execute(
        "SELECT CAST(strftime('%d', data_venda) AS INTEGER) AS dia, forma_pagamento, SUM(total) AS total "
        "FROM vendas WHERE strftime('%Y-%m', data_venda) = ? GROUP BY dia, forma_pagamento", (prefixo,)
    ):
        entradas[(l['dia'], l['forma_pagamento'])] = l['total']

    saidas = {}          # (dia, categoria) -> total
    saidas_caixa = {}    # dia -> saídas pagas em dinheiro (saem do caixa); as demais saem do banco
    for l in db.execute(
        "SELECT CAST(strftime('%d', data_movimentacao) AS INTEGER) AS dia, categoria, forma_pagamento, SUM(valor) AS total "
        "FROM movimentacoes_caixa WHERE tipo = 'SAIDA' AND strftime('%Y-%m', data_movimentacao) = ? "
        "GROUP BY dia, categoria, forma_pagamento", (prefixo,)
    ):
        chave = (l['dia'], l['categoria'])
        saidas[chave] = saidas.get(chave, 0) + l['total']
        if l['forma_pagamento'] == 'Dinheiro':
            saidas_caixa[l['dia']] = saidas_caixa.get(l['dia'], 0) + l['total']

    # Saldos de partida do mês. Caixa = dinheiro (inclui o valor informado na implantação);
    # banco = PIX e cartões. Os dois acumulam o que entrou/saiu antes do dia 1.
    registro = implantacao(db)
    inicio_sistema = datetime.strptime(registro['data_registro'][:10], '%Y-%m-%d').date() if registro else None
    saldos = saldos_acumulados(db, antes_de=primeiro_dia)   # mesma regra usada pela Tela Inicial
    saldo_caixa, saldo_banco = saldos['saldo_dinheiro'], saldos['saldo_banco']

    hoje = agora.date()
    dias = []
    for dia in range(1, calendar.monthrange(ano, mes)[1] + 1):
        data_dia = date(ano, mes, dia)
        # Dia sem dados: ainda não chegou ou é anterior à implantação do sistema.
        sem_dados = data_dia > hoje or (inicio_sistema is not None and data_dia < inicio_sistema)
        ent = {f: entradas.get((dia, f), 0) for f in FORMAS_VENDA}
        sai = {c: saidas.get((dia, c), 0) for c in CATEGORIAS_SAIDA}
        total_ent, total_sai = sum(ent.values()), sum(sai.values())

        ent_caixa = ent['Dinheiro']                 # vendas em dinheiro entram no caixa
        ent_banco = total_ent - ent_caixa           # PIX e cartões entram no banco
        sai_caixa = saidas_caixa.get(dia, 0)        # saídas pagas em dinheiro saem do caixa
        sai_banco = total_sai - sai_caixa           # saídas por PIX/cartão saem do banco
        caixa_final = saldo_caixa + ent_caixa - sai_caixa
        banco_final = saldo_banco + ent_banco - sai_banco

        dias.append({
            'dia': dia,
            'entradas': ent,
            'saidas': sai,
            'total_entradas': total_ent,
            'total_saidas': total_sai,
            'saldo_operacional': total_ent - total_sai,
            'sem_dados': sem_dados,
            'caixa_entradas': ent_caixa,
            'caixa_saidas': sai_caixa,
            'banco_entradas': ent_banco,
            'banco_saidas': sai_banco,
            'caixa_saldo_inicial': None if sem_dados else saldo_caixa,
            'caixa_saldo_final': None if sem_dados else caixa_final,
            'banco_saldo_inicial': None if sem_dados else saldo_banco,
            'banco_saldo_final': None if sem_dados else banco_final,
            # saldo geral = caixa + banco
            'saldo_inicial': None if sem_dados else saldo_caixa + saldo_banco,
            'saldo_final': None if sem_dados else caixa_final + banco_final,
        })
        saldo_caixa, saldo_banco = caixa_final, banco_final   # o saldo corre mesmo nos dias exibidos como "-"

    ativos = [d for d in dias if not d['sem_dados']]
    resumo = {
        'entradas': {f: sum(d['entradas'][f] for d in dias) for f in FORMAS_VENDA},
        'saidas': {c: sum(d['saidas'][c] for d in dias) for c in CATEGORIAS_SAIDA},
        'total_entradas': sum(d['total_entradas'] for d in dias),
        'total_saidas': sum(d['total_saidas'] for d in dias),
        'saldo_operacional': sum(d['saldo_operacional'] for d in dias),
        'caixa_entradas': sum(d['caixa_entradas'] for d in dias),
        'caixa_saidas': sum(d['caixa_saidas'] for d in dias),
        'banco_entradas': sum(d['banco_entradas'] for d in dias),
        'banco_saidas': sum(d['banco_saidas'] for d in dias),
    }
    for campo in ('caixa_saldo_inicial', 'banco_saldo_inicial', 'saldo_inicial'):
        resumo[campo] = ativos[0][campo] if ativos else None      # saldo do primeiro dia com dados
    for campo in ('caixa_saldo_final', 'banco_saldo_final', 'saldo_final'):
        resumo[campo] = ativos[-1][campo] if ativos else None     # saldo do último dia com dados

    anos = {agora.year, ano}
    for l in db.execute(
        "SELECT strftime('%Y', data_venda) AS a FROM vendas "
        "UNION SELECT strftime('%Y', data_movimentacao) FROM movimentacoes_caixa"
    ):
        if l['a']:
            anos.add(int(l['a']))

    return jsonify({
        'ano': ano,
        'mes': mes,
        'anos': sorted(anos, reverse=True),
        'formas': list(FORMAS_VENDA),
        'categorias': list(CATEGORIAS_SAIDA),
        'dias': dias,
        'resumo': resumo,
    })


@bp.get('/relatorios/movimentacoes')
@exige_login
def movimentacoes():
    """Histórico unificado do período: vendas (Entrada) e saídas de caixa (Saída), da mais recente para a mais antiga."""
    filtro_venda, params_venda = _filtro_periodo('v.data_venda')
    filtro_saida, params_saida = _filtro_periodo('m.data_movimentacao')
    linhas = get_db().execute(
        "SELECT 'Entrada' AS tipo, v.id AS id, v.data_venda AS data, v.total AS valor, "
        "v.forma_pagamento AS forma_pagamento, "
        "'Venda #' || v.id || ': ' || "
        "COALESCE(GROUP_CONCAT(i.quantidade || 'x ' || COALESCE(p.nome, i.produto_codigo), ', '), '-') AS descricao "
        'FROM vendas v '
        'LEFT JOIN itens_venda i ON i.venda_id = v.id '
        'LEFT JOIN produtos p ON p.codigo = i.produto_codigo '
        f'WHERE 1 = 1 {filtro_venda} '
        'GROUP BY v.id '
        'UNION ALL '
        "SELECT 'Saída', m.id, m.data_movimentacao, m.valor, m.forma_pagamento, "
        "m.categoria || CASE WHEN COALESCE(m.descricao, '') <> '' THEN ': ' || m.descricao ELSE '' END "
        'FROM movimentacoes_caixa m '
        f"WHERE m.tipo = 'SAIDA' {filtro_saida} "
        'ORDER BY data DESC, id DESC',
        params_venda + params_saida,
    ).fetchall()
    return jsonify([dict(l) for l in linhas])