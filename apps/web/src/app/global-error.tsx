'use client';
import {RequestFailure} from '@zhiqing/ui';
import '@zhiqing/design/fonts.css';
import '@zhiqing/design/style.css';
import '@zhiqing/design/pages.css';
import '@zhiqing/design/interactions.css';
import '@zhiqing/design/content.css';
// Root settings also depend on the database. This boundary must not query it again.
export default function GlobalError(){return <html lang="zh-CN"><head><title>本机服务暂不可用 · 世纪末之青</title><meta name="robots" content="noindex,nofollow" /></head><body><div className="preview-notice">本机服务暂不可用，请检查本机后台与数据库后重试。</div><RequestFailure retry={()=>location.reload()} /></body></html>;}
