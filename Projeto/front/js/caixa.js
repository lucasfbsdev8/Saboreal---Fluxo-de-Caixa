const $ = id => document.getElementById(id);

function concluir(mensagem) {
    toast(mensagem, 'sucesso');
    setTimeout(() => { location.href = 'inicio.html'; }, 900);
}

/* Roda o envio com o botão travado (evita clique duplo). Só destrava se falhar. */
async function enviar(form, acao) {
    const botao = form.querySelector('button[type="submit"]');
    botao.disabled = true;
    const ok = await acao();
    if (!ok) botao.disabled = false;
}

function iniciarAbrir(status) {
    // O caixa abre com o dinheiro que já existe: último fechamento (ou saldo informado na implantação).
    $('lbl-saldo-abertura').textContent = formatarMoeda(status.ultimo_valor_fechamento || 0);

    $('form-abrir').addEventListener('submit', e => {
        e.preventDefault();
        enviar(e.target, async () => {
            const res = await apiRequest('/caixa/abrir', 'POST', {});
            if (res?.sucesso) concluir('Caixa aberto com sucesso!');
            return !!res?.sucesso;
        });
    });
}
function iniciarFechar(status) {
    const esperado = status.gaveta_esperada;
    $('lbl-fechar-abertura').textContent = formatarMoeda(status.valor_abertura);
    $('lbl-fechar-vendas').textContent = `+ ${formatarMoeda(status.vendas_dinheiro)}`;
    $('lbl-fechar-saidas').textContent = `- ${formatarMoeda(status.saidas_dinheiro)}`;
    $('lbl-fechar-esperado').textContent = formatarMoeda(esperado);
    $('lbl-fechar-banco').textContent = formatarMoeda(status.saldo_banco);

    const campo = $('fechar-valor');
    const badge = $('lbl-divergencia');
    const atualizarDivergencia = () => {
        const dif = lerCentavos(campo) - esperado;
        badge.hidden = false;
        if (dif === 0) {
            badge.className = 'divergencia-badge div-ok';
            badge.innerHTML = `${icone('ok')} Caixa sem divergência`;
        } else if (dif < 0) {
            badge.className = 'divergencia-badge div-falta';
            badge.innerHTML = `${icone('alerta')} Quebra de caixa (falta): ${formatarMoeda(-dif)}`;
        } else {
            badge.className = 'divergencia-badge div-sobra';
            badge.innerHTML = `${icone('info')} Sobra de caixa: ${formatarMoeda(dif)}`;
        }
    };
    campo.addEventListener('input', atualizarDivergencia);
    definirMoeda(campo, esperado);   // sugere o valor esperado
    atualizarDivergencia();

    $('form-fechar').addEventListener('submit', e => {
        e.preventDefault();
        enviar(e.target, async () => {
            const dif = lerCentavos(campo) - esperado;
            const aviso = dif === 0
                ? 'Fechar o caixa agora?'
                : `Há ${dif < 0 ? 'quebra' : 'sobra'} de ${formatarMoeda(Math.abs(dif))}. Fechar o caixa mesmo assim?`;
            if (!(await confirmar(aviso, { textoOk: 'Fechar caixa' }))) return false;

            const res = await apiRequest('/caixa/fechar', 'POST', {
                valor_fechamento: lerCentavos(campo),
                observacao: $('fechar-obs').value,
            });
            if (res?.sucesso) concluir('Caixa fechado com sucesso!');
            return !!res?.sucesso;
        });
    });
}

function iniciarSaida(status) {
    $('lbl-saldo-saida').textContent = formatarMoeda(status.gaveta_esperada);
    $('form-saida').addEventListener('submit', e => {
        e.preventDefault();
        enviar(e.target, async () => {
            const valor = lerCentavos($('saida-valor'));
            if (valor <= 0) { toast('Informe um valor maior que zero.', 'aviso'); return false; }
            const res = await apiRequest('/movimentacoes', 'POST', {
                categoria: $('saida-categoria').value,
                descricao: $('saida-descricao').value,
                valor,
                forma_pagamento: $('saida-forma').value,
            });
            if (res?.sucesso) concluir('Saída registrada com sucesso!');
            return !!res?.sucesso;
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const status = await obterStatusCaixa();
    const aba = new URLSearchParams(location.search).get('aba') || (status.aberto ? 'fechar' : 'abrir');

    if (aba === 'abrir' && status.aberto) {
        toast('O caixa já está aberto.', 'aviso');
        return setTimeout(() => location.replace('inicio.html'), 1000);
    }
    if (aba === 'fechar' && !status.aberto) {
        toast('Não há caixa aberto para fechar.', 'aviso');
        return setTimeout(() => location.replace('inicio.html'), 1000);
    }
    if (aba === 'saida' && !status.aberto) return;   // layout.js avisa e redireciona

    const titulos = { abrir: 'Abrir caixa', fechar: 'Fechar caixa', saida: 'Registrar saída' };
    if (!titulos[aba]) return location.replace('inicio.html');
    $('titulo-pagina').textContent = titulos[aba];
    $(`secao-${aba}`).hidden = false;

    ({ abrir: iniciarAbrir, fechar: iniciarFechar, saida: iniciarSaida })[aba](status);
});
