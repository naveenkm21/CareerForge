static String fetch(String host, String path) throws IOException {
    InetAddress ip = InetAddress.getByName(host);                         // @parse @dns
    Socket tcp = new Socket(ip, 443);                                      // @tcp
    SSLSocket tls = (SSLSocket) ((SSLSocketFactory) SSLSocketFactory.getDefault())
        .createSocket(tcp, host, 443, true);
    tls.startHandshake();                                                  // @tls
    OutputStream out = tls.getOutputStream();
    out.write(("GET " + path + " HTTP/1.1\r\nHost: " + host + "\r\n\r\n").getBytes());  // @request
    byte[] buf = tls.getInputStream().readNBytes(4096);                    // @server @response
    return new String(buf);                                                // @done
}
