// Scene revisions never alter the live-page/seen coordination namespaces.
export const introScene = {
  id: 'notes-handbook-r3-1',
  enabled: true,
  portrait: '/assets/character-avatar.webp',
  sourceFile: 'apps/preview/public/assets/character-avatar.png',
  skipLabel: '跳过开场',
  timings: {
    assembleAtMs: 8600, bookAtMs: 10200, pageAtMs: 13200,
    portraitAtMs: 14500, portraitReadyAtMs: 15500,
    nameAtMs: 15500, nameReadyAtMs: 16000, leaveAtMs: 17000,
  },
  particles: { spacing: 4, maxCount: 2800, noteCount: 12 },
  maxDpr: 2,
  leaveAtMs: 17000, finishAtMs: 18233,
  assetTimeoutMs: 1200, watchdogMs: 22000,
} as const;
