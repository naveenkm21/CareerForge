import { lookup } from 'node:dns/promises';
import { connect } from 'node:tls';

async function fetchFirstBytes(url: string): Promise<Buffer> {
  const { hostname, pathname } = new URL(url);                       // @parse
  const { address } = await lookup(hostname);                         // @dns
  const socket = connect({ host: address, port: 443, servername: hostname }); // @tcp
  await new Promise((ok) => socket.once('secureConnect', ok));        // @tls
  socket.write(`GET ${pathname} HTTP/1.1\r\nHost: ${hostname}\r\n\r\n`); // @request
  const chunk: Buffer = await new Promise((ok) => socket.once('data', ok)); // @server @response
  return chunk;                                                       // @done
}
