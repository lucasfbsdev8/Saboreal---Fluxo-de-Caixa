const $ = id => document.getElementById(id);

async function iniciar() {
    const res = await apiRequest('/implantacao');
    if (!res) return;
    if (res.implantado) return location.replace('inicio.html');   // já informado: nada a fazer aqui

    if (Sessao.cargo() !== 'GERENTE') {                            // só o gerente registra o saldo inicial
        $('form-implantacao').hidden = true;
        $('aviso-sem-permissao').hidden = false;
        $('btn-sair-implantacao').addEventListener('click', () => { Sessao.limpar(); location.href = 'login.html'; });
        return;
    }

    $('saldo-caixa').focus();
    $('form-implantacao').addEventListener('submit', async e => {
        e.preventDefault();
        const saldoCaixa = lerCentavos($('saldo-caixa'));
        const saldoBanco = lerCentavos($('saldo-banco'));
        const confirmado = await confirmar(
            `Registrar estes saldos iniciais?\n\nEm caixa (dinheiro): ${formatarMoeda(saldoCaixa)}\nEm banco (PIX/conta): ${formatarMoeda(saldoBanco)}\n\nEsses valores não poderão ser alterados depois.`,
            { textoOk: 'Confirmar' }
        );
        if (!confirmado) return;

        const botao = e.target.querySelector('button[type="submit"]');
        botao.disabled = true;
        const r = await apiRequest('/implantacao', 'POST', { saldo_caixa: saldoCaixa, saldo_banco: saldoBanco, observacao: $('obs-implantacao').value });
        if (r?.sucesso) {
            toast('Saldos iniciais registrados! Bom trabalho.', 'sucesso');
            setTimeout(() => { location.href = 'inicio.html'; }, 900);
        } else {
            botao.disabled = false;
        }
    });
}

if (exigirLogin()) iniciar();