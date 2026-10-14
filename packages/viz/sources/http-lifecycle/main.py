import socket
import ssl
from urllib.parse import urlsplit


def fetch(url):
    parts = urlsplit(url)                                           # @parse
    ip = socket.gethostbyname(parts.hostname)                       # @dns
    tcp = socket.create_connection((ip, 443))                       # @tcp
    tls = ssl.create_default_context().wrap_socket(tcp, server_hostname=parts.hostname)  # @tls
    tls.sendall(f"GET {parts.path or '/'} HTTP/1.1\r\nHost: {parts.hostname}\r\n\r\n".encode())  # @request
    first_bytes = tls.recv(4096)                                    # @server @response
    return first_bytes                                              # @done
