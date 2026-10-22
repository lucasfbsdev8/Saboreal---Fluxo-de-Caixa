DROP TABLE IF EXISTS itens_venda;
DROP TABLE IF EXISTS vendas;
DROP TABLE IF EXISTS movimentacoes_caixa;
DROP TABLE IF EXISTS caixa;
DROP TABLE IF EXISTS produtos;
DROP TABLE IF EXISTS usuarios;

-- Usuários do Sistema
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    cargo TEXT NOT NULL
);

-- Produtos
CREATE TABLE produtos (
    codigo TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL,
    preco_venda REAL NOT NULL,
    custo REAL DEFAULT 0.0,
    estoque INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ATIVO'
);

-- Registros de Caixa
CREATE TABLE caixa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operador TEXT NOT NULL,
    data_abertura DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_fechamento DATETIME,
    valor_abertura REAL NOT NULL,
    valor_fechamento REAL,
    status TEXT DEFAULT 'ABERTO',
    observacao TEXT
);

-- Vendas
CREATE TABLE vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caixa_id INTEGER,
    data_venda DATETIME DEFAULT CURRENT_TIMESTAMP,
    total REAL NOT NULL,
    forma_pagamento TEXT NOT NULL,
    FOREIGN KEY (caixa_id) REFERENCES caixa(id)
);

-- Itens da Venda
CREATE TABLE itens_venda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venda_id INTEGER NOT NULL,
    produto_codigo TEXT NOT NULL,
    quantidade INTEGER NOT NULL,
    preco_unitario REAL NOT NULL,
    custo_unitario REAL DEFAULT 0.0,
    FOREIGN KEY (venda_id) REFERENCES vendas(id),
    FOREIGN KEY (produto_codigo) REFERENCES produtos(codigo)
);

-- Movimentações de Saída / Despesas
CREATE TABLE movimentacoes_caixa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    categoria TEXT NOT NULL,
    descricao TEXT,
    valor REAL NOT NULL,
    forma_pagamento TEXT NOT NULL,
    retirado_de TEXT DEFAULT 'Caixa',
    data_movimentacao DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inserir usuário padrão
INSERT INTO usuarios (usuario, senha, cargo) VALUES ('admin', '1234', 'GERENTE');