from flask import Flask
from flask_socketio import SocketIO
from file_server import FileServer
# from file_server.config import Config

socketio = SocketIO(cors_allowed_origins="*")
file_server = FileServer()

def create_app():
    app = Flask(__name__, instance_relative_config=True)
    # app.config.from_object(Config)
    app.config.from_pyfile('config.py', silent=True)

    file_server.init_app(app, url_prefix="/api/files", socketio=socketio)
    socketio.init_app(app)
    return app

app = create_app()

if __name__ == "__main__":
    socketio.run(app, debug=True)
