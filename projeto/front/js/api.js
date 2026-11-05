/* api.js - sessão (token) e chamadas ao backend. Depende de utils.js (toast). */

const API_BASE = '/api';   // o Flask serve front e API na mesma origem

const Sessao = {
    token: () => localStorage.getItem('token'),
    usuario: () => localStorage.getItem('usuario') || '',
    cargo: () => localStorage.getItem('cargo') || '',
    logado: () => !!localStorage.getItem('token'),
    salvar(res) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('usuario', res.usuario);
        localStorage.setItem('cargo', res.cargo);
    },
    limpar() {
        ['token', 'usuario', 'cargo'].forEach(k => localStorage.removeItem(k));
    },
};

function exigirLogin() {
    if (Sessao.logado()) return true;
    location.replace('login.html');
    return false;
}

/* Devolve o JSON da resposta, ou null em caso de erro (o aviso já é exibido aqui).
   opcoes.semRedirecionar: não volta ao login num 401 (usado pela própria tela de login). */
async function apiRequest(endpoint, metodo = 'GET', dados = null, opcoes = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (Sessao.token()) headers.Authorization = `Bearer ${Sessao.token()}`;

    let resposta;
    try {
        resposta = await fetch(API_BASE + endpoint, {
            method: metodo,
            headers,
            body: dados ? JSON.stringify(dados) : undefined,
        });
    } catch {
        toast('Sem conexão com o servidor. Verifique se o sistema está ligado.', 'erro');
        return null;
    }

    let corpo = null;
    try { corpo = await resposta.json(); } catch { /* resposta sem JSON */ }

    if (resposta.status === 401 && !opcoes.semRedirecionar) {
        Sessao.limpar();
        location.replace('login.html');
        return null;
    }
    if (!resposta.ok) {
        toast((corpo && (corpo.erro || corpo.mensagem)) || 'Não foi possível concluir a operação.', 'erro');
        return null;
    }
    return corpo;
}
