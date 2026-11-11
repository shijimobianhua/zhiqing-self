// Scene revisions never change the live-page / seen coordination namespaces.
export const introScene = {
  id: 'zhiqing-handbook-r4-role-202611', enabled: true,
  portrait: '/assets/role-202611/07-salute.webp',
  sourceFile: 'assets/role-202611-illustrations/07-salute.png',
  skipLabel: '跳过开场', startLabel: 'start',
  readyAtMs: 3850, finishAtMs: 18200, storyDurationMs: 14350,
  timings: { assembleEndMs: 1300, turnsAtMs: [1600, 4500, 7400, 10300], turnMs: 750, leaveAtMs: 13150 },
  pages: [
    { image: '/assets/role-202611/02-curiosity.webp', title: '收集好奇', text: '从一个问题开始。', motif: 'notes' },
    { image: '/assets/role-202611/03-making.webp', title: '动手试试', text: '让想法慢慢成形。', motif: 'blocks' },
    { image: '/assets/role-202611/04-journal.webp', title: '留下记录', text: '把沿途发现写下来。', motif: 'journal' },
  ],
  particles: { spacing: 5, maxCount: 2800, noteCount: 12 }, maxDpr: 2,
  assetTimeoutMs: 5000, watchdogMs: 10000, storyWatchdogMs: 18000,
} as const;
