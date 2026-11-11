from pathlib import Path
import json, re

root = Path(__file__).resolve().parents[1]
if (root / 'packages/ui/src/Work.tsx').exists():
    raise SystemExit('One-time migration already applied; edit the shared source directly.')
def read(p): return (root / p).read_text(encoding='utf-8-sig')
def write(p, text):
    target = root / p
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding='utf-8')
def obj(p, data): write(p, json.dumps(data, ensure_ascii=False, indent=2) + '\n')

pages = read('apps/preview/src/Pages.tsx')
fixture = pages[pages.index('export const works:'):pages.index("const sourceKey")]
fixture = fixture.replace('export const works: Work[]', 'export const works: Work[]')
fixture = fixture.replace("slug: 'inspiration-collector',", "id: 'fixture-work-001',\n    schemaVersion: 1,\n    revision: 'fixture-r1',\n    kind: 'fixture',\n    slug: 'inspiration-collector',")
fixture = fixture.replace("slug: 'interaction-lab',", "id: 'fixture-work-002',\n    schemaVersion: 1,\n    revision: 'fixture-r1',\n    kind: 'fixture',\n    slug: 'interaction-lab',")
write('packages/adapters/src/fixtures.ts', "import type { Work } from '@zhiqing/content';\n// Explicitly allowed test fixtures; never import a database record here.\n" + fixture)

types = pages[pages.index('type Section'):pages.index('// Clearly labelled')]
types = types.replace('type Section', 'export type Section').replace('  slug: string;', "  id: string;\n  schemaVersion: 1;\n  revision: string;\n  kind: 'fixture';\n  slug: string;")
write('packages/content/src/index.ts', types + '''
export function safeHash(hash: string): string {
  try { return decodeURIComponent(hash.replace(/^#/, '')); } catch { return ''; }
}

// T1 contract: a public fixture view, not the future complete CMS schema.
export function validateWork(work: Work): void {
  if (!/^fixture-work-[0-9]{3}$/.test(work.id) || work.kind !== 'fixture' || work.schemaVersion !== 1) throw new Error('Invalid fixture identity');
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(work.slug) || ['admin', 'api', 'new'].includes(work.slug)) throw new Error('Invalid slug');
  if (!work.title.trim() || !work.summary.trim() || !work.revision) throw new Error('Missing required public field');
  if (!/^\\/assets\\/[a-z0-9-]+\\.png$/.test(work.image)) throw new Error('Only allowlisted local fixture media are supported');
  const ids = new Set<string>();
  for (const section of work.sections) {
    if (!/^[a-z][a-z0-9-]*$/.test(section.id) || ids.has(section.id)) throw new Error('Invalid or duplicate section');
    if (!section.title || !section.paragraphs.every(p => typeof p === 'string')) throw new Error('Invalid section');
    ids.add(section.id);
  }
}
''')

shared = pages[pages.index('const sourceKey'):pages.index('export function AboutPage')]
shared = shared.replace('export function WorksPage()', 'export function WorkArchive({ works }: { works: Work[] })')
shared = shared.replace('export function WorkDetail({ slug }: { slug: string }) {\n  const work = works.find(item => item.slug === slug);', 'export function WorkDetailView({ work, related }: { work: Work; related?: Work }) {')
shared = shared.replace('const id = decodeURIComponent(window.location.hash.slice(1));', 'const id = safeHash(window.location.hash);')
shared = shared.replace('  if (!work) return <NotFound />;\n  const other = works.find(item => item.slug !== slug);', '  const other = related;')
shared = shared.replace('<a className="text-link back-link" href="/works?return=1">← 返回作品</a>', '<TextLink className="back-link" href="/works?return=1">← 返回作品</TextLink>')
shared = "'use client';\nimport { useEffect, useState } from 'react';\nimport { safeHash, type Work, type Section } from '@zhiqing/content';\nimport { ImageViewer } from './Pixel';\nimport { TextLink } from './TextLink';\n\n" + shared
write('packages/ui/src/Work.tsx', shared)
write('packages/ui/src/TextLink.tsx', '''import type { ReactNode } from 'react';
export function TextLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return <a className={`text-link ${className}`} href={href}>{children}</a>;
}
''')
write('packages/ui/src/Pixel.tsx', "'use client';\n" + read('apps/preview/src/Pixel.tsx'))
write('packages/ui/src/index.ts', "export { WorkCard, WorkArchive, WorkDetailView } from './Work';\nexport { ImageViewer, PixelIcon, trapDialogFocus } from './Pixel';\nexport { TextLink } from './TextLink';\n")
write('apps/preview/src/Pixel.tsx', "export { ImageViewer, PixelIcon, trapDialogFocus } from '@zhiqing/ui';\n")
write('apps/preview/src/Pages.tsx', '''import { works } from '@zhiqing/adapters';
import { WorkCard, WorkArchive, WorkDetailView } from '@zhiqing/ui';
import { PixelIcon } from './Pixel';
export { works, WorkCard };
export type { Work } from '@zhiqing/content';
export function WorksPage() { return <WorkArchive works={works} />; }
export function WorkDetail({ slug }: { slug: string }) {
  const work = works.find(item => item.slug === slug);
  return work ? <WorkDetailView work={work} related={works.find(item => item.id !== work.id)} /> : <NotFound />;
}

''' + pages[pages.index('export function AboutPage'):])

