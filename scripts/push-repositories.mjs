import { execFileSync } from 'node:child_process';

const repositories = [
  'https://github.com/jjtseng-jjtseng/BelowTheWake.git',
  'https://github.com/jjtseng-jjtseng/ShipExplorer.git',
];
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

try {
  if (git('branch', '--show-current') !== 'main') {
    throw new Error('Switch to main before publishing.');
  }
  if (git('status', '--porcelain')) {
    throw new Error('Commit or stash local changes before publishing.');
  }
  const commit = git('rev-parse', 'HEAD');
  // Preflight both repositories before changing either remote branch.
  for (const repository of repositories) {
    execFileSync('git', ['fetch', '--no-tags', repository, 'main'], { stdio: 'inherit' });
    execFileSync('git', ['merge-base', '--is-ancestor', 'FETCH_HEAD', commit]);
  }
  for (const repository of repositories) {
    console.log(`Publishing ${commit.slice(0, 7)} to ${repository}`);
    execFileSync('git', ['push', repository, 'main:main'], { stdio: 'inherit' });
    const remoteCommit = git('ls-remote', repository, 'refs/heads/main').split(/\s+/)[0];
    if (remoteCommit !== commit) throw new Error(`Remote verification failed: ${repository}`);
  }
  console.log(`Both repositories verified at ${commit}.`);
} catch (error) {
  console.error('Publishing stopped. No force pushes are used.');
  console.error('If one push completed, resolve the problem and rerun to sync the other repository.');
  console.error(error.message);
  process.exitCode = 1;
}
