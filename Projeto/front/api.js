// Detecta se está a correr no GitHub Codespaces ou localmente
const HOSTNAME = window.location.hostname;
const API_BASE_URL = HOSTNAME.includes('github.dev') || HOSTNAME.includes('app.github.dev')
    ? `https://${HOSTNAME.replace(/-[0-9]+\.app\.github\.dev/, '-5000.app.github.dev')}/api`
    : 'http://127.0.0.1:5000/api';

async function apiRequest(endpoint, method = 'GET', data = null) {
    const config = {
        method: method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (data) config.body = JSON.stringify(data);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.mensagem || result.erro || 'Erro na requisição');
        }
        return result;
    } catch (error) {
        console.error('Erro na API:', error);
        alert('Erro ao conectar com o servidor: ' + error.message);
        return null;
    }
}