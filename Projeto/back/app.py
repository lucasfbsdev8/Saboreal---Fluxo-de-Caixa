import sqlite3
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), '../banco/saboreal.db')
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), '../banco/schema.sql')

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
        cursor.executescript(f.read())
    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    db = get_db()
    user = db.execute('SELECT * FROM usuarios WHERE usuario = ? AND senha = ?', 
                      (data.get('usuario'), data.get('senha'))).fetchone()
    db.close()
    if user:
        return jsonify({'sucesso': True, 'usuario': user['usuario'], 'cargo': user['cargo']})
    return jsonify({'sucesso': False, 'mensagem': 'Usuário ou senha incorretos'}), 401

@app.route('/api/produtos', methods=['GET', 'POST'])
def produtos():
    db = get_db()
    if request.method == 'GET':
        prods = db.execute('SELECT * FROM produtos').fetchall()
        db.close()
        return jsonify([dict(p) for p in prods])
    
    if request.method == 'POST':
        data = request.json
        try:
            db.execute('''INSERT INTO produtos (codigo, nome, categoria, preco_venda, custo, estoque, status) 
                          VALUES (?, ?, ?, ?, ?, ?, ?)''',
                       (data['codigo'], data['nome'], data['categoria'], 
                        data['preco_venda'], data.get('custo', 0.0), data['estoque'], 'ATIVO'))
            db.commit()
            db.close()
            return jsonify({'sucesso': True, 'mensagem': 'Produto cadastrado!'})
        except Exception as e:
            db.close()
            return jsonify({'sucesso': False, 'erro': str(e)}), 400

@app.route('/api/produtos/estoque', methods=['POST'])
def ajustar_estoque():
    data = request.json
    codigo = data.get('codigo')
    quantidade = int(data.get('quantidade', 0))

    db = get_db()
    prod = db.execute('SELECT estoque FROM produtos WHERE codigo = ?', (codigo,)).fetchone()
    
    if not prod:
        db.close()
        return jsonify({'sucesso': False, 'erro': 'Produto não encontrado.'}), 404

    novo_estoque = prod['estoque'] + quantidade
    if novo_estoque < 0:
        db.close()
        return jsonify({'sucesso': False, 'erro': 'O estoque não pode ser negativo.'}), 400

    db.execute('UPDATE produtos SET estoque = ? WHERE codigo = ?', (novo_estoque, codigo))
    db.commit()
    db.close()
    return jsonify({'sucesso': True, 'novo_estoque': novo_estoque})

@app.route('/api/caixa/status', methods=['GET'])
def caixa_status():
    db = get_db()
    caixa = db.execute('SELECT * FROM caixa WHERE status = "ABERTO" ORDER BY id DESC LIMIT 1').fetchone()
    db.close()
    if caixa:
        return jsonify({'aberto': True, 'dados': dict(caixa)})
    return jsonify({'aberto': False})

@app.route('/api/caixa/abrir', methods=['POST'])
def abrir_caixa():
    data = request.json
    db = get_db()
    db.execute('INSERT INTO caixa (operador, valor_abertura, observacao) VALUES (?, ?, ?)',
               (data.get('operador', 'Gerência'), data.get('valor_abertura', 0.0), data.get('observacao', '')))
    db.commit()
    db.close()
    return jsonify({'sucesso': True, 'mensagem': 'Caixa aberto com sucesso!'})

@app.route('/api/caixa/fechar', methods=['POST'])
def fechar_caixa():
    data = request.json
    db = get_db()
    caixa = db.execute('SELECT * FROM caixa WHERE status = "ABERTO" ORDER BY id DESC LIMIT 1').fetchone()
    if caixa:
        db.execute('UPDATE caixa SET status = "FECHADO", data_fechamento = CURRENT_TIMESTAMP, valor_fechamento = ?, observacao = ? WHERE id = ?',
                   (data.get('valor_fechamento'), data.get('observacao'), caixa['id']))
        db.commit()
        db.close()
        return jsonify({'sucesso': True, 'mensagem': 'Caixa fechado com sucesso!'})
    db.close()
    return jsonify({'sucesso': False, 'mensagem': 'Nenhum caixa aberto encontrado.'}), 400

@app.route('/api/movimentacoes', methods=['POST', 'GET'])
def movimentacoes():
    db = get_db()
    if request.method == 'POST':
        data = request.json
        db.execute('''INSERT INTO movimentacoes_caixa 
                      (tipo, categoria, descricao, valor, forma_pagamento, retirado_de) 
                      VALUES (?, ?, ?, ?, ?, ?)''',
                   (data['tipo'], data['categoria'], data['descricao'], 
                    data['valor'], data['forma_pagamento'], data.get('retirado_de', 'Caixa')))
        db.commit()
        db.close()
        return jsonify({'sucesso': True, 'mensagem': 'Movimentação registrada!'})
    else:
        movs = db.execute('SELECT * FROM movimentacoes_caixa ORDER BY data_movimentacao DESC').fetchall()
        db.close()
        return jsonify([dict(m) for m in movs])

