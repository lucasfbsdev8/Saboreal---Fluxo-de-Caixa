from flask import jsonify, request

FORMAS_VENDA = ('Dinheiro', 'PIX', 'Crédito', 'Débito')
FORMAS_SAIDA = ('Dinheiro', 'PIX', 'Cartão')
CATEGORIAS_SAIDA = (
    'Despesa com produtos (insumos)',
    'Despesas administrativas',
    'Despesas operacionais',
)
# As 5 categorias oficiais da loja (devem ser iguais às do CHECK em banco/schema.sql).
CATEGORIAS_PRODUTO = ('Biscoitos', 'Doces', 'Bolos', 'Salgados', 'Bebidas')


class ErroNegocio(Exception):
    """Erro esperado (validação / regra de negócio). Vira resposta JSON."""

    def __init__(self, mensagem, status=400):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.status = status


def erro(mensagem, status=400):
    return jsonify({'sucesso': False, 'erro': mensagem}), status


def dados_json():
    """Corpo JSON como dict (nunca None)."""
    dados = request.get_json(silent=True)
    return dados if isinstance(dados, dict) else {}


def inteiro(valor, padrao=None):
    """Converte para int; devolve `padrao` se não for um inteiro válido."""
    if isinstance(valor, bool):
        return padrao
    try:
        if isinstance(valor, float) and not valor.is_integer():
            return padrao
        return int(valor)
    except (TypeError, ValueError):
        return padrao
