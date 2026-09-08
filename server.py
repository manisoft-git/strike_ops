#!/usr/bin/env python3
"""
StrikeOps - High Performance Local HTTP Server
Zero dependencies. Works on standard Python 3.
"""

import os
import sys
import socket
from http.server import HTTPServer, SimpleHTTPRequestHandler

DEFAULT_PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class StrikeOpsHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and disable aggressive caching for seamless live editing
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def guess_type(self, path):
        # Ensure proper MIME types for web files
        if path.endswith('.js'):
            return 'application/javascript'
        if path.endswith('.wasm'):
            return 'application/wasm'
        return super().guess_type(path)

    def log_message(self, format, *args):
        # Clean terminal logging without clutter
        sys.stderr.write(f"[{self.log_date_time_string()}] {args[0]} -> {args[1]}\n")


def get_lan_ip():
    """Attempt to find the local network IP address."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Does not need to be reachable, just triggers OS routing table lookup
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip


def find_available_port(start_port=DEFAULT_PORT, max_attempts=10):
    for offset in range(max_attempts):
        port = start_port + offset
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            s.bind(('127.0.0.1', port))
            s.close()
            return port
        except OSError:
            s.close()
            continue
    return start_port


def main():
    port = find_available_port(int(os.environ.get('PORT', DEFAULT_PORT)))
    lan_ip = get_lan_ip()

    # Try binding to all interfaces, fall back to localhost
    try:
        server = HTTPServer(('0.0.0.0', port), StrikeOpsHandler)
    except OSError:
        server = HTTPServer(('127.0.0.1', port), StrikeOpsHandler)

    print("=" * 60)
    print(" 🎯 STRIKE OPS — 3D TACTICAL COMBAT ENGINE")
    print("=" * 60)
    print(f" ▶ Local URL:    http://127.0.0.1:{port}")
    print(f" ▶ Network URL:  http://{lan_ip}:{port}")
    print(f" ▶ Directory:    {DIRECTORY}")
    print("-" * 60)
    print(" Open the Local URL in your browser to play!")
    print(f" On mobile/Termux: open http://127.0.0.1:{port}")
    print(" Press Ctrl+C to stop.")
    print("=" * 60)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[+] StrikeOps server shut down gracefully.")
        server.server_close()


if __name__ == '__main__':
    main()
