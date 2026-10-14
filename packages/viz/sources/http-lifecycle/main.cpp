// HTTPS GET with POSIX sockets + OpenSSL (error handling omitted).
string fetch(const string& host, const string& path) {
    addrinfo* ip; getaddrinfo(host.c_str(), "443", nullptr, &ip);   // @parse @dns
    int fd = socket(ip->ai_family, SOCK_STREAM, 0);
    connect(fd, ip->ai_addr, ip->ai_addrlen);                        // @tcp
    SSL* ssl = SSL_new(SSL_CTX_new(TLS_client_method()));
    SSL_set_fd(ssl, fd); SSL_set_tlsext_host_name(ssl, host.c_str());
    SSL_connect(ssl);                                                // @tls
    string req = "GET " + path + " HTTP/1.1\r\nHost: " + host + "\r\n\r\n";
    SSL_write(ssl, req.data(), req.size());                          // @request
    char buf[4096]; int n = SSL_read(ssl, buf, sizeof buf);          // @server @response
    return string(buf, n);                                           // @done
}