for name in ['style.css', 'pages.css', 'interactions.css', 'fonts.css']:
    write('packages/design/' + name, read('apps/preview/src/' + name))
    write('apps/preview/src/' + name, "@import '@zhiqing/design/" + name + "';\n")
# pages.css was previously imported by Pages.tsx.
main = read('apps/preview/src/main.tsx').replace("import './style.css';", "import './style.css';\nimport './pages.css';")
main = main.replace('本地开发预览 <span', '私人测试候选 · T1-R1 <span').replace('© 世纪末之青 · 本地开发预览', '© 世纪末之青 · T1-R1 私人测试')
write('apps/preview/src/main.tsx', main)

for name in ['content', 'adapters', 'ui']:
    data = {'name': '@zhiqing/' + name, 'version': '0.1.0', 'private': True, 'type': 'module', 'exports': './src/index.ts'}
    if name == 'ui': data['peerDependencies'] = {'react': '19.2.1', 'react-dom': '19.2.1'}
    if name in ['adapters', 'ui']: data['dependencies'] = {'@zhiqing/content': '0.1.0'}
    obj('packages/' + name + '/package.json', data)
write('packages/adapters/src/index.ts', "export { works } from './fixtures';\nexport { snapshot } from './snapshot';\n")
write('packages/adapters/src/snapshot.ts', '''export const snapshot = {
  id: 'sites-t1-fixtures-20261027-1', schemaVersion: 1,
  allowedWorkIds: ['fixture-work-001', 'fixture-work-002'],
  allowedMedia: ['01-collecting-ideas.png', '02-connecting-ideas.png', '03-testing-feedback.png', 'character-avatar.png'],
  candidate: 'T1-R1', dataSource: 'explicit-test-fixtures',
} as const;
''')
obj('packages/design/package.json', {'name': '@zhiqing/design', 'version': '0.1.0', 'private': True, 'exports': {'./*.css': './*.css'}})

