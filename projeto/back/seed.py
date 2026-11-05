"""Produtos iniciais da loja (lista manuscrita do cliente) e restauração de fábrica."""

# Estoque de partida: cada produto da categoria começa com esta quantidade.
ESTOQUE_INICIAL = {'Biscoitos': 50, 'Doces': 20, 'Bolos': 8, 'Salgados': 25, 'Bebidas': 15}

# (categoria, nome, preço em centavos). Os códigos 01..39 seguem esta ordem.
PRODUTOS_INICIAIS = [
    ('Biscoitos', 'Pão de queijo', 200),
    ('Biscoitos', 'Pão de sal', 100),
    ('Biscoitos', 'Pão sovado', 1300),
    ('Biscoitos', 'Broa de fubá', 200),
    ('Biscoitos', 'Biscoito de queijo', 200),
    ('Biscoitos', 'Torrada (pacote)', 1250),

    ('Doces', 'Pudim (roda)', 1000),
    ('Doces', 'Sonho', 250),
    ('Doces', 'Rosca', 200),

    ('Bolos', 'Fatia de bolo', 250),
    ('Bolos', 'Roda de bolo', 1200),

    ('Salgados', 'Salgados fritos', 900),
    ('Salgados', 'Salgados assados', 800),

    ('Bebidas', 'Café preto', 200),
    ('Bebidas', 'Café com leite', 250),
    ('Bebidas', 'Achocolatado 200ml', 175),
    ('Bebidas', 'Leite 1L', 650),
    ('Bebidas', 'Água mineral', 300),
    ('Bebidas', 'Refrigerante lata', 500),
    ('Bebidas', 'Suco lata', 500),
    ('Bebidas', 'Refrigerante 1L', 800),
    ('Bebidas', 'Refrigerante 2L', 1200),
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
