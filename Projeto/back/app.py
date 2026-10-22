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

@app.route('/api/produtos', methods=['GET', 'POST', 'PUT'])
def produtos():
    db = get_db()
    
    if request.method == 'GET':
        prods = db.execute('SELECT * FROM produtos ORDER BY CAST(codigo AS INTEGER) ASC').fetchall()
        
        proximo_codigo = "01"
        if prods:
            codigos_num = [int(p['codigo']) for p in prods if p['codigo'].isdigit()]
            if codigos_num:
                proximo_codigo = f"{max(codigos_num) + 1:02d}"
                
        db.close()
        return jsonify({
            'produtos': [dict(p) for p in prods],
            'proximo_codigo': proximo_codigo
        })
    
    if request.method == 'POST':
        data = request.json
        try:
            db.execute('''INSERT INTO produtos (codigo, nome, categoria, preco_venda, custo, estoque, status) 
                          VALUES (?, ?, ?, ?, ?, ?, ?)''',
                       (data['codigo'], data['nome'], data['categoria'], 
                        data['preco_venda'], data.get('custo', 0.0), data.get('estoque', 0), 'ATIVO'))
            db.commit()
            db.close()
            return jsonify({'sucesso': True, 'mensagem': 'Produto cadastrado!'})
        except Exception as e:
            db.close()
            return jsonify({'sucesso': False, 'erro': str(e)}), 400

    if request.method == 'PUT':
        data = request.json
        try:
            db.execute('''UPDATE produtos 
                          SET nome = ?, categoria = ?, preco_venda = ?, custo = ?
                          WHERE codigo = ?''',
                       (data['nome'], data['categoria'], data['preco_venda'], data.get('custo', 0.0), data['codigo']))
            db.commit()
            db.close()
            return jsonify({'sucesso': True, 'mensagem': 'Produto atualizado!'})
        except Exception as e:
            db.close()
            return jsonify({'sucesso': False, 'erro': str(e)}), 400

@app.route('/api/produtos/<codigo>', methods=['DELETE'])
def excluir_produto(codigo):
    db = get_db()
    try:
        prod = db.execute('SELECT * FROM produtos WHERE codigo = ?', (codigo,)).fetchone()
        if not prod:
            db.close()
            return jsonify({'sucesso': False, 'erro': 'Produto não encontrado.'}), 404

        db.execute('DELETE FROM produtos WHERE codigo = ?', (codigo,))
        db.commit()
        db.close()
        return jsonify({'sucesso': True, 'mensagem': f'Produto {codigo} excluído com sucesso!'})
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
    caixa_aberto = db.execute('SELECT * FROM caixa WHERE status = "ABERTO" ORDER BY id DESC LIMIT 1').fetchone()
    
    if caixa_aberto:
        caixa_id = caixa_aberto['id']
        valor_abertura = caixa_aberto['valor_abertura'] or 0.0

        vendas_dinheiro = db.execute('''
            SELECT SUM(total) as total 
            FROM vendas 
            WHERE caixa_id = ? AND forma_pagamento = "Dinheiro"
        ''', (caixa_id,)).fetchone()['total'] or 0.0

        vendas_banco = db.execute('''
            SELECT SUM(total) as total 
            FROM vendas 
            WHERE caixa_id = ? AND forma_pagamento IN ("PIX", "Crédito", "Débito")
        ''', (caixa_id,)).fetchone()['total'] or 0.0

        data_abertura = caixa_aberto['data_abertura']
        saidas_dinheiro = db.execute('''
            SELECT SUM(valor) as total 
            FROM movimentacoes_caixa 
            WHERE tipo = "SAIDA" AND forma_pagamento = "Dinheiro" AND data_movimentacao >= ?
        ''', (data_abertura,)).fetchone()['total'] or 0.0

        saldo_dinheiro = valor_abertura + vendas_dinheiro - saidas_dinheiro
        saldo_banco = vendas_banco
        valor_atual_total = saldo_dinheiro + saldo_banco

        db.close()
        return jsonify({
            'aberto': True, 
            'dados': dict(caixa_aberto),
            'valor_abertura': valor_abertura,
            'valor_atual_total': valor_atual_total,
            'saldo_dinheiro': saldo_dinheiro,
            'saldo_banco': saldo_banco,
            'valor_calculado_fechamento': saldo_dinheiro,
            'detalhes_fechamento': {
                'valor_abertura': valor_abertura,
                'vendas_dinheiro': vendas_dinheiro,
                'saidas_dinheiro': saidas_dinheiro
            }
        })
    
    ultimo_fechamento = db.execute('SELECT valor_fechamento FROM caixa WHERE status = "FECHADO" ORDER BY id DESC LIMIT 1').fetchone()
    db.close()
    
    valor_anterior = ultimo_fechamento['valor_fechamento'] if ultimo_fechamento and ultimo_fechamento['valor_fechamento'] is not None else 0.0
    
    return jsonify({
        'aberto': False,
        'ultimo_valor_fechamento': valor_anterior
    })

