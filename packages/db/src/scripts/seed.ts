import { closeDb, getDb } from '../client';
import { loadContent } from '../seed/content';
import { seedContent } from '../seed/seed';

async function main() {
  // Local default: the embedded database the web app also uses (see .env.example).
  process.env.DATABASE_URL ??= 'pglite:.data/pg';
  const content = loadContent();
  const report = await seedContent(getDb(), content);
  console.log(
    `seeded ${report.skills} skills, ${report.edges} edges, ${report.roles} roles ` +
      `(${report.requirements} requirements), ${report.algorithms} algorithms, ` +
      `${report.topics} topics, ${report.problems} problems, ` +
      `${report.flagsInserted} new flags`,
  );
  if (report.orphanedSkills.length) {
    console.warn(
      `warning: skills in the database but not in content/: ${report.orphanedSkills.join(', ')}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    // Drizzle wraps driver errors; the real reason (auth, network, SQL) is in `cause`.
    if (err instanceof Error && err.cause)
      console.error('cause:', (err.cause as Error).message ?? err.cause);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
