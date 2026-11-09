import os
import sqlite3
import sys

from flask import Flask, jsonify, redirect
from werkzeug.exceptions import HTTPException

from db import DB_PATH, close_db, init_db
from seed import PRODUTOS_INICIAIS
from utils import ErroNegocio
from routes.autenticacao import bp as bp_autenticacao
from routes.caixa import bp as bp_caixa
from routes.produtos import bp as bp_produtos
from routes.relatorios import bp as bp_relatorios
from routes.implantacao import bp as bp_implantacao
from routes.vendas import bp as bp_vendas

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONT_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'front'))


def criar_app():
    # O próprio Flask serve o front-end: mesma origem, sem CORS e sem URL fixa.
    app = Flask(__name__, static_folder=FRONT_DIR, static_url_path='')
    app.teardown_appcontext(close_db)

    for blueprint in (bp_autenticacao, bp_implantacao, bp_produtos, bp_caixa, bp_vendas, bp_relatorios):
        app.register_blueprint(blueprint, url_prefix='/api')

    @app.get('/')
    def raiz():
        return redirect('/login.html')

    @app.errorhandler(ErroNegocio)
    def tratar_erro_negocio(e):
        return jsonify({'sucesso': False, 'erro': e.mensagem}), e.status

    @app.errorhandler(HTTPException)
    def tratar_http(e):
        return jsonify({'sucesso': False, 'erro': e.description}), e.code

    @app.errorhandler(Exception)
    def tratar_inesperado(e):
        app.logger.exception(e)
        return jsonify({'sucesso': False, 'erro': 'Erro interno do servidor.'}), 500

    return app


app = criar_app()

if __name__ == '__main__':
    init_db()

    host = os.environ.get('SABOREAL_HOST', '127.0.0.1')
    porta = int(os.environ.get('SABOREAL_PORT', '5000'))
    debug = os.environ.get('SABOREAL_DEBUG') == '1'
    print(f'Saboreal rodando em http://{host}:{porta}')
    app.run(host=host, port=porta, debug=debug)
