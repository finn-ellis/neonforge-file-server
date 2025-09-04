from __future__ import annotations

from typing import TYPE_CHECKING, Any, TypedDict
from flask import Blueprint, jsonify, request, current_app, send_from_directory
import os
import time
import random
import string
from datetime import datetime
from .fileserver_types import Metadata

if TYPE_CHECKING:  # pragma: no cover
    from . import FileServer

def create_blueprint(fs: "FileServer", url_prefix: str) -> Blueprint:
    """Create the FileServer blueprint with all HTTP routes.

    Parameters:
        fs: FileServer instance (for accessing helper methods & state)
        url_prefix: The URL prefix used when registering blueprint (for building file paths in responses)
    """
    bp = Blueprint("fileserver", __name__)

    @bp.get("/health")
    def health():
        return jsonify({
            "status": "OK",
            "message": "FileServer running",
            "timestamp": datetime.utcnow().isoformat(),
            "registeredOrigins": [
                {"ip": ip, "alias": alias} for ip, alias in fs._origin_aliases.items()  # noqa: SLF001
            ],
        })

    @bp.get("/all")
    def list_files():
        # This endpoint is retained for polling-based clients or for debugging,
        # but socket-based clients should use the 'get_files' event.
        origin = request.args.get("origin")
        files_data = fs._get_all_files_and_origins(url_prefix)  # noqa: SLF001
        if origin and origin != 'all':
            files_data['files'] = [f for f in files_data['files'] if f['origin'] == origin]
            files_data['totalFiles'] = len(files_data['files'])
        return jsonify(files_data)

    @bp.get("/origins")
    def origins():
        all_meta = fs._load_all_metadata()  # noqa: SLF001
        origins_list = sorted(
            [alias for alias in (m.get("originAlias") for m in all_meta) if isinstance(alias, str)]
        )
        origin_stats = []
        for alias in origins_list:
            files = [m for m in all_meta if m.get("originAlias") == alias]
            total_size = sum(m.get("size", 0) for m in files)
            uploads = [ud for ud in (m.get("uploadDate") for m in files) if isinstance(ud, str)]
            last_upload = max(uploads) if uploads else None
            origin_stats.append(
                {
                    "alias": alias,
                    "fileCount": len(files),
                    "totalSize": total_size,
                    "lastUpload": last_upload,
                }
            )
        return jsonify(
            {
                "origins": origin_stats,
                "registeredIPs": [
                    {"ip": ip, "alias": alias} for ip, alias in fs._origin_aliases.items()  # noqa: SLF001
                ],
            }
        )

    @bp.post("/upload")
    def upload_file():
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "Empty filename"}), 400
        ip = fs._client_ip()  # noqa: SLF001
        alias = fs._get_or_create_alias(ip)  # noqa: SLF001
        original_name = file.filename or "upload"
        filename = fs._generate_filename(original_name, "file", ip)  # noqa: SLF001
        uploads_dir = fs._uploads_dir()  # noqa: SLF001
        path = os.path.join(uploads_dir, filename)
        file.save(path)
        metadata: Metadata = {
            "filename": filename,
            "originalName": str(file.filename),
            "size": os.path.getsize(path),
            "uploadDate": datetime.utcnow().isoformat(),
            "origin": ip,
            "originAlias": alias,
            "clientIP": ip,
        }
        fs._save_metadata(metadata)  # noqa: SLF001
        current_app.logger.info(f"File uploaded from {alias} ({ip}): {file.filename}")

        if fs._socketio:
            fs._send_socket_update()

        return jsonify(
            {
                "message": "File uploaded successfully",
                "file": {
                    "name": filename,
                    "originalName": file.filename,
                    "size": metadata["size"],
                    "origin": alias,
                    "path": f"{url_prefix}/{filename}",
                },
            }
        )
    
    @bp.get("/<filename>")
    def get_file(filename: str):
        uploads_dir = fs._uploads_dir()  # noqa: SLF001
        if not os.path.exists(os.path.join(uploads_dir, filename)):
            return jsonify({"error": "File not found"}), 404
        return send_from_directory(uploads_dir, filename, as_attachment=False)

    @bp.delete("/<filename>")
    def delete_file(filename: str):
        uploads_dir = fs._uploads_dir()  # noqa: SLF001
        file_path = os.path.join(uploads_dir, filename)
        metadata_path = fs._metadata_path(filename)  # noqa: SLF001
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404
        try:
            os.remove(file_path)
            if os.path.exists(metadata_path):
                os.remove(metadata_path)
            current_app.logger.info(f"File deleted: {filename}")
            return jsonify({"message": "File deleted successfully"})
        except Exception:  # pragma: no cover - log + respond
            current_app.logger.exception("Delete error")
            return jsonify({"error": "Failed to delete file"}), 500

    @bp.post("/email/send")
    def queue_email():
        data = request.get_json(silent=True) or {}
        email = data.get("email")
        filename = data.get("filename")
        options = data.get("options")
        if not email or not filename:
            return jsonify({"error": "Email and filename are required"}), 400
        if "@" not in email:
            return jsonify({"error": "Invalid email format"}), 400
        uploads_dir = fs._uploads_dir()  # noqa: SLF001
        file_path = os.path.join(uploads_dir, filename)
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404
        ip = fs._client_ip()  # noqa: SLF001
        job_id = f"email_{int(time.time()*1000)}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=9))}"
        job = fs._create_email_job(job_id, email, filename, file_path, ip, options)  # internal helper
        queue = fs._load_queue()  # noqa: SLF001
        queue.append(job)
        fs._save_queue(queue)  # noqa: SLF001
        fs.use_recent_email(email)  # remove from recent emails
        current_app.logger.info(
            f"Email queued: {email} for file {filename} (Job ID: {job_id})"
        )
        return jsonify(
            {
                "message": "Email queued successfully",
                "jobId": job_id,
                "email": email,
                "filename": filename,
                "options": options,
            }
        )

    @bp.get("/email/status/<job_id>")
    def email_status(job_id: str):
        queue = fs._load_queue()  # noqa: SLF001
        job = next((j for j in queue if j["id"] == job_id), None)
        if not job:
            return jsonify({"error": "Job not found"}), 404
        return jsonify(
            {
                "id": job["id"],
                "email": job["email"],
                "filename": job["filename"],
                "status": job["status"],
                "timestamp": job["timestamp"],
                "retryCount": job.get("retryCount", 0),
            }
        )

    @bp.get("/email/queue")
    def email_queue():
        queue = fs._load_queue()  # noqa: SLF001
        total = len(queue)
        pending = len([j for j in queue if j["status"] == "pending"])
        sending = len([j for j in queue if j["status"] == "sending"])
        sent = len([j for j in queue if j["status"] == "sent"])
        failed = len([j for j in queue if j["status"] == "failed"])
        return jsonify(
            {
                "total": total,
                "pending": pending,
                "sending": sending,
                "sent": sent,
                "failed": failed,
            }
        )

    # Error handlers (scoped to blueprint) must be defined before registering
    @bp.app_errorhandler(404)
    def not_found(e):  # pragma: no cover - simple handler
        return jsonify({"error": "Route not found"}), 404

    @bp.app_errorhandler(Exception)
    def internal_error(e):  # pragma: no cover
        current_app.logger.exception("Unhandled exception")
        return jsonify({"error": "Something went wrong!"}), 500

    return bp
