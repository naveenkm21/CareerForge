/**
 * Sample job postings for the demo. Companies are fictional; descriptions are written for the
 * product and labelled "sample" in the UI. Real ingestion uses licensed APIs or pasted JDs
 * (docs/00 §5 — no scraping).
 */
export type JobDef = {
  externalId: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  minExp: number;
  roleSlug: string;
  daysAgo: number;
  description: string;
};

export const JOBS: JobDef[] = [
  {
    externalId: 'nimbus-sde1',
    title: 'Software Engineer I',
    company: 'Nimbus Labs',
    location: 'Bengaluru',
    remote: false,
    minExp: 0,
    roleSlug: 'sde',
    daysAgo: 2,
    description: `We are hiring new-grad engineers for our payments platform.

What you will do
- Build and own backend services in Java or C++ that move money reliably
- Design REST APIs and work with PostgreSQL databases
- Write unit tests and take part in code reviews

What we look for
- Strong data structures and algorithms: arrays, hash maps, trees, graphs, dynamic programming
- Solid CS fundamentals: operating systems, DBMS and SQL, computer networks
- Comfort with Git and a CI workflow
- Clear communication`,
  },
  {
    externalId: 'quantro-backend',
    title: 'Backend Engineer',
    company: 'Quantro',
    location: 'Hyderabad',
    remote: true,
    minExp: 1,
    roleSlug: 'backend',
    daysAgo: 5,
    description: `Quantro builds real-time analytics for logistics.

Responsibilities
- Ship APIs in Node.js and TypeScript
- Model data in PostgreSQL; tune indexing and queries
- Add Redis caching and background jobs
- Own authentication with OAuth and JWT

Requirements
- 1+ years building REST APIs
- SQL, transactions and indexing
- Docker and a cloud provider
- System design basics: scalability, caching, queues`,
  },
  {
    externalId: 'pixelcraft-frontend',
    title: 'Frontend Developer',
    company: 'PixelCraft Studio',
    location: 'Pune',
    remote: true,
    minExp: 0,
    roleSlug: 'frontend',
    daysAgo: 1,
    description: `Join our design-systems team.

You will
- Build accessible React and Next.js interfaces
- Own Core Web Vitals and web performance budgets
- Write component tests with Vitest and Playwright

You have
- Strong JavaScript, HTML and CSS (Tailwind is a plus)
- Experience with React hooks and state
- Accessibility knowledge (WCAG)
- Git and code review habits`,
  },
  {
    externalId: 'orbitpay-sde-intern',
    title: 'SDE Intern (6 months)',
    company: 'OrbitPay',
    location: 'Chennai',
    remote: false,
    minExp: 0,
    roleSlug: 'sde',
    daysAgo: 3,
    description: `Six-month internship with a pre-placement offer track.

We expect
- Data structures: arrays, strings, linked lists, stacks and queues, trees, heaps
- Algorithms: binary search, sorting, BFS and DFS on graphs, greedy, dynamic programming
- OOP in C++ or Java
- Basic SQL and operating systems concepts

Bonus
- Competitive programming
- A project on GitHub`,
  },
  {
    externalId: 'helix-platform',
    title: 'Platform Engineer',
    company: 'Helix Cloud',
    location: 'Remote (India)',
    remote: true,
    minExp: 2,
    roleSlug: 'backend',
    daysAgo: 9,
    description: `Helix Cloud runs developer infrastructure at scale.

- Operate distributed systems and microservices on Kubernetes
- Improve observability and incident response
- Deep understanding of TCP/IP, DNS, TLS and HTTP
- Concurrency, threads and deadlocks — you have debugged them
- System design: scalability, caching, sharding
- Go or Java; strong testing discipline`,
  },
  {
    externalId: 'lumen-ml',
    title: 'Machine Learning Engineer (New Grad)',
    company: 'Lumen AI',
    location: 'Bengaluru',
    remote: false,
    minExp: 0,
    roleSlug: 'data-ml',
    daysAgo: 4,
    description: `Lumen AI builds search and ranking models.

- Python, NumPy, pandas
- Statistics and probability fundamentals
- Machine learning: model training, evaluation, deployment
- SQL for feature pipelines
- Data structures and algorithms (hashing, heaps, graphs)
- A project you can walk us through end to end`,
  },
  {
    externalId: 'trellis-fullstack',
    title: 'Full-Stack Engineer',
    company: 'Trellis HR',
    location: 'Gurugram',
    remote: true,
    minExp: 1,
    roleSlug: 'sde',
    daysAgo: 7,
    description: `Small team, big ownership.

- React and Next.js on the front end, Node.js APIs on the back end
- PostgreSQL schema design and SQL
- Authentication, caching with Redis
- Testing with Jest or Vitest
- Data structures and algorithms interview round (graphs, trees, sliding window)
- Strong communication with product and design`,
  },
  {
    externalId: 'zenith-sde2',
    title: 'Software Engineer II',
    company: 'Zenith Mobility',
    location: 'Bengaluru',
    remote: false,
    minExp: 2,
    roleSlug: 'sde',
    daysAgo: 12,
    description: `Routing and dispatch for urban mobility.

- Graph algorithms in production: shortest paths, Dijkstra, topological sort
- Heaps and priority queues for real-time matching
- Concurrency and multithreading in C++
- System design: distributed systems, caching, scalability
- Mentoring juniors and owning delivery`,
  },
];

export const COMPANY_PROFILES = [
  {
    slug: 'product-sde',
    label: 'Product company · SDE',
    description: 'DSA-heavy, one fundamentals round, one behavioral round.',
  },
  {
    slug: 'startup-fullstack',
    label: 'Startup · full-stack',
    description: 'Practical problem solving, systems thinking, ownership.',
  },
  {
    slug: 'service-graduate',
    label: 'IT services · graduate',
    description: 'Fundamentals-first, communication matters a lot.',
  },
] as const;
