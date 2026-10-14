import { z } from 'zod';
import { defineAlgorithm, InputError } from '../../define';

const STAGES = [
  { id: 'browser', label: 'Browser' },
  { id: 'dns', label: 'DNS resolver' },
  { id: 'tcp', label: 'TCP' },
  { id: 'tls', label: 'TLS' },
  { id: 'http', label: 'HTTP' },
  { id: 'server', label: 'Server' },
];

export default defineAlgorithm({
  id: 'http-lifecycle',
  title: 'What Happens When You Load a URL',
  category: 'networks',
  skillId: 'cs.networks.http-lifecycle',
  summary:
    'DNS lookup, TCP handshake, TLS handshake, then the HTTP request — and what each costs in round trips.',
  difficulty: 2,
  params: z.object({
    url: z.string().min(8).max(120),
    rttMs: z.number().int().min(5).max(400),
    dnsCached: z.number().int().min(0).max(1),
    serverMs: z.number().int().min(1).max(2000),
  }),
  inputSpec: [
    { name: 'url', label: 'URL', kind: 'string' },
    { name: 'rttMs', label: 'Round-trip time (ms)', kind: 'int' },
    { name: 'dnsCached', label: 'DNS cached? (1 = yes)', kind: 'int' },
    { name: 'serverMs', label: 'Server processing (ms)', kind: 'int' },
  ],
  defaultInput: {
    url: 'https://careerforge.dev/jobs?role=sde',
    rttMs: 40,
    dnsCached: 0,
    serverMs: 30,
  },
  presets: [
    {
      label: 'Cold start',
      input: {
        url: 'https://careerforge.dev/jobs?role=sde',
        rttMs: 40,
        dnsCached: 0,
        serverMs: 30,
      },
    },
    {
      label: 'Warm DNS cache',
      input: {
        url: 'https://careerforge.dev/jobs?role=sde',
        rttMs: 40,
        dnsCached: 1,
        serverMs: 30,
      },
    },
    {
      label: 'Far-away server',
      input: { url: 'https://example.org/', rttMs: 250, dnsCached: 0, serverMs: 30 },
    },
  ],
  complexity: { time: '≈ 3–4 RTT + server time (TLS 1.3)', space: '—' },

  run({ url, rttMs, dnsCached, serverMs }, t) {
    const m = /^https:\/\/([a-z0-9.-]+)(\/[^\s]*)?$/i.exec(url);
    if (!m) throw new InputError('Use an https:// URL, e.g. https://example.com/path');
    const host = m[1]!;
    const path = m[2] ?? '/';
    const flow = t.flow('net', STAGES, { label: 'request lifecycle' });
    const timing = t.table(
      'timing',
      ['round trips', 'ms', 'elapsed'],
      STAGES.slice(1, 5).map((s) => ({ id: s.id, label: s.label })),
      { label: 'latency budget' },
    );
    let elapsed = 0;
    let rtts = 0;
    const cost = (row: string, trips: number, extra = 0) => {
      const ms = trips * rttMs + extra;
      elapsed += ms;
      rtts += trips;
      timing.set(row, 0, trips).set(row, 1, ms).set(row, 2, elapsed).cell(row, 2, 'found');
    };

    flow.cell('browser', 'active').sub('browser', host);
    t.at('parse')
      .vars({ host, path, rttMs })
      .say(`Parse the URL: scheme https, host ${host}, path ${path}. Port 443 by default.`)
      .step();

    flow.cell('browser', 'visited').cell('dns', 'active');
    if (dnsCached) {
      flow.send('browser', 'dns', 'cache hit', 'found').sub('dns', 'cached');
      cost('dns', 0);
      t.at('dns')
        .vars({ rtts, elapsed })
        .say(`The OS resolver already has ${host} cached — no network trip.`)
        .step();
    } else {
      flow.send('browser', 'dns', `A? ${host}`).sub('dns', '93.184.x.x');
      cost('dns', 1);
      t.at('dns')
        .vars({ rtts, elapsed })
        .say(
          `Ask the resolver for ${host}'s IP address: one round trip (${rttMs} ms) if the resolver has it cached.`,
        )
        .step();
    }

    flow.send('browser', 'dns', null).cell('dns', 'visited').cell('tcp', 'active');
    flow.send('dns', 'tcp', 'SYN → SYN-ACK → ACK');
    t.at('tcp')
      .say('Open a TCP connection to port 443 with the three-way handshake.')
      .invariant('Nothing encrypted can be sent before a TCP connection exists.')
      .ask({
        kind: 'choice',
        prompt: 'Which handshake comes next?',
        options: ['TLS handshake', 'HTTP request', 'DNS lookup'],
        answer: 'TLS handshake',
        explain:
          'HTTPS needs an encrypted channel first: TLS runs on top of the new TCP connection.',
      })
      .step();
    cost('tcp', 1);
    flow.send('dns', 'tcp', null).cell('tcp', 'visited').cell('tls', 'active');
    flow.send('tcp', 'tls', 'ClientHello / ServerHello + cert');
    t.at('tls')
      .vars({ rtts, elapsed })
      .say(
        'TLS 1.3: client and server agree on keys and the browser verifies the certificate for the host. One round trip.',
      )
      .step();
    cost('tls', 1);

    flow.send('tcp', 'tls', null).cell('tls', 'visited').cell('http', 'active');
    flow.send('tls', 'http', `GET ${path}`);
    t.at('request')
      .vars({ rtts, elapsed })
      .say(`Send the encrypted HTTP request: GET ${path} with Host: ${host}.`)
      .ask({
        kind: 'value',
        prompt: `Counting this request/response, how many round trips before the first byte arrives${dnsCached ? ' (DNS was cached)' : ''}?`,
        answer: String(rtts + 1),
        explain: `${dnsCached ? '' : 'DNS 1 + '}TCP 1 + TLS 1 + HTTP 1 = ${rtts + 1}.`,
      })
      .step();

    flow.send('tls', 'http', null).cell('http', 'visited').cell('server', 'active');
    flow.send('http', 'server', 'route → handler → DB');
    t.at('server')
      .say(
        `The server routes the request, runs the handler, maybe queries a database (${serverMs} ms).`,
      )
      .step();
    cost('http', 1, serverMs);

    flow
      .send('http', 'server', '200 OK + HTML', 'found')
      .cell('server', 'found')
      .cell('browser', 'found');
    t.at('response')
      .vars({ rtts, elapsed })
      .say(
        `First byte after ${elapsed} ms (${rtts} RTT + server). The browser now parses HTML and fetches more resources — reusing this connection.`,
      )
      .step();
    t.at('done')
      .say(
        `Time to first byte: ${elapsed} ms. Network latency dominates: ${rtts * rttMs} ms of it is round trips.`,
      )
      .emphasis('result')
      .step();
    return elapsed;
  },
});
