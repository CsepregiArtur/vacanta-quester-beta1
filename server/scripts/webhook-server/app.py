#!/usr/bin/env python3
"""
VQ Webhook Server — GitHub → Proxmox LXC auto-deploy
======================================================
Ascultă webhook-uri de la GitHub și declanșează deploy-ul.

Rulează pe portul 9000, expus prin Cloudflare Tunnel.
"""

import os
import hmac
import hashlib
import subprocess
import threading
import logging
from pathlib import Path

from flask import Flask, request, abort, jsonify

# ─── Config ─────────────────────────────────────────────────────────
WEBHOOK_SECRET = os.environ.get("VQ_WEBHOOK_SECRET", "schimba-ma-in-github-secret")
DEPLOY_SCRIPT = Path(__file__).parent / "deploy.sh"
HOST = os.environ.get("VQ_WEBHOOK_HOST", "127.0.0.1")
PORT = int(os.environ.get("VQ_WEBHOOK_PORT", "9000"))

# ─── Logging ────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="[WEBHOOK] %(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("webhook")

app = Flask(__name__)


# ═════════════════════════════════════════════════════════════════════
# Verificare semnătură HMAC
# ═════════════════════════════════════════════════════════════════════
def verify_signature(data: bytes, signature_header: str | None) -> bool:
    """Verifică X-Hub-Signature-256 contra WEBHOOK_SECRET."""
    if not signature_header:
        log.warning("Missing X-Hub-Signature-256 header")
        return False

    expected = "sha256=" + hmac.new(
        WEBHOOK_SECRET.encode("utf-8"),
        data,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(signature_header, expected)


# ═════════════════════════════════════════════════════════════════════
# Endpoint: /webhook — GitHub Push Event
# ═════════════════════════════════════════════════════════════════════
@app.route("/webhook", methods=["POST"])
def webhook():
    # 1. Verifică semnătura
    signature = request.headers.get("X-Hub-Signature-256")
    if not verify_signature(request.data, signature):
        log.warning("Invalid signature — 403")
        abort(403, "Invalid signature")

    # 2. Verifică evenimentul
    event = request.headers.get("X-GitHub-Event", "push")
    if event != "push":
        log.info(f"Ignored event: {event}")
        return f"Ignored {event}", 200

    # 3. Log payload sumar
    payload = request.get_json(silent=True) or {}
    branch = (payload.get("ref", "") or "").replace("refs/heads/", "")
    repo_name = (payload.get("repository") or {}).get("full_name", "unknown")
    pusher = (payload.get("pusher") or {}).get("name", "unknown")
    commits = payload.get("commits", [])
    commit_msg = commits[0]["message"] if commits else "no commits"

    log.info(
        f"Push: {repo_name} / {branch} — {len(commits)} commit(s)"
        f" | {pusher}: {commit_msg[:60]}"
    )

    # 4. Rulează doar pentru branch-ul main
    if branch != "main":
        log.info(f"Ignored branch: {branch} (doar main declanșează deploy)")
        return f"Ignored {branch}", 200

    # 5. Rulează deploy în thread separat (răspundem imediat, nu ținem conexiunea)
    log.info("🚀 Deploy pornit în background...")

    def run_deploy():
        """Rulează deploy.sh într-un thread separat."""
        try:
            result = subprocess.run(
                ["bash", str(DEPLOY_SCRIPT)],
                capture_output=True,
                text=True,
                timeout=600,  # 10 minute timeout
            )
            if result.returncode == 0:
                log.info(f"✅ Deploy reușit:\n{result.stdout[-500:]}")
            else:
                log.error(f"❌ Deploy eșuat (exit {result.returncode}):\n{result.stderr[-500:]}")
        except subprocess.TimeoutExpired:
            log.error("❌ Deploy timeout (600s)")
        except Exception as e:
            log.exception(f"❌ Deploy error: {e}")

    thread = threading.Thread(target=run_deploy, daemon=True)
    thread.start()

    return jsonify({"status": "accepted", "message": "Deploy started in background"}), 202


# ═════════════════════════════════════════════════════════════════════
# Endpoint: /health
# ═════════════════════════════════════════════════════════════════════
@app.route("/health", methods=["GET"])
def health():
    return {"status": "ok", "service": "vq-webhook"}, 200


# ═════════════════════════════════════════════════════════════════════
# Main
# ═════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    log.info(f"Starting VQ Webhook on {HOST}:{PORT}")
    log.info(f"Deploy script: {DEPLOY_SCRIPT}")
    app.run(host=HOST, port=PORT)
