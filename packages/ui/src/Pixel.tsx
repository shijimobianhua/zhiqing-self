'use client';
import { useRef, useState, type KeyboardEvent } from 'react';
import { artSource } from './Art';

// Native modal dialogs can otherwise Tab into browser chrome at the last control.
export function trapDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab') return;
  const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')].filter(element => element.getClientRects().length > 0);
  const first = controls[0];
  const last = controls.at(-1);
  if (!first) { event.preventDefault(); return; }
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault(); last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
}

const icons = {
  link: ['00001110','00010001','00100001','01011010','10000100','10001000','01110000'],
  github: ['00111100','01111110','11111111','11011011','11111111','01111110','00111100','00100100'],
  x: ['11000011','01100110','00111100','00011000','00111100','01100110','11000011'],
  chat: ['01111110','10000001','10101001','10000001','01111110','00110000','00100000'],
  mail: ['11111111','11000011','10100101','10011001','10000001','11111111'],
  play: ['11000000','11110000','11111100','11111111','11111100','11110000','11000000'],
  download: ['00011000','00011000','10011001','01111110','00111100','00011000','11111111'],
  menu: ['11111111', '00000000', '11111111', '00000000', '11111111'],
  close: ['11000011', '01100110', '00111100', '00011000', '00111100', '01100110', '11000011'],
  folder: ['11110000', '10011111', '10000001', '11111111', '10000001', '10000001', '11111111'],
  page: ['11111100', '10010110', '10010001', '10011111', '10000001', '10111101', '10000001', '11111111'],
  spark: ['00010000', '00010000', '00111000', '11111110', '00111000', '00010000', '00010000'],
  image: ['11111111', '10000001', '10100001', '10000101', '10001001', '10010101', '10100011', '11111111'],
};

export function PixelIcon({ name, className = '' }: { name: keyof typeof icons; className?: string }) {
  return <svg className={`pixel-icon ${className}`} viewBox="0 0 16 16" aria-hidden="true" focusable="false" shapeRendering="crispEdges">
    {icons[name].flatMap((row, y) => [...row].map((cell, x) => cell === '1' ? <rect key={`${x}-${y}`} x={x * 2} y={y * 2} width="2" height="2" fill="currentColor" /> : null))}
  </svg>;
}

export function ImageViewer({ src, alt, caption, width = 1536, height = 1024 }: { src: string; alt: string; caption: string; width?:number; height?:number }) {
  src=artSource(src);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [failed, setFailed] = useState(false);
  const [attempt,setAttempt] = useState(0);
  const [dialogFailed,setDialogFailed] = useState(false);
  return <>
    <button ref={trigger} className="image-trigger" type="button" disabled={failed} aria-haspopup="dialog" aria-label={failed ? '图片暂时无法显示' : `查看大图：${caption}`} onClick={() => {setDialogFailed(false); dialog.current?.showModal();}}>
      {failed ? <span className="image-fallback">{alt} · 图片暂时无法显示。</span> : <img key={attempt} src={src} alt={alt} width={width} height={height} loading="lazy" onError={() => setFailed(true)} />}
      {!failed && <span className="image-hint"><PixelIcon name="image" />查看大图</span>}
    </button>
    {failed && <button className="outline-button image-retry" type="button" onClick={() => {setFailed(false);setAttempt(value=>value+1);}}>重试图片</button>}
    <dialog className="image-dialog pixel-frame" ref={dialog} aria-label={caption} onKeyDown={trapDialogFocus} onClose={() => trigger.current?.focus({ preventScroll: true })}>
      <div className="dialog-top"><p>{caption}</p><button className="outline-button" type="button" autoFocus onClick={() => dialog.current?.close()}><PixelIcon name="close" />关闭</button></div>
      {dialogFailed ? <p role="status">大图暂时无法加载。请关闭后重试，正文可继续阅读。</p> : <img src={src} alt={alt} width={width} height={height} onError={()=>setDialogFailed(true)} />}
      <p className="image-caption">点击关闭或按 Esc 返回阅读</p>
    </dialog>
  </>;
}
