/* Sprite Foundry v0.1 — binary formats and pixel operations.
   No third-party runtime dependencies. GIF89a / PNG / ZIP implementations. */
(function(root){
'use strict';
const LIMITS={fileBytes:150*1024*1024,zipBytes:500*1024*1024,frames:600,pixels:16777216,totalPixels:250000000};
const te=new TextEncoder(),td=new TextDecoder();
function assert(v,m){if(!v)throw new Error(m);}
function concat(parts){const n=parts.reduce((a,b)=>a+b.length,0),out=new Uint8Array(n);let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
const crcTable=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0;}
function crc32(a){let c=0xffffffff;for(let i=0;i<a.length;i++)c=crcTable[(c^a[i])&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function be32(n){const a=new Uint8Array(4);new DataView(a.buffer).setUint32(0,n);return a;}
function chunk(type,data){const t=te.encode(type),out=new Uint8Array(data.length+12),v=new DataView(out.buffer);v.setUint32(0,data.length);out.set(t,4);out.set(data,8);v.setUint32(data.length+8,crc32(out.subarray(4,data.length+8)));return out;}
function parseGIF(buf){
 const a=buf instanceof Uint8Array?buf:new Uint8Array(buf);assert(a.length>=13,'This file is too short to be a GIF.');
 const signature=td.decode(a.subarray(0,6));assert(signature==='GIF87a'||signature==='GIF89a','The file is not an animated GIF. A .gif filename can still contain a flattened PNG; try the original GIF in a ZIP.');
 let p=6;function u8(){assert(p<a.length,'Truncated GIF data.');return a[p++];}function u16(){return u8()|(u8()<<8);}function take(n){assert(p+n<=a.length,'Truncated GIF block.');const b=a.subarray(p,p+n);p+=n;return b;}
 function sub(){const parts=[];let n;while((n=u8()))parts.push(take(n));return concat(parts);}
 const width=u16(),height=u16();assert(width&&height&&width*height<=LIMITS.pixels,'GIF dimensions exceed the 16-megapixel per-frame limit.');
 const packed=u8(),background=u8();u8();const gct=packed&128?take(3*(1<<((packed&7)+1))):null;
 const frames=[];let gce={delay:100,originalDelay:0,disposal:0,transparent:-1},loop=null,trailer=false;
 while(p<a.length){const tag=u8();if(tag===0x3b){trailer=true;break;}
  if(tag===0x21){const label=u8();if(label===0xf9){assert(u8()===4,'Invalid GIF control block.');const flags=u8(),delay=u16()*10,ti=u8();assert(u8()===0,'Invalid GIF control terminator.');gce={delay:delay>0?delay:100,originalDelay:delay,disposal:(flags>>2)&7,transparent:flags&1?ti:-1};}
   else if(label===0xff){const id=td.decode(take(u8())),data=sub();if((id==='NETSCAPE2.0'||id==='ANIMEXTS1.0')&&data.length>=3&&data[0]===1)loop=data[1]|(data[2]<<8);}
   else {sub();if(label===0x01)gce={delay:100,originalDelay:0,disposal:0,transparent:-1};}
  }else if(tag===0x2c){const left=u16(),top=u16(),w=u16(),h=u16(),flags=u8(),palette=flags&128?take(3*(1<<((flags&7)+1))):gct;assert(w&&h&&left+w<=width&&top+h<=height,'A GIF frame extends outside its logical canvas.');assert(palette,'GIF frame has no color palette.');const minCode=u8(),data=sub();assert(minCode>=2&&minCode<=8,'Unsupported GIF LZW code size.');frames.push({...gce,left,top,width:w,height:h,interlace:!!(flags&64),palette,minCode,data});gce={delay:100,originalDelay:0,disposal:0,transparent:-1};assert(frames.length<=LIMITS.frames&&frames.length*width*height<=LIMITS.totalPixels,'This animation is too large for the browser safety limit (600 frames / 250 million total pixels).');}
  else if(tag!==0)throw new Error('Unknown GIF block. The file may be damaged.');
 }
 assert(trailer&&frames.length,'GIF is incomplete or has no image frames.');return {width,height,background,gct,frames,loop,hasTransparency:frames.some(f=>f.transparent>=0)};
}
function lzw(minCode,data,count){
 const clear=1<<minCode,end=clear+1,prefix=new Uint16Array(4096),suffix=new Uint8Array(4096),stack=new Uint8Array(4097),out=new Uint8Array(count);
 for(let i=0;i<clear;i++)suffix[i]=i;
 let size=minCode+1,available=clear+2,old=-1,first=0,bit=0,at=0,ended=false;
 while(bit+size<=data.length*8){let code=0;for(let j=0;j<size;j++)code|=((data[(bit+j)>>3]>>((bit+j)&7))&1)<<j;bit+=size;
  if(code===clear){size=minCode+1;available=clear+2;old=-1;continue;}if(code===end){ended=true;break;}
  if(old<0){assert(code<clear,'Invalid first LZW code.');assert(at<count,'Too many pixels in GIF.');out[at++]=code;old=code;first=code;continue;}
  const input=code;let n=0;if(code===available){stack[n++]=first;code=old;}else assert(code<available,'Invalid GIF LZW dictionary index.');
  while(code>=clear){assert(code<available&&n<4096,'Invalid GIF LZW chain.');stack[n++]=suffix[code];code=prefix[code];}
  first=suffix[code];stack[n++]=first;while(n){assert(at<count,'Too many pixels in GIF image block.');out[at++]=stack[--n];}
  if(available<4096){prefix[available]=old;suffix[available]=first;available++;if(available===(1<<size)&&size<12)size++;}old=input;
 }
 assert(at===count,'Incomplete GIF pixel data.');return out;
}
function gifCompositor(gif){
 const {width:w,height:h}=gif;let rgba=new Uint8ClampedArray(w*h*4),previous=null,restore=null;
 const bg=(!gif.hasTransparency&&gif.gct)?[...gif.gct.subarray(gif.background*3,gif.background*3+3),255]:[0,0,0,0];
 function clear(f){for(let y=f.top;y<f.top+f.height;y++)for(let x=f.left;x<f.left+f.width;x++){const k=(y*w+x)*4;rgba[k]=bg[0];rgba[k+1]=bg[1];rgba[k+2]=bg[2];rgba[k+3]=bg[3];}}
 clear({left:0,top:0,width:w,height:h});
 return function next(i){const f=gif.frames[i];if(previous){if(previous.disposal===2)clear(previous);else if(previous.disposal===3&&restore)rgba.set(restore);}
  restore=f.disposal===3?rgba.slice():null;const pix=lzw(f.minCode,f.data,f.width*f.height);let src=0;
  function row(y){for(let x=0;x<f.width;x++){const c=pix[src++];if(c===f.transparent)continue;const ci=c*3;assert(ci+2<f.palette.length,'GIF palette index out of range.');const k=((y+f.top)*w+x+f.left)*4;rgba[k]=f.palette[ci];rgba[k+1]=f.palette[ci+1];rgba[k+2]=f.palette[ci+2];rgba[k+3]=255;}}
  if(f.interlace){for(const [start,step]of [[0,8],[4,8],[2,4],[1,2]])for(let y=start;y<f.height;y+=step)row(y);}else for(let y=0;y<f.height;y++)row(y);
  previous=f;return rgba;
 };
}
function bounds(data,w,h){let minX=w,minY=h,maxX=-1,maxY=-1,count=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]){count++;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}return count?{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,count}:null;}
function components(data,w,h,minIsland=0,largestOnly=false){
 const n=w*h,seen=new Uint8Array(n),queue=new Int32Array(n),small=Math.max(0,minIsland);let maxCount=0,largest=null,largestPixels=null,largestAlpha=null,removed=0,removedComponents=0,totalComponents=0;
 for(let s=0;s<n;s++){if(seen[s]||!data[s*4+3])continue;let head=0,tail=1;queue[0]=s;seen[s]=1;let minX=w,maxX=0,minY=h,maxY=0;
  while(head<tail){const i=queue[head++],y=Math.floor(i/w),x=i-y*w;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
   for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++){const j=yy*w+xx;if(!seen[j]&&data[j*4+3]){seen[j]=1;queue[tail++]=j;}}
  }
  totalComponents++;if(tail>maxCount){maxCount=tail;largest={x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,count:tail};if(largestOnly){largestPixels=queue.slice(0,tail);largestAlpha=Uint8Array.from(largestPixels,i=>data[i*4+3]);}}
  if(small&&tail<=small){for(let j=0;j<tail;j++)data[queue[j]*4+3]=0;removed+=tail;removedComponents++;}
 }
 if(largestOnly&&largestPixels){let before=0;for(let i=0;i<n;i++)if(data[i*4+3])before++;for(let i=0;i<n;i++)data[i*4+3]=0;for(let j=0;j<largestPixels.length;j++)data[largestPixels[j]*4+3]=largestAlpha[j];removed+=Math.max(0,before-largestPixels.length);removedComponents=totalComponents-1;}
 if(maxCount<=small&&!largestOnly)largest=null;
 return {subject:largest,removedPixels:removed,removedComponents,totalComponents};
}
function cleanPixels(input,w,h,settings){
 const d=new Uint8ClampedArray(input),n=w*h;let removedAlpha=0;
 for(let i=0;i<n;i++){const p=i*4;if(d[p+3]&&d[p+3]<settings.alpha){d[p+3]=0;removedAlpha++;}}
 // Keying is opt-in and restricted to the transparent boundary / outer image edge when requested.
 if(settings.keyEnabled){const c=settings.keyColor||'#00ff00',r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16),t=settings.keyTolerance*settings.keyTolerance;
  const matches=i=>{const p=i*4;return !d[p+3]||((d[p]-r)**2+(d[p+1]-g)**2+(d[p+2]-b)**2<=t);};
  if(settings.keyBorder){const seen=new Uint8Array(n),q=new Int32Array(n);let head=0,tail=0;function add(i){if(!seen[i]&&matches(i)){seen[i]=1;q[tail++]=i;}}
   for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
   while(head<tail){const i=q[head++],x=i%w,y=Math.floor(i/w);if(d[i*4+3])removedAlpha++;d[i*4+3]=0;if(x)add(i-1);if(x+1<w)add(i+1);if(y)add(i-w);if(y+1<h)add(i+w);}
  }else for(let i=0;i<n;i++)if(d[i*4+3]&&matches(i)){d[i*4+3]=0;removedAlpha++;}
 }
 for(let step=0;step<(settings.erode||0);step++){const alpha=new Uint8Array(n);for(let i=0;i<n;i++)alpha[i]=d[i*4+3];for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(!alpha[i])continue;let a=alpha[i];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;a=Math.min(a,xx<0||xx>=w||yy<0||yy>=h?0:alpha[yy*w+xx]);}if(a<d[i*4+3])removedAlpha++;d[i*4+3]=a;}}
 const result=components(d,w,h,settings.islands||0,!!settings.largestOnly);result.removedPixels+=removedAlpha;
 for(let i=0;i<n;i++)if(!d[i*4+3]){d[i*4]=d[i*4+1]=d[i*4+2]=0;}
 return {pixels:d,...result,box:bounds(d,w,h)};
}
async function unzip(buffer,accept=()=>true){
 const a=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer),v=new DataView(a.buffer,a.byteOffset,a.byteLength);let e=-1;
 for(let p=a.length-22;p>=Math.max(0,a.length-65557);p--)if(v.getUint32(p,true)===0x06054b50&&p+22+v.getUint16(p+20,true)===a.length){e=p;break;}
 assert(e>=0,'This ZIP is damaged or unsupported.');assert(v.getUint16(e+4,true)===0&&v.getUint16(e+6,true)===0,'Split ZIP archives are not supported.');const count=v.getUint16(e+10,true);let p=v.getUint32(e+16,true);assert(count!==65535&&count<=4096,'ZIP64 or extremely large archives are not supported.');const result=[];let total=0;
 for(let i=0;i<count;i++){assert(p+46<=a.length&&v.getUint32(p,true)===0x02014b50,'Invalid ZIP directory.');const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),crc=v.getUint32(p+16,true),compressed=v.getUint32(p+20,true),size=v.getUint32(p+24,true),nl=v.getUint16(p+28,true),xl=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),offset=v.getUint32(p+42,true);assert(p+46+nl+xl+cl<=a.length,'Truncated ZIP directory.');const name=td.decode(a.subarray(p+46,p+46+nl));p+=46+nl+xl+cl;
  if(name.endsWith('/')||name.startsWith('__MACOSX/')||!accept(name))continue;
  assert(!name.split(/[\\/]/).includes('..')&&!/^[/\\]/.test(name),'Unsafe path in ZIP archive.');assert(!(flags&1),'Password-protected ZIP files are not supported.');assert(size!==0xffffffff&&compressed!==0xffffffff,'ZIP64 is not supported.');total+=size;assert(total<=LIMITS.zipBytes,'Expanded ZIP exceeds the 500 MB safety limit.');assert(offset+30<=a.length&&v.getUint32(offset,true)===0x04034b50,'Invalid ZIP file entry.');const start=offset+30+v.getUint16(offset+26,true)+v.getUint16(offset+28,true);assert(start+compressed<=a.length,'Truncated ZIP content.');const encoded=a.subarray(start,start+compressed);let bytes;
  if(method===0)bytes=encoded.slice();else if(method===8){assert(typeof DecompressionStream!=='undefined','ZIP import requires a current Chrome or Edge browser.');const reader=new Blob([encoded]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(),parts=[];let got=0;while(true){const {done,value}=await reader.read();if(done)break;got+=value.length;if(got>size||got>LIMITS.zipBytes){await reader.cancel();throw new Error('ZIP expands beyond its declared size.');}parts.push(value);}bytes=concat(parts);}else throw new Error('Unsupported ZIP compression method; use a standard ZIP.');
  assert(bytes.length===size&&crc32(bytes)===crc,'ZIP integrity check failed: '+name);result.push({name,bytes});
 }return result;
}
async function zip(files){
 const parts=[],central=[];let offset=0,total=0;assert(files.length<65535,'Too many ZIP entries.');for(const file of files){const name=te.encode(file.name),data=file.bytes||new Uint8Array(await file.blob.arrayBuffer());total+=data.length;assert(total<=LIMITS.zipBytes,'Export exceeds the 500 MB safety limit.');const crc=crc32(data),head=new Uint8Array(30+name.length),v=new DataView(head.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,0x21,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);head.set(name,30);parts.push(head,data);
  const c=new Uint8Array(46+name.length),cv=new DataView(c.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint16(14,0x21,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);c.set(name,46);central.push(c);offset+=head.length+data.length;
 }
 const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,central.reduce((n,a)=>n+a.length,0),true);ev.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/zip'});
}
function pngParts(a){const v=new DataView(a.buffer,a.byteOffset,a.byteLength);assert(a[0]===137&&td.decode(a.subarray(1,4))==='PNG','Invalid PNG frame.');const parts=[];let p=8;while(p+12<=a.length){const len=v.getUint32(p),type=td.decode(a.subarray(p+4,p+8));assert(p+12+len<=a.length,'Truncated PNG.');parts.push({type,data:a.slice(p+8,p+8+len)});p+=len+12;if(type==='IEND')break;}return parts;}
async function apng(frames,delays,loop=true,onProgress=()=>{}){
 assert(frames.length>0,'No frames to export.');const pieces=[new Uint8Array([137,80,78,71,13,10,26,10])];let header=null,seq=0;
 for(let i=0;i<frames.length;i++){const parts=pngParts(new Uint8Array(await frames[i].arrayBuffer())),ihdr=parts.find(p=>p.type==='IHDR').data;
  if(!header){header=ihdr;assert(ihdr[8]===8&&ihdr[9]===6,'APNG export requires RGBA canvas PNGs.');pieces.push(chunk('IHDR',header),chunk('acTL',concat([be32(frames.length),be32(loop?0:1)])));}else assert(header.every((b,k)=>b===ihdr[k]),'Animation frames have inconsistent dimensions or pixel formats.');
  const fc=new Uint8Array(26),f=new DataView(fc.buffer);f.setUint32(0,seq++);fc.set(header.subarray(0,8),4);let ms=Math.max(1,Math.round(delays[i])),dn=1000,nn=ms;const gcd=(a,b)=>b?gcd(b,a%b):a,g=gcd(nn,dn);nn/=g;dn/=g;if(nn>65535){dn=Math.max(1,Math.floor(65535000/ms));nn=Math.round(ms*dn/1000);}f.setUint16(20,Math.min(65535,nn));f.setUint16(22,dn);fc[24]=0;fc[25]=0;pieces.push(chunk('fcTL',fc));for(const p of parts)if(p.type==='IDAT')pieces.push(i===0?chunk('IDAT',p.data):chunk('fdAT',concat([be32(seq++),p.data])));onProgress(i+1,frames.length);
 }pieces.push(chunk('IEND',new Uint8Array()));return new Blob(pieces,{type:'image/png'});
}
const api={LIMITS,assert,concat,crc32,parseGIF,lzw,gifCompositor,bounds,components,cleanPixels,unzip,zip,apng};root.SFCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof self!=='undefined'?self:globalThis);
