from flask import Blueprint, g, jsonify
from werkzeug.security import check_password_hash

from auth import exige_gerente
from db import get_db
from seed import restaurar_fabrica
from utils import ErroNegocio, dados_json

bp = Blueprint('admin', __name__)


@bp.post('/admin/restaurar-fabrica')
@exige_gerente
def restaurar():
    """Entrega em modo limpo: apaga o movimento e recria os produtos iniciais. Exige a senha do gerente."""
    db = get_db()
    usuario = db.execute('SELECT senha_hash FROM usuarios WHERE id = ?', (g.usuario['id'],)).fetchone()
    if not usuario or not check_password_hash(usuario['senha_hash'], str(dados_json().get('senha') or '')):
        raise ErroNegocio('Senha incorreta.', 403)

    restaurar_fabrica(db)
    return jsonify({'sucesso': True, 'mensagem': 'Sistema restaurado: produtos iniciais e estoque de partida.'})