@app.route('/api/caixa/abrir', methods=['POST'])
def abrir_caixa():
    data = request.json
    db = get_db()
    valor_abertura_total = float(data.get('valor_abertura', 0.0))
    db.execute('INSERT INTO caixa (operador, valor_abertura, observacao) VALUES (?, ?, ?)',
               (data.get('operador', 'Gerência'), valor_abertura_total, data.get('observacao', '')))
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
        try:
            db.execute('''INSERT INTO movimentacoes_caixa 
                          (tipo, categoria, descricao, valor, forma_pagamento, retirado_de) 
                          VALUES (?, ?, ?, ?, ?, ?)''',
                       (data.get('tipo', 'SAIDA'), data.get('categoria', ''), data.get('descricao', ''), 
                        data.get('valor', 0.0), data.get('forma_pagamento', 'Dinheiro'), data.get('retirado_de', 'Caixa')))
            db.commit()
            db.close()
            return jsonify({'sucesso': True, 'mensagem': 'Movimentação registrada com sucesso!'})
        except Exception as e:
            db.close()
            return jsonify({'sucesso': False, 'erro': str(e)}), 400
    else:
        movs = db.execute('SELECT * FROM movimentacoes_caixa ORDER BY data_movimentacao DESC').fetchall()
        db.close()
        return jsonify([dict(m) for m in movs])

@app.route('/api/vendas', methods=['POST'])
def realizar_venda():
    data = request.json
    db = get_db()
    try:
        caixa = db.execute('SELECT id FROM caixa WHERE status = "ABERTO" ORDER BY id DESC LIMIT 1').fetchone()
        if not caixa:
            db.close()
            return jsonify({'sucesso': False, 'erro': 'Não é possível realizar vendas com o caixa fechado!'}), 400

        for item in data['itens']:
            prod = db.execute('SELECT estoque, nome, custo FROM produtos WHERE codigo = ?', (item['codigo'],)).fetchone()
            if not prod:
                db.close()
                return jsonify({'sucesso': False, 'erro': f"Produto {item['codigo']} não encontrado."}), 400
            if prod['estoque'] < item['quantidade']:
                db.close()
                return jsonify({
                    'sucesso': False, 
                    'erro': f"Estoque insuficiente para '{prod['nome']}'! Disponível: {prod['estoque']}, Solicitado: {item['quantidade']}"
                }), 400

        cursor = db.cursor()
        cursor.execute('INSERT INTO vendas (total, forma_pagamento, caixa_id) VALUES (?, ?, ?)',
                       (data['total'], data['forma_pagamento'], caixa['id']))
        venda_id = cursor.lastrowid

        for item in data['itens']:
            prod = db.execute('SELECT custo FROM produtos WHERE codigo = ?', (item['codigo'],)).fetchone()
            custo_unit = prod['custo'] if prod else 0.0
            
            cursor.execute('INSERT INTO itens_venda (venda_id, produto_codigo, quantidade, preco_unitario, custo_unitario) VALUES (?, ?, ?, ?, ?)',
                           (venda_id, item['codigo'], item['quantidade'], item['preco'], custo_unit))
            cursor.execute('UPDATE produtos SET estoque = estoque - ? WHERE codigo = ?', 
                           (item['quantidade'], item['codigo']))
        
        db.commit()
        db.close()
        return jsonify({'sucesso': True, 'venda_id': venda_id})
    except Exception as e:
        db.rollback()
        db.close()
        return jsonify({'sucesso': False, 'erro': str(e)}), 500

