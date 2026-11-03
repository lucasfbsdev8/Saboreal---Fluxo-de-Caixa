-- SABOREAL - esquema do banco (SQLite)
-- Seguro para rodar a cada inicialização: nada é apagado.
-- Todos os valores em dinheiro são guardados em CENTAVOS (INTEGER).
-- Datas em horário local do servidor.

CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    cargo TEXT NOT NULL DEFAULT 'OPERADOR'
);

CREATE TABLE IF NOT EXISTS produtos (
    codigo TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL CHECK (categoria IN ('Biscoitos', 'Doces', 'Bolos', 'Salgados', 'Bebidas')),
    preco_venda INTEGER NOT NULL CHECK (preco_venda >= 0),
    estoque INTEGER NOT NULL DEFAULT 0 CHECK (estoque >= 0),
    status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO'))
);

CREATE TABLE IF NOT EXISTS caixa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operador TEXT NOT NULL,
    data_abertura DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    data_fechamento DATETIME,
    valor_abertura INTEGER NOT NULL,
    valor_esperado INTEGER,
    valor_fechamento INTEGER,
    diferenca INTEGER,                      -- negativo = quebra, positivo = sobra
    status TEXT NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'FECHADO')),
    observacao TEXT
);

-- Garante, no próprio banco, que existe no máximo UM caixa aberto.
CREATE UNIQUE INDEX IF NOT EXISTS ux_caixa_unico_aberto ON caixa(status) WHERE status = 'ABERTO';

CREATE TABLE IF NOT EXISTS vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caixa_id INTEGER NOT NULL REFERENCES caixa(id),
    data_venda DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    total INTEGER NOT NULL,
    forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('Dinheiro', 'PIX', 'Crédito', 'Débito'))
);

CREATE TABLE IF NOT EXISTS itens_venda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venda_id INTEGER NOT NULL REFERENCES vendas(id),
    produto_codigo TEXT NOT NULL REFERENCES produtos(codigo),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS movimentacoes_caixa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caixa_id INTEGER NOT NULL REFERENCES caixa(id),
    tipo TEXT NOT NULL DEFAULT 'SAIDA',
    categoria TEXT NOT NULL,
    descricao TEXT,
    valor INTEGER NOT NULL CHECK (valor > 0),
    forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('Dinheiro', 'PIX', 'Cartão')),
    data_movimentacao DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS ix_vendas_data ON vendas(data_venda);
CREATE INDEX IF NOT EXISTS ix_vendas_caixa ON vendas(caixa_id);
CREATE INDEX IF NOT EXISTS ix_itens_venda ON itens_venda(venda_id);
CREATE INDEX IF NOT EXISTS ix_mov_caixa ON movimentacoes_caixa(caixa_id);
CREATE INDEX IF NOT EXISTS ix_mov_data ON movimentacoes_caixa(data_movimentacao);

CREATE TABLE IF NOT EXISTS implantacao (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    valor_inicial INTEGER NOT NULL CHECK (valor_inicial >= 0),
    data_registro DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
    usuario TEXT NOT NULL,
    observacao TEXT
);