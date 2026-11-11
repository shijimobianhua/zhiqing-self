export function lockMenuScroll(){
 const y=window.scrollY,x=window.scrollX,body=document.body,html=document.documentElement;
 const keys=['position','top','left','right','width','overflow'] as const;
 const old=Object.fromEntries(keys.map(k=>[k,body.style[k]]));let released=false;
 Object.assign(body.style,{position:'fixed',top:`-${y}px`,left:`-${x}px`,right:'0',width:'100%',overflow:'hidden'});
 return()=>{if(released)return;released=true;for(const key of keys)body.style[key]=old[key];const behavior=html.style.scrollBehavior;html.style.scrollBehavior='auto';window.scrollTo({left:x,top:y,behavior:'instant'});html.style.scrollBehavior=behavior;};
}
