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

    $('valor-inicial').focus();
    $('form-implantacao').addEventListener('submit', async e => {
        e.preventDefault();
        const valor = lerCentavos($('valor-inicial'));
        const confirmado = await confirmar(
            `Registrar ${formatarMoeda(valor)} como o dinheiro que havia no caixa?\nEsse valor não poderá ser alterado depois.`,
            { textoOk: 'Confirmar' }
        );
        if (!confirmado) return;

        const botao = e.target.querySelector('button[type="submit"]');
        botao.disabled = true;
        const r = await apiRequest('/implantacao', 'POST', { valor_inicial: valor, observacao: $('obs-implantacao').value });
        if (r?.sucesso) {
            toast('Saldo inicial registrado! Bom trabalho.', 'sucesso');
            setTimeout(() => { location.href = 'inicio.html'; }, 900);
        } else {
            botao.disabled = false;
        }
    });
}

if (exigirLogin()) iniciar();