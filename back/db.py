import os
import sqlite3

from flask import g
from werkzeug.security import generate_password_hash

from seed import popular_produtos
from utils import ErroNegocio

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.abspath(
    os.environ.get('SABOREAL_DB') or os.path.join(BASE_DIR, '..', 'banco', 'saboreal.db')
)
SCHEMA_PATH = os.path.join(BASE_DIR, '..', 'banco', 'schema.sql')


def get_db():
    """Uma conexão por requisição, fechada automaticamente (teardown)."""
    if 'db' not in g:
        conexao = sqlite3.connect(DB_PATH)
        conexao.row_factory = sqlite3.Row
        conexao.execute('PRAGMA foreign_keys = ON')
        g.db = conexao
    return g.db


def close_db(_erro=None):
    conexao = g.pop('db', None)
    if conexao is not None:
        conexao.close()


def init_db():
    """Cria as tabelas se não existirem. Nunca apaga dados."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conexao = sqlite3.connect(DB_PATH)

    usuarios = [c[1] for c in conexao.execute('PRAGMA table_info(usuarios)')]
    produtos = [c[1] for c in conexao.execute('PRAGMA table_info(produtos)')]
    if (usuarios and 'senha_hash' not in usuarios) or (produtos and 'custo' in produtos):
        conexao.close()
        raise SystemExit(
            'Banco em formato antigo detectado.\n'
            f'Apague o arquivo {DB_PATH} e rode novamente (ele será recriado já com os produtos iniciais).'
        )

        # Migração: a implantação antiga guardava um valor único (valor_inicial = dinheiro do caixa).
    impl = [c[1] for c in conexao.execute('PRAGMA table_info(implantacao)')]
    if impl and 'saldo_caixa' not in impl:
        conexao.execute('ALTER TABLE implantacao RENAME COLUMN valor_inicial TO saldo_caixa')
        conexao.execute('ALTER TABLE implantacao ADD COLUMN saldo_banco INTEGER NOT NULL DEFAULT 0')
        
    with open(SCHEMA_PATH, 'r', encoding='utf-8') as arquivo:
        conexao.executescript(arquivo.read())

    if conexao.execute('SELECT COUNT(*) FROM usuarios').fetchone()[0] == 0:
        conexao.execute(
            'INSERT INTO usuarios (usuario, senha_hash, cargo) VALUES (?, ?, ?)',
            ('admin', generate_password_hash('1234'), 'GERENTE'),
        )
    if conexao.execute('SELECT COUNT(*) FROM produtos').fetchone()[0] == 0:
        popular_produtos(conexao)   # banco novo já nasce com os produtos iniciais
    conexao.commit()
    conexao.close()


def caixa_aberto(db):
    return db.execute(
        "SELECT * FROM caixa WHERE status = 'ABERTO' ORDER BY id DESC LIMIT 1"
    ).fetchone()


def exigir_caixa_aberto(db, mensagem='O caixa está fechado. Abra o caixa para continuar.'):
    caixa = caixa_aberto(db)
    if not caixa:
        raise ErroNegocio(mensagem, 409)
    return caixa


def implantacao(db):
    """Registro do saldo inicial informado no primeiro acesso (ou None se ainda não foi informado)."""
    return db.execute('SELECT * FROM implantacao WHERE id = 1').fetchone()