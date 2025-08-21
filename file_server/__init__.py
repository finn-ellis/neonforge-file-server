import json
import os
import threading
import time
import random
import string
from datetime import datetime
from typing import Any, Dict, Optional, List

from flask import current_app, Blueprint, request
from flask_cors import CORS
from .fileserver_types import Metadata

class EmailJob:
    def __init__(self, job_id: str, email: str, filename: str, file_path: str, requested_by: Optional[str], options: Optional[Dict[str, Any]]):
        self.id = job_id
        self.email = email
        self.filename = filename
        self.file_path = file_path
        self.timestamp = datetime.utcnow().isoformat()
        self.status = "pending"
        self.retryCount = 0
        self.fileSize = os.path.getsize(file_path) if os.path.exists(file_path) else 0
        self.originalName = filename
        self.requestedBy = requested_by
        self.options = options or {}

    def to_dict(self):
        return self.__dict__


class FileServer:
    """Flask extension providing file upload & email queue endpoints.

    Usage:
        from FileServer import FileServer
        fs = FileServer()
        fs.init_app(app, url_prefix="/api")
    """

    def __init__(self, app=None):
        self._app = None
        self._bp: Optional[Blueprint] = None
        self._socketio = None
        self._origin_aliases: Dict[str, str] = {}
        self._alias_lock = threading.Lock()
        self._next_alias_index = 1
        self._queue_lock = threading.Lock()
        if app is not None:
            self.init_app(app)

    # --------------- Internal helpers --------------- #
    def _get_config(self, key: str, default: Any) -> Any:
        # _app is set in init_app before any lookups; guard for type checkers
        if self._app is None:  # pragma: no cover - defensive
            return default
        return self._app.config.get(key, default)

    def _ensure_dirs(self):
        for key, dflt in [
            ("FILESERVER_UPLOADS_DIR", "uploads"),
            ("FILESERVER_METADATA_DIR", "metadata"),
            ("FILESERVER_DATA_DIR", "data"),
        ]:
            path = self._get_config(key, dflt)
            os.makedirs(path, exist_ok=True)

    # Origin alias management
    def _get_or_create_alias(self, ip: str) -> str:
        with self._alias_lock:
            alias = self._origin_aliases.get(ip)
            if not alias:
                alias = f"H{self._next_alias_index}"
                self._origin_aliases[ip] = alias
                self._next_alias_index += 1
                current_app.logger.info(f"New headset registered: {ip} -> {alias}")
            return alias

    # Email queue file path
    def _queue_file(self) -> str:
        data_dir = self._get_config("FILESERVER_DATA_DIR", "data")
        return os.path.join(data_dir, "email_queue.json")

    def _load_queue(self) -> List[Dict[str, Any]]:
        path = self._queue_file()
        if not os.path.exists(path):
            return []
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _save_queue(self, queue: List[Dict[str, Any]]):
        path = self._queue_file()
        tmp = path + ".tmp"
        with self._queue_lock:
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(queue, f, indent=2)
            os.replace(tmp, path)

    # Metadata helpers
    def _metadata_dir(self) -> str:
        return self._get_config("FILESERVER_METADATA_DIR", "metadata")

    def _uploads_dir(self) -> str:
        return self._get_config("FILESERVER_UPLOADS_DIR", "uploads")

    def _metadata_path(self, filename: str) -> str:
        return os.path.join(self._metadata_dir(), f"{filename}.json")

    def _save_metadata(self, metadata: Metadata):
        path = self._metadata_path(metadata["filename"])
        with open(path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2, default=str)

    def _load_metadata(self, filename: str) -> Optional[Metadata]:
        path = self._metadata_path(filename)
        if not os.path.exists(path):
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None

    def _load_all_metadata(self) -> List[Metadata]:
        md_dir = self._metadata_dir()
        results: List[Metadata] = []
        if not os.path.exists(md_dir):
            return results
        for name in os.listdir(md_dir):
            if name.endswith('.json'):
                meta = self._load_metadata(name[:-5])
                if meta:
                    if os.path.exists(os.path.join(self._uploads_dir(), meta["filename"])):
                        results.append(meta)
                    else:
                        # clean orphan
                        try:
                            os.remove(os.path.join(md_dir, name))
                        except OSError:
                            pass
        return results

    def _generate_filename(self, original_name: str, fieldname: str, ip: str) -> str:
        alias = self._get_or_create_alias(ip)
        unique_suffix = f"{int(time.time()*1000)}-{random.randint(0, 1_000_000_000)}"
        _, ext = os.path.splitext(original_name)
        return f"{alias}_{fieldname}-{unique_suffix}{ext}"

    def _client_ip(self) -> str:
        forwarded = request.headers.get('X-Forwarded-For', '')
        if forwarded:
            return forwarded.split(',')[0].strip()
        return request.remote_addr or 'unknown'

    # --------------- Public API --------------- #
    def init_app(self, app, url_prefix: str = "/api/files", socketio=None):
        self._app = app
        self._socketio = socketio
        # Config defaults (only set if absent)
        app.config.setdefault("FILESERVER_CORS_ORIGINS", "*")
        app.config.setdefault("FILESERVER_CORS_SUPPORTS_CREDENTIALS", False)
        self._ensure_dirs()
        # init queue file if not exists
        if not os.path.exists(self._queue_file()):
            self._save_queue([])
        # Derive CORS origins list
        origins_raw = app.config.get("FILESERVER_CORS_ORIGINS", "*")
        if isinstance(origins_raw, str):
            origins_list = [o.strip() for o in origins_raw.split(",") if o.strip()]
        else:
            origins_list = origins_raw or ["*"]

        cors_resources = {
            f"{url_prefix}/*": {"origins": origins_list},
            "/socket.io/*": {"origins": origins_list},
        }
        CORS(
            app,
            resources=cors_resources,
            supports_credentials=app.config.get("FILESERVER_CORS_SUPPORTS_CREDENTIALS", False),
        )
        if socketio and getattr(socketio, "cors_allowed_origins", None) in (None, "*"):
            socketio.cors_allowed_origins = origins_list

        from .routes import create_blueprint  # local import
        bp = create_blueprint(self, url_prefix)
        app.register_blueprint(bp, url_prefix=url_prefix)
        self._bp = bp

        if self._socketio:
            @self._socketio.on('connect')
            def handle_connect():
                if self._socketio:
                    data = self._get_all_files_and_origins(url_prefix)
                    self._socketio.emit('files_updated', data)

            @self._socketio.on('get_files')
            def handle_get_files(data):
                if self._socketio:
                    origin = data.get('origin') if data else None
                    files_data = self._get_all_files_and_origins(url_prefix)
                    if origin and origin != 'all':
                        files_data['files'] = [f for f in files_data['files'] if f['origin'] == origin]
                        files_data['totalFiles'] = len(files_data['files'])
                    self._socketio.emit('files_updated', files_data)

    def _get_all_files_and_origins(self, url_prefix: str) -> dict:
        all_meta = self._load_all_metadata()
        all_meta.sort(key=lambda m: m.get("uploadDate", ""), reverse=True)
        files = [
            {
                "name": m["filename"],
                "originalName": m.get("originalName"),
                "size": m.get("size"),
                "uploadDate": m.get("uploadDate"),
                "origin": m.get("originAlias"),
                "path": f"{url_prefix}/{m['filename']}",
            }
            for m in all_meta
        ]
        available_origins = sorted(
            list(set(m.get("originAlias") for m in all_meta if m.get("originAlias")))
        )
        return {
            "files": files,
            "totalFiles": len(files),
            "availableOrigins": available_origins,
        }

    # Additional helper methods that might be useful externally
    def get_queue_file_path(self) -> Optional[str]:
        return self._queue_file() if self._app else None

    def get_pending_jobs(self) -> List[Dict[str, Any]]:
        return [j for j in self._load_queue() if j.get('status') == 'pending']

    def update_job_status(self, job_id: str, status: str, retry_count: Optional[int] = None) -> bool:
        queue = self._load_queue()
        changed = False
        for j in queue:
            if j['id'] == job_id:
                j['status'] = status
                if retry_count is not None:
                    j['retryCount'] = retry_count
                changed = True
                break
        if changed:
            self._save_queue(queue)
        return changed

    def cleanup_old_jobs(self, older_than_hours: int = 24) -> int:
        cutoff = time.time() - older_than_hours * 3600
        queue = self._load_queue()
        filtered = [j for j in queue if self._parse_iso(j['timestamp']) > cutoff]
        removed = len(queue) - len(filtered)
        if removed:
            self._save_queue(filtered)
        return removed

    @staticmethod
    def _parse_iso(ts: str) -> float:
        try:
            return datetime.fromisoformat(ts).timestamp()
        except Exception:
            return 0.0

    # helper used by routes for encapsulation
    def _create_email_job(self, job_id: str, email: str, filename: str, file_path: str, ip: str, options: Optional[Dict[str, Any]]):
        metadata = self._load_metadata(filename)
        job = EmailJob(job_id, email, filename, file_path, ip, options)
        return job.to_dict()

__all__ = ["FileServer", "EmailJob"]
