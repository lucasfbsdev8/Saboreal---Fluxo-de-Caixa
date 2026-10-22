document.addEventListener('DOMContentLoaded', async () => {
    carregarSelectProdutos();

    document.getElementById('form-estoque')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const codigo = document.getElementById('select-produto-estoque').value;
        const tipo = document.getElementById('select-tipo-mov').value;
        const qtdDig = parseInt(document.getElementById('inp-qtd-estoque').value) || 0;

        if (!codigo) {
            alert('Selecione um produto!');
            return;
        }

        if (qtdDig <= 0) {
            alert('Informe uma quantidade maior que zero!');
            return;
        }

        const qtdFinal = tipo === 'ENTRADA' ? qtdDig : -qtdDig;

        const res = await apiRequest('/produtos/estoque', 'POST', {
            codigo: codigo,
            quantidade: qtdFinal
        });

        if (res && res.sucesso) {
            alert(`✅ Estoque atualizado com sucesso! Novo saldo: ${res.novo_estoque} un.`);
            document.getElementById('inp-qtd-estoque').value = '';
            
            setTimeout(() => {
                const desejaMais = confirm('Deseja realizar mais movimentações de estoque?');
                if (desejaMais) {
                    carregarSelectProdutos();
                } else {
                    window.location.href = 'inicio.html';
                }
            }, 50);
        }
    });
});

async function carregarSelectProdutos() {
    const res = await apiRequest('/produtos');
    let produtos = [];

    if (res && res.produtos && Array.isArray(res.produtos)) {
        produtos = res.produtos;
    } else if (Array.isArray(res)) {
        produtos = res;
    }

    const select = document.getElementById('select-produto-estoque');
    if (!select) return;

    select.innerHTML = '<option value="">-- Selecione o Produto --</option>';
    produtos.forEach(p => {
        select.innerHTML += `<option value="${p.codigo}">[${p.codigo}] ${p.nome} (Atual: ${p.estoque} un.)</option>`;
    });
}