obj('package.json', {
    'name': 'zhiqing-self', 'version': '0.1.0', 'private': True, 'type': 'module',
    'engines': {'node': '>=24.22.1 <25', 'npm': '>=11 <12'},
    'packageManager': 'npm@11.16.0', 'workspaces': ['apps/*', 'packages/*'],
    'scripts': {
        'dev:preview': 'npm run dev -w apps/preview -- --port 5173',
        'dev:web': 'npm run dev -w apps/web -- --port 3000',
        'build': 'npm run build:sites',
        'build:sites': 'node scripts/prepare-assets.mjs && npm run build -w apps/preview && node scripts/prepare-static-routes.mjs',
        'build:web': 'node scripts/prepare-assets.mjs && npm run build -w apps/web',
        'start:web': 'npm run start -w apps/web -- --port 3000',
        'preview': 'npm run preview -w apps/preview -- --port 5173',
        'typecheck': 'tsc -p apps/preview/tsconfig.json --noEmit && npm run typecheck -w apps/web',
        'test:contracts': 'node scripts/test-contracts.mjs',
        'check:snapshot': 'node scripts/check-snapshot.mjs'
    }
})
for app in ['preview', 'web']:
    data = json.loads(read(f'apps/{app}/package.json'))
    data['dependencies']['react'] = data['dependencies']['react-dom'] = '19.2.1'
    data['devDependencies']['@types/react'] = '19.2.7'
    data['devDependencies']['@types/react-dom'] = '19.2.3'
    for name in ['design', 'content', 'ui', 'adapters']: data['dependencies']['@zhiqing/' + name] = '0.1.0'
    # Pin the previous resolved tool versions, no framework upgrade.
    if app == 'preview':
        lock = json.loads(read('apps/preview/package-lock.json'))
        for name in ['vite', 'typescript', '@vitejs/plugin-react']:
            data['devDependencies'][name] = lock['packages']['node_modules/' + name]['version']
    obj(f'apps/{app}/package.json', data)
    # Baseline Git commit preserves the old independent lockfiles.
    (root / f'apps/{app}/package-lock.json').unlink()

write('apps/preview/vite.config.ts', '''import { defineConfig } from 'vite';
export default defineConfig({ resolve: { dedupe: ['react', 'react-dom'] } });
''')
write('apps/web/next.config.mjs', '''import { withPayload } from '@payloadcms/next/withPayload';
export default withPayload({
  transpilePackages: ['@zhiqing/ui', '@zhiqing/content', '@zhiqing/adapters'],
});
''')
write('apps/web/src/app/page.tsx', "import { redirect } from 'next/navigation';\nexport default function Home() { redirect('/works'); }\n")
write('apps/web/src/app/works/page.tsx', '''import { WorkArchive } from '@zhiqing/ui';
import { works } from '@zhiqing/adapters';
export default function Works() { return <WorkArchive works={works} />; }
''')
write('apps/web/src/app/works/[slug]/page.tsx', '''import { notFound } from 'next/navigation';
import { WorkDetailView } from '@zhiqing/ui';
import { works } from '@zhiqing/adapters';
import type { Metadata } from 'next';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const work = works.find(item => item.slug === slug);
  return { title: work ? `${work.title} · 世纪末之青 · T1-R1 示例` : '未找到作品 · 世纪末之青', description: work?.summary };
}
export default async function Work({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const work = works.find(item => item.slug === slug);
  if (!work) notFound();
  return <WorkDetailView work={work} related={works.find(item => item.id !== work.id)} />;
}
''')
write('apps/web/src/app/not-found.tsx', '''import { TextLink } from '@zhiqing/ui';
export default function Missing() {
  return <div className="wrap page-content missing-page"><p className="eyebrow">404 / 这里暂时没有内容</p><h1 className="about-page-title">没有找到这个页面<span className="period">.</span></h1><p className="lead">页面可能不存在，或暂时不可访问。</p><TextLink href="/works">返回作品</TextLink></div>;
}
''')
write('apps/web/src/app/layout.tsx', '''import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@zhiqing/design/fonts.css';
import '@zhiqing/design/style.css';
import '@zhiqing/design/pages.css';
import '@zhiqing/design/interactions.css';
export const metadata: Metadata = { title: '世纪末之青 · T1-R1 本机共享小样', robots: { index: false, follow: false } };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="zh-CN"><body><div id="top"><a className="skip" href="#main">跳到主要内容</a><div className="preview-notice">本机 Next 共享小样 · T1-R1 / 仅示例数据，后台尚未实现</div><header className="site-header"><div className="wrap nav"><a className="brand" href="/works"><img src="/assets/character-avatar.png" alt="" />世纪末之青</a><a className="text-link" href="/works">作品</a></div></header><main id="main" tabIndex={-1}>{children}</main><footer><div className="wrap footer-inner"><p>后台仅支持后续本机测试，远程入口待上线阶段配置。</p><div className="footer-bottom">T1-R1 · 同一共享卡片、详情与设计样式</div></div></footer></div></body></html>;
}
''')
print('T1 minimal shared source prepared; existing home/notes/about retained.')
