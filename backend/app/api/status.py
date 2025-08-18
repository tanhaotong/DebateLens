from flask import Blueprint

status_bp = Blueprint('status', __name__)

@status_bp.route('/api/status/test', methods=['GET'])
def test():
    return "status ok"
