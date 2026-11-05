#!/usr/bin/env python3
"""Minimal static server for the Four Centuries board, on 127.0.0.1:18795.

Why a process at all: `tailscale serve` can serve a filesystem path directly, but that
requires root, while proxying to a local port does not. Every other app on this box is an
unprivileged loopback proxy, so this follows the same pattern.

Why not a plain directory server: the repo holds the sources, the fetch caches and
node_modules alongside the build. The built page is entirely self-contained — one file,
no assets — so this serves index.html for every path and nothing else. Nothing in the
repo is exposed by accident, and a stray sub-path lands on the board rather than a 404.

The file is read per request rather than cached, so `node build.js` takes effect
immediately with no restart.
"""
import http.server
import socketserver
from pathlib import Path

PORT = 18795
PAGE = Path(__file__).resolve().parent / "index.html"


class Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_GET(self):
        if self.path.rstrip("/").endswith("/healthz"):
            return self._send(b"ok", "text/plain; charset=utf-8")
        try:
            body = PAGE.read_bytes()
        except OSError:
            # Not built yet, or mid-write. Say so plainly instead of a bare 500.
            return self._send(
                b"Not built yet. Run: node /home/ubuntu/timeline/build.js",
                "text/plain; charset=utf-8", status=503)
        self._send(body, "text/html; charset=utf-8")

    def do_HEAD(self):
        self.do_GET()

    def _send(self, body: bytes, ctype: str, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        # The page is ~10 MB and rebuilt by hand; revalidate rather than serve a stale copy.
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def log_message(self, *args):
        pass          # journald already stamps every line; the default log is noise


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with Server(("127.0.0.1", PORT), Handler) as httpd:
        httpd.serve_forever()