@app.route('/api/caixa/fluxo', methods=['GET'])
def obter_fluxo_caixa():
    db = get_db()
    fluxos = db.execute('SELECT * FROM fluxo_caixa_mensal ORDER BY id ASC').fetchall()
    db.close()
    return jsonify([dict(f) for f in fluxos])

@app.route('/api/vendas', methods=['POST'])
def realizar_venda():
    data = request.json
    db = get_db()
    try:
        for item in data['itens']:
            prod = db.execute('SELECT estoque, nome FROM produtos WHERE codigo = ?', (item['codigo'],)).fetchone()
            if not prod:
                db.close()
                return jsonify({'sucesso': False, 'erro': f"Produto {item['codigo']} não encontrado."}), 400
            if prod['estoque'] < item['quantidade']:
                db.close()
                return jsonify({
                    'sucesso': False, 
                    'erro': f"Estoque insuficiente para '{prod['nome']}'! Disponível: {prod['estoque']}, Solicitado: {item['quantidade']}"
                }), 400

        caixa = db.execute('SELECT id FROM caixa WHERE status = "ABERTO" ORDER BY id DESC LIMIT 1').fetchone()
        caixa_id = caixa['id'] if caixa else None

        cursor = db.cursor()
        cursor.execute('INSERT INTO vendas (total, forma_pagamento, caixa_id) VALUES (?, ?, ?)',
                       (data['total'], data['forma_pagamento'], caixa_id))
        venda_id = cursor.lastrowid

        for item in data['itens']:
            cursor.execute('INSERT INTO itens_venda (venda_id, produto_codigo, quantidade, preco_unitario) VALUES (?, ?, ?, ?)',
                           (venda_id, item['codigo'], item['quantidade'], item['preco']))
            cursor.execute('UPDATE produtos SET estoque = estoque - ? WHERE codigo = ?', 
                           (item['quantidade'], item['codigo']))
        
        db.commit()
        db.close()
        return jsonify({'sucesso': True, 'venda_id': venda_id})
    except Exception as e:
        db.rollback()
        db.close()
        return jsonify({'sucesso': False, 'erro': str(e)}), 500

@app.route('/api/vendas/historico', methods=['GET'])
def historico_vendas():
    db = get_db()
    vendas = db.execute('''
        SELECT v.id, strftime('%H:%M', v.data_venda) as hora, v.total, v.forma_pagamento,
               GROUP_CONCAT(i.quantidade || 'x ' || p.nome, ', ') as itens
        FROM vendas v
        JOIN itens_venda i ON v.id = i.venda_id
        JOIN produtos p ON i.produto_codigo = p.codigo
        GROUP BY v.id
        ORDER BY v.data_venda DESC
    ''').fetchall()
    db.close()
    return jsonify([dict(v) for v in vendas])

# FILTRO DE DATAS FUNCIONAL NO DASHBOARD (Hoje, Semana, Mes)
@app.route('/api/dashboard/resumo', methods=['GET'])
def dashboard_resumo():
    periodo = request.args.get('periodo', 'mes')
    db = get_db()

    condicao_vendas = "1=1"
    condicao_saidas = "tipo = 'SAIDA'"

    if periodo == 'hoje':
        condicao_vendas = "date(data_venda) = date('now', 'localtime')"
        condicao_saidas += " AND date(data_movimentacao) = date('now', 'localtime')"
    elif periodo == 'semana':
        condicao_vendas = "data_venda >= date('now', '-7 days', 'localtime')"
        condicao_saidas += " AND data_movimentacao >= date('now', '-7 days', 'localtime')"
    elif periodo == 'mes':
        condicao_vendas = "strftime('%Y-%m', data_venda) = strftime('%Y-%m', 'now', 'localtime')"
        condicao_saidas += " AND strftime('%Y-%m', data_movimentacao) = strftime('%Y-%m', 'now', 'localtime')"

    query_vendas = f"SELECT SUM(total) as total, COUNT(*) as qtd FROM vendas WHERE {condicao_vendas}"
    res_vendas = db.execute(query_vendas).fetchone()
    
    query_saidas = f"SELECT SUM(valor) as total FROM movimentacoes_caixa WHERE {condicao_saidas}"
    res_saidas = db.execute(query_saidas).fetchone()

    faturamento = res_vendas['total'] or 0.0
    vendas_qtd = res_vendas['qtd'] or 0
    saidas = res_saidas['total'] or 0.0

    # Busca detalhamento das formas de pagamento no periodo selecionado
    query_formas = f"SELECT forma_pagamento, SUM(total) as total FROM vendas WHERE {condicao_vendas} GROUP BY forma_pagamento"
    formas = db.execute(query_formas).fetchall()
    
    dict_formas = {f['forma_pagamento']: f['total'] for f in formas}

    db.close()

    return jsonify({
        'faturamento_hoje': faturamento,
        'vendas_hoje': vendas_qtd,
        'saidas': saidas,
        'saldo': faturamento - saidas,
        'formas_pagamento': {
            'Dinheiro': dict_formas.get('Dinheiro', 0.0),
            'PIX': dict_formas.get('PIX', 0.0),
            'Crédito': dict_formas.get('Crédito', 0.0),
            'Débito': dict_formas.get('Débito', 0.0)
        }
    })

if __name__ == '__main__':
    init_db()
    print("Servidor rodando em http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)