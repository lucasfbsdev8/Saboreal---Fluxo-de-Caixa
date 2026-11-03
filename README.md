# Saboreal - Sistema de gestão (fluxo de caixa)

Sistema de caixa, vendas, estoque e relatórios para a Saboreal Biscoitos Caseiros.
Back-end em **Flask + SQLite**; front-end em **HTML/CSS/JS puro**, servido pelo próprio Flask.

## Como rodar

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows   (Linux/Mac: source .venv/bin/activate)
pip install -r requirements.txt
python back/app.py
```

Abra **http://127.0.0.1:5000** no navegador.

- Usuário inicial: `admin` / senha `1234` (**troque antes de entregar ao cliente**, veja abaixo).
- O banco (`banco/saboreal.db`) e a chave de sessão (`banco/.secret_key`) são criados sozinhos na primeira execução, **já com os 39 produtos iniciais** e o estoque de partida. Os dados **não são apagados** ao reiniciar o servidor.
- Se você tinha um `saboreal.db` de uma versão anterior, apague-o antes (o formato mudou). O sistema avisa se encontrar um antigo.

### Implantação e entrega ao cliente (modo limpo)

O sistema possui um fluxo dedicado de **Implantação** e restauração de fábrica.

- **Pela interface (Implantação):** Ao acessar o sistema em modo de implantação/entrega, acesse a página de Implantação (`implantacao.html`) e execute o procedimento de limpeza e reinicialização dos dados do cliente.
- **Pela tela de Relatórios:** Usuários gerentes podem acionar a restauração para uso real informando a senha de confirmação.
- **Pelo terminal:** `python back/app.py --restaurar-fabrica` (pede a confirmação digitando `RESTAURAR`).

Ao restaurar o sistema, as vendas, saídas, movimentações de caixa e produtos são redefinidos e recria-se o catálogo dos 39 produtos iniciais com o estoque de partida (mantendo as contas de usuário).

Estoque de partida (por produto): Biscoitos 50 · Doces 20 · Bolos 8 · Salgados 25 · Bebidas 15.
A lista de produtos e preços está em `back/seed.py`.

### Trocar a senha do admin

```bash
python -c "from werkzeug.security import generate_password_hash as g; import sqlite3; c=sqlite3.connect('banco/saboreal.db'); c.execute('UPDATE usuarios SET senha_hash=? WHERE usuario=?',(g('NOVA_SENHA'),'admin')); c.commit()"
```

### Variáveis de ambiente (opcionais)

| Variável | Padrão | Para quê |
|---|---|---|
| `SABOREAL_HOST` | `127.0.0.1` | Use `0.0.0.0` só se outros computadores da rede precisarem acessar |
| `SABOREAL_PORT` | `5000` | Porta |
| `SABOREAL_DEBUG` | desligado | `1` liga o modo debug (apenas em desenvolvimento) |
| `SABOREAL_DB` | `banco/saboreal.db` | Caminho do banco |
| `SABOREAL_SECRET` | arquivo `.secret_key` | Chave para assinar as sessões |

## Estrutura

```
Saboreal/
├── back/
│   ├── app.py              # cria o app, registra as rotas, serve o front
│   ├── db.py               # conexão por requisição, criação do banco
│   ├── auth.py             # token de sessão e proteção das rotas
│   ├── utils.py            # constantes, validações e erros padronizados
│   ├── saldos.py           # regras e cálculos de saldos do caixa
│   ├── seed.py             # os 39 produtos iniciais e a restauração de fábrica
│   └── routes/             # autenticacao, produtos, caixa, vendas, relatorios, admin, implantacao
├── banco/
│   └── schema.sql          # tabelas (valores em centavos)
└── front/
    ├── *.html              # login, inicio, caixa, vendas, cadastro, estoque, relatorios, implantacao
    ├── css/style.css       # único CSS
    ├── js/                 # utils, api, layout (compartilhados) + um .js por página (implantacao.js, etc.)
    └── imagens/
```

## Regras importantes

- **Caixa aberto para operar:** nova venda, nova saída, estoque e cadastro/edição/exclusão de produtos só funcionam com o caixa aberto. Isso é validado no **servidor** (e a interface bloqueia o menu).
- **Um caixa por vez** (garantido pelo próprio banco). No fechamento, o sistema compara o valor contado com o esperado (abertura + vendas em dinheiro − saídas em dinheiro) e registra a **quebra** ou a **sobra**.
- **5 categorias oficiais:** Biscoitos, Doces, Bolos, Salgados e Bebidas (validadas no servidor e no banco).
- **Cadastro simples:** código (sequencial automático), nome, categoria e preço de venda. Não há custo por item.
- **"Excluir" produto inativa** o item: o histórico de vendas é preservado.
- **Estoque:** a venda dá baixa automática e é bloqueada se o estoque for insuficiente. PDV e estoque têm busca e filtro por categoria.
- **Preço e total da venda são calculados no servidor**; o navegador só envia código e quantidade.
- **Dinheiro em centavos** (inteiros) no banco e na API; o front formata para R$.

## Relatórios

- **Fluxo de caixa:** escolha mês e ano; uma coluna por dia. Entradas por forma de pagamento (dinheiro, PIX, crédito, débito), saídas por categoria, saldo operacional (entradas − saídas), saldo inicial (saldo final do dia anterior; R$ 0,00 no primeiro dia com movimento) e saldo final. Reforço de caixa e quebra/sobra não entram no fluxo.
- **Histórico de vendas** e **Mais vendidos**, com filtro por período.