# RELATÓRIOS DINÂMICOS
@app.route('/api/relatorios/fluxo-caixa', methods=['GET'])
def relatorio_fluxo_caixa():
    ano = request.args.get('ano', '2026')
    db = get_db()
    
    meses_nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    resultado = []

    for idx, mes in enumerate(meses_nomes, start=1):
        str_mes = f"{ano}-{idx:02d}"

        vendas = db.execute("SELECT SUM(total) as total FROM vendas WHERE strftime('%Y-%m', data_venda) = ?", (str_mes,)).fetchone()
        faturamento = vendas['total'] or 0.0

        custos = db.execute('''
            SELECT SUM(i.quantidade * i.custo_unitario) as total_custo
            FROM itens_venda i
            JOIN vendas v ON i.venda_id = v.id
            WHERE strftime('%Y-%m', v.data_venda) = ?
        ''', (str_mes,)).fetchone()
        cpv = custos['total_custo'] or 0.0

        saidas = db.execute("SELECT SUM(valor) as total FROM movimentacoes_caixa WHERE strftime('%Y-%m', data_movimentacao) = ?", (str_mes,)).fetchone()
        despesas = saidas['total'] or 0.0

        lucro_bruto = faturamento - cpv
        lucro_liquido = lucro_bruto - despesas

        resultado.append({
            'mes': f"{mes}/{ano[2:]}",
            'faturamento': faturamento,
            'custo_produtos': cpv,
            'lucro_bruto': lucro_bruto,
            'despesas': despesas,
            'lucro_liquido': lucro_liquido
        })

    db.close()
    return jsonify(resultado)

@app.route('/api/relatorios/vendas-detalhado', methods=['GET'])
def relatorio_vendas():
    inicio = request.args.get('inicio')
    fim = request.args.get('fim')
    
    db = get_db()
    query = '''
        SELECT v.id, v.data_venda, v.total, v.forma_pagamento,
               GROUP_CONCAT(i.quantidade || 'x ' || p.nome, ', ') as descricao_itens
        FROM vendas v
        JOIN itens_venda i ON v.id = i.venda_id
        JOIN produtos p ON i.produto_codigo = p.codigo
    '''
    params = []
    if inicio and fim:
        query += ' WHERE date(v.data_venda) BETWEEN date(?) AND date(?)'
        params.extend([inicio, fim])
        
    query += ' GROUP BY v.id ORDER BY v.data_venda DESC'
    
    vendas = db.execute(query, params).fetchall()
    db.close()
    return jsonify([dict(v) for v in vendas])

@app.route('/api/relatorios/top-produtos', methods=['GET'])
def relatorio_top_produtos():
    db = get_db()
    top = db.execute('''
        SELECT p.codigo, p.nome, SUM(i.quantidade) as total_vendido, SUM(i.quantidade * i.preco_unitario) as faturamento_total
        FROM itens_venda i
        JOIN produtos p ON i.produto_codigo = p.codigo
        GROUP BY p.codigo
        ORDER BY total_vendido DESC
        LIMIT 10
    ''').fetchall()
    db.close()
    return jsonify([dict(t) for t in top])

@app.route('/api/admin/resetar-dados', methods=['POST'])
def resetar_dados():
    db = get_db()
    try:
        db.execute('DELETE FROM itens_venda')
        db.execute('DELETE FROM vendas')
        db.execute('DELETE FROM movimentacoes_caixa')
        db.execute('DELETE FROM caixa')
        db.commit()
        db.close()
        return jsonify({'sucesso': True, 'mensagem': 'Todos os dados de testes foram apagados com sucesso!'})
    except Exception as e:
        db.close()
        return jsonify({'sucesso': False, 'erro': str(e)}), 500

if __name__ == '__main__':
    init_db()
    print("Servidor rodando em http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)