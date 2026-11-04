"""Produtos iniciais da loja (lista manuscrita do cliente) e restauração de fábrica."""

# Estoque de partida: cada produto da categoria começa com esta quantidade.
ESTOQUE_INICIAL = {'Biscoitos': 50, 'Doces': 20, 'Bolos': 8, 'Salgados': 25, 'Bebidas': 15}

# (categoria, nome, preço em centavos). Os códigos 01..39 seguem esta ordem.
PRODUTOS_INICIAIS = [
    ('Biscoitos', 'Pão de queijo', 350),
    ('Biscoitos', 'Pão de sal', 100),
    ('Biscoitos', 'Pão sovado', 400),
    ('Biscoitos', 'Pão de forma (pacote)', 1000),
    ('Biscoitos', 'Broa de fubá', 300),
    ('Biscoitos', 'Biscoito de queijo', 300),
    ('Biscoitos', 'Torrada (pacote)', 700),

    ('Doces', 'Pudim (fatia)', 700),
    ('Doces', 'Pudim (roda)', 2300),
    ('Doces', 'Torta (fatia)', 1200),
    ('Doces', 'Torta inteira', 3700),
    ('Doces', 'Donut', 700),
    ('Doces', 'Brownie', 800),
    ('Doces', 'Cookie', 400),
    ('Doces', 'Sonho', 500),
    ('Doces', 'Rosca', 400),

    ('Bolos', 'Bolo de cenoura (fatia)', 450),
    ('Bolos', 'Bolo de chocolate (fatia)', 450),
    ('Bolos', 'Bolo de fubá (fatia)', 350),
    ('Bolos', 'Bolo de cenoura (roda)', 1200),
    ('Bolos', 'Bolo de chocolate (roda)', 1200),
    ('Bolos', 'Bolo de fubá (roda)', 1100),

    ('Salgados', 'Coxinha', 700),
    ('Salgados', 'Empada', 600),
    ('Salgados', 'Quibe', 700),
    ('Salgados', 'Esfirra', 500),
    ('Salgados', 'Enroladinho', 600),
    ('Salgados', 'Pastel', 800),

    ('Bebidas', 'Café preto', 200),
    ('Bebidas', 'Café com leite', 350),
    ('Bebidas', 'Achocolatado 200ml', 400),
    ('Bebidas', 'Refrigerante lata', 500),
    ('Bebidas', 'Refrigerante 600ml', 800),
    ('Bebidas', 'Refrigerante 2L', 1300),
    ('Bebidas', 'Água mineral', 200),
    ('Bebidas', 'Água com gás', 350),
    ('Bebidas', 'Leite 1L', 600),
    ('Bebidas', 'Energético lata', 1000),
    ('Bebidas', 'Suco lata', 700),
]


def popular_produtos(conexao):
    for numero, (categoria, nome, preco) in enumerate(PRODUTOS_INICIAIS, start=1):
        conexao.execute(
            'INSERT INTO produtos (codigo, nome, categoria, preco_venda, estoque) VALUES (?, ?, ?, ?, ?)',
            (f'{numero:02d}', nome, categoria, preco, ESTOQUE_INICIAL[categoria]),
        )


def restaurar_fabrica(conexao):
    """Apaga vendas, saídas, caixas e produtos e recria os produtos iniciais. Mantém os usuários."""
    for tabela in ('itens_venda', 'vendas', 'movimentacoes_caixa', 'caixa', 'produtos', 'implantacao'):
        conexao.execute(f'DELETE FROM {tabela}')
    conexao.execute(
        "DELETE FROM sqlite_sequence WHERE name IN ('itens_venda', 'vendas', 'movimentacoes_caixa', 'caixa')"
    )
    popular_produtos(conexao)
    conexao.commit()
