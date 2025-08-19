import atexit
import threading
from flask import Flask
from flask_socketio import SocketIO
from file_server import FileServer
# from file_server.config import Config
from file_server.service_announcer import ServiceAnnouncer

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
    # --- Zeroconf Service Announcement ---
    SERVICE_TYPE = "_file-server._tcp.local."
    SERVICE_NAME = "NF"
    SERVER_PORT = 5000 # Default Flask port

    announcer = ServiceAnnouncer(SERVICE_TYPE, SERVICE_NAME, SERVER_PORT)

    # Run the service announcer in a background thread
    announcer_thread = threading.Thread(target=announcer.start, daemon=True)
    announcer_thread.start()

    # Register the stop function to be called on exit
    atexit.register(announcer.stop)

    # Run the Flask app (make sure to specify the host and port)
    # Using '0.0.0.0' makes the server accessible on your local network
    socketio.run(app, host='0.0.0.0', port=SERVER_PORT, debug=True, use_reloader=False)
