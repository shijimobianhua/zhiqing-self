'use client';
import {useEffect,useRef,useState} from 'react';

export function useCopyFeedback(){
 const [notice,setNotice]=useState({text:'',visible:false,version:0});
 const request=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;++request.current;if(timer.current)clearTimeout(timer.current);};},[]);
 const copy=async(value:string,success='已复制')=>{
  const version=++request.current;
  if(timer.current)clearTimeout(timer.current);
  let text=success;
  try{await navigator.clipboard.writeText(value);}catch{text='复制失败，请重试';}
  if(!mounted.current||version!==request.current)return;
  setNotice({text,visible:true,version});
  timer.current=setTimeout(()=>{if(mounted.current&&version===request.current)setNotice(previous=>({...previous,visible:false}));},2000);
 };
 return {notice,copy};
}
export function CopyFeedback({notice}:{notice:{text:string;visible:boolean;version:number}}){
 return <><span className="copy-feedback" data-visible={notice.visible?'true':'false'} aria-hidden="true">{notice.text}</span><span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{notice.visible&&<span key={notice.version}>{notice.text}</span>}</span></>;
}
