# Saboreal - Sistema de gestão (fluxo de caixa)

Sistema de caixa, vendas, estoque e relatórios para a Saboreal Biscoitos Caseiros.
Back-end em **Flask + SQLite**; front-end em **HTML/CSS/JS puro**, servido pelo próprio Flask.

## Como rodar

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows   (Linux/Mac: source .venv/bin/activate)
pip install -r projeto/requirements.txt
python projeto/back/app.py
```

Abra **http://127.0.0.1:5000** no navegador.

- Usuário inicial: `admin` / senha `1234` (**troque antes de entregar ao cliente**, veja abaixo).
- O banco (`banco/saboreal.db`) e a chave de sessão (`banco/.secret_key`) são criados sozinhos na primeira execução, **já com os 39 produtos iniciais** e o estoque de partida. Os dados **não são apagados** ao reiniciar o servidor. Esses dois arquivos não vão para o GitHub.
- Se o sistema avisar que o banco está em **formato antigo**, apague o `banco/saboreal.db` e rode de novo. A implantação do formato anterior (um único saldo) é atualizada automaticamente.

### Primeiro acesso (saldos iniciais)

No primeiro login do gerente, o sistema abre a tela `implantacao.html` e pede os saldos que a empresa tinha antes de passar a usar o sistema:

- **Saldo Inicial em Caixa (R$):** o dinheiro em espécie na gaveta;
- **Saldo Inicial em Banco (R$):** o saldo na conta (PIX/cartões).

Os dois valores são registrados **uma única vez** (não podem ser alterados) e são o ponto de partida do sistema: o saldo em caixa é o dinheiro com que o primeiro caixa abre, e ambos entram no fluxo de caixa. Enquanto não forem informados, as demais telas ficam bloqueadas, e só o gerente consegue registrá-los.

### Reiniciar o banco / entregar ao cliente (modo limpo)

Depois de testar, deixe o sistema pronto para uso real. A restauração apaga vendas, saídas, caixas, produtos e os saldos iniciais informados, e recria os 39 produtos iniciais com o estoque de partida (os usuários e a senha são mantidos). No próximo login, o gerente informa os saldos iniciais reais. Três formas:

- **Pela tela:** entre como gerente, vá em **Relatórios** e use **Restaurar sistema para uso real** (pede a senha).
- **Pelo terminal:** `python back/app.py --restaurar-fabrica` (pede para digitar `RESTAURAR`).
- **Apagando o arquivo do banco** (zera também os usuários; a senha do admin volta a `1234`): pare o servidor, apague `banco/saboreal.db` (`Remove-Item banco\saboreal.db` no PowerShell; `rm banco/saboreal.db` no Linux/Mac) e inicie de novo. O banco é recriado do zero.

Não há como desfazer: se quiser guardar uma cópia dos dados, copie o arquivo do banco antes.

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
│   ├── db.py               # conexão por requisição, criação e migração do banco
│   ├── auth.py             # token de sessão e proteção das rotas
│   ├── utils.py            # constantes, validações e erros padronizados
│   ├── saldos.py           # regra única dos saldos (tela inicial e relatório)
│   ├── seed.py             # os 39 produtos iniciais e a restauração de fábrica
│   └── routes/             # autenticacao, implantacao, produtos, caixa, vendas, relatorios, admin
├── banco/
│   └── schema.sql          # tabelas (valores em centavos)
└── front/
    ├── *.html              # login, implantacao, inicio, caixa, vendas, cadastro, estoque, relatorios
    ├── css/style.css       # único CSS
    ├── js/                 # utils, api, layout (compartilhados) + um .js por página
    └── imagens/
```

## Regras importantes

- **Caixa aberto para operar:** nova venda, nova saída, estoque e cadastro/edição/exclusão de produtos só funcionam com o caixa aberto. Isso é validado no **servidor** (e a interface bloqueia o menu).
- **Abertura de caixa direta:** o caixa abre com um clique, com o dinheiro que já existe: o valor contado no último fechamento (ou, na primeira vez, o saldo em caixa informado no primeiro acesso). Não há reforço nem observação na abertura.
- **Um caixa por vez** (garantido pelo próprio banco). No fechamento, o sistema compara o valor contado com o esperado (abertura + vendas em dinheiro − saídas em dinheiro) e registra a **quebra** ou a **sobra**.
- **5 categorias oficiais:** Biscoitos, Doces, Bolos, Salgados e Bebidas (validadas no servidor e no banco).
- **Cadastro simples:** código (sequencial automático), nome, categoria e preço de venda. Não há custo por item.
- **"Excluir" produto inativa** o item: o histórico de vendas é preservado.
- **Estoque:** a venda dá baixa automática e é bloqueada se o estoque for insuficiente. PDV e estoque têm busca e filtro por categoria.
- **Preço e total da venda são calculados no servidor**; o navegador só envia código e quantidade.
- **Dinheiro em centavos** (inteiros) no banco e na API; o front formata para R$.

## Relatórios e saldos

- **Fluxo de caixa:** escolha mês e ano; uma coluna por dia. Entradas por forma de pagamento (dinheiro, PIX, crédito, débito), saídas por categoria e saldo operacional (entradas − saídas). Os saldos são separados em **caixa (dinheiro)** e **banco (PIX e cartões)**, e o saldo final é a soma dos dois. O saldo inicial é o informado no primeiro acesso mais o que já entrou e saiu antes; cada dia começa com o saldo final do dia anterior. Dias futuros ou anteriores à implantação aparecem como "-". Quebra e sobra de caixa não entram no fluxo.
- **Histórico de movimentações:** entradas (vendas) e saídas na mesma lista, da mais recente para a mais antiga, com tipo, data e hora, descrição (itens da venda ou categoria da saída), forma de pagamento e valor. Tem filtro por período e totais no rodapé.
- **Tela inicial e relatório usam a mesma regra de saldos** (`back/saldos.py`):
  - saldo em dinheiro = saldo inicial em caixa + vendas em dinheiro − saídas pagas em dinheiro;
  - saldo no banco = saldo inicial em banco + vendas por PIX/cartão − saídas pagas por PIX/cartão;
  - saldo total = saldo em dinheiro + saldo no banco.

## Problemas comuns

- **PowerShell: "a execução de scripts foi desabilitada neste sistema"** ao ativar o `.venv`: rode `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` e ative de novo.
- **"Banco em formato antigo detectado":** apague o `banco/saboreal.db` (o sistema o recria).
- **Porta 5000 em uso:** use outra porta. No PowerShell: `$env:SABOREAL_PORT=5001; python back/app.py`.
- **Não consegue apagar o `saboreal.db` ("em uso"):** pare o servidor antes.
- **Depois de atualizar o código, a tela não muda ou dá erro:** reinicie o servidor e recarregue a página com `Ctrl+F5`.