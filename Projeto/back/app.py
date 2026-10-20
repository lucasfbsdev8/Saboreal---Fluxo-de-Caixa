import sqlite3
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # Permite requisicoes do Frontend JS

DB_PATH = os.path.join(os.path.dirname(__file__), '../banco/saboreal.db')
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), '../banco/schema.sql')

def init_db():
    """ Inicializa o banco de dados caso nao exista """
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

# --- ROTAS DA API ---

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

@app.route('/api/vendas', methods=['POST'])
def realizar_venda():
    data = request.json
    db = get_db()
    try:
        caixa = db.execute('SELECT id FROM caixa WHERE status = "ABERTO" ORDER BY id DESC LIMIT 1').fetchone()
        caixa_id = caixa['id'] if caixa else None

        cursor = db.cursor()
        cursor.execute('INSERT INTO vendas (total, forma_pagamento, caixa_id) VALUES (?, ?, ?)',
                       (data['total'], data['forma_pagamento'], caixa_id))
        venda_id = cursor.lastrowid

        for item in data['itens']:
            cursor.execute('INSERT INTO itens_venda (venda_id, produto_codigo, quantidade, preco_unitario) VALUES (?, ?, ?, ?)',
                           (venda_id, item['codigo'], item['quantidade'], item['preco']))
            # Baixa no estoque
            cursor.execute('UPDATE produtos SET estoque = estoque - ? WHERE codigo = ?', 
                           (item['quantidade'], item['codigo']))
        
        db.commit()
        db.close()
        return jsonify({'sucesso': True, 'venda_id': venda_id})
    except Exception as e:
        db.rollback()
        db.close()
        return jsonify({'sucesso': False, 'erro': str(e)}), 500

@app.route('/api/dashboard/resumo', methods=['GET'])
def dashboard_resumo():
    db = get_db()
    faturamento_hoje = db.execute("SELECT SUM(total) as total FROM vendas WHERE date(data_venda) = date('now')").fetchone()['total'] or 0.0
    vendas_hoje = db.execute("SELECT COUNT(*) as qtd FROM vendas WHERE date(data_venda) = date('now')").fetchone()['qtd'] or 0
    db.close()
    return jsonify({
        'faturamento_hoje': faturamento_hoje,
        'vendas_hoje': vendas_hoje,
        'dinheiro_caixa': faturamento_hoje + 500.00
    })

if __name__ == '__main__':
    init_db()
    print("Servidor rodando em http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
