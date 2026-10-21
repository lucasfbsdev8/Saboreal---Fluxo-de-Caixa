-- Criacao do Schema do Banco de Dados SABOREAL

CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL,
    cargo TEXT NOT NULL DEFAULT 'Gerência'
);

CREATE TABLE IF NOT EXISTS produtos (
    codigo TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL,
    preco_venda REAL NOT NULL,
    custo REAL DEFAULT 0.0,
    estoque INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ATIVO'
);

CREATE TABLE IF NOT EXISTS caixa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operador TEXT NOT NULL,
    valor_abertura REAL NOT NULL,
    data_abertura DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_fechamento DATETIME,
    valor_fechamento REAL,
    status TEXT NOT NULL DEFAULT 'ABERTO',
    observacao TEXT
);

CREATE TABLE IF NOT EXISTS vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_venda DATETIME DEFAULT CURRENT_TIMESTAMP,
    total REAL NOT NULL,
    forma_pagamento TEXT NOT NULL,
    caixa_id INTEGER,
    FOREIGN KEY(caixa_id) REFERENCES caixa(id)
);

CREATE TABLE IF NOT EXISTS itens_venda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venda_id INTEGER NOT NULL,
    produto_codigo TEXT NOT NULL,
    quantidade INTEGER NOT NULL,
    preco_unitario REAL NOT NULL,
    FOREIGN KEY(venda_id) REFERENCES vendas(id),
    FOREIGN KEY(produto_codigo) REFERENCES produtos(codigo)
);

CREATE TABLE IF NOT EXISTS movimentacoes_caixa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL, -- 'ENTRADA' ou 'SAIDA'
    categoria TEXT NOT NULL,
    descricao TEXT,
    valor REAL NOT NULL,
    forma_pagamento TEXT NOT NULL,
    retirado_de TEXT DEFAULT 'Caixa',
    data_movimentacao DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fluxo_caixa_mensal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mes TEXT NOT NULL,
    saldo_inicial REAL NOT NULL,
    entradas REAL NOT NULL,
    saidas REAL NOT NULL,
    lucro REAL NOT NULL,
    saldo REAL NOT NULL
);

-- Carga Inicial de Dados
INSERT OR IGNORE INTO usuarios (usuario, senha, cargo) VALUES ('admin', '1234', 'Gerência');

INSERT OR IGNORE INTO produtos (codigo, nome, categoria, preco_venda, estoque) VALUES 
('01', 'Biscoito', 'Biscoitos', 2.00, 87),
('02', 'Pedaço de bolo', 'Bolos', 2.50, 15),
('03', 'Roda de bolo', 'Bolos', 12.00, 3),
('04', 'Sonho', 'Doces', 2.50, 7),
('05', 'Pudim', 'Pudim', 10.00, 2);

-- Dados mockados do Fluxo de Caixa (Abril a Setembro)
INSERT OR IGNORE INTO fluxo_caixa_mensal (id, mes, saldo_inicial, entradas, saidas, lucro, saldo) VALUES
(1, 'Abril', 6057.70, 15328.00, 6195.20, 9132.80, 15190.50),
(2, 'Maio', 15190.50, 13890.00, 6047.80, 7842.20, 23032.70),
(3, 'Junho', 23032.70, 13406.00, 5963.10, 7442.90, 30475.60),
(4, 'Julho', 30475.60, 14355.00, 6109.40, 8245.60, 38721.20),
(5, 'Agosto', 38721.20, 14050.00, 6096.00, 7954.00, 46675.20),
(6, 'Setembro', 46675.20, 15128.00, 5931.20, 9196.80, 55872.00);