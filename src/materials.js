import * as THREE from 'three';

// All tileable textures are generated on the device. No image/CDN requests.
// UVs use ABSOLUTE metres, so slabs and neighbouring facades share a grid.
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const fract = v => v-Math.floor(v);
const hash = (x,y,s=1) => fract(Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453123);

function texturePair(kind){
  const n=256, canvas=document.createElement('canvas'),normal=document.createElement('canvas');
  canvas.width=canvas.height=normal.width=normal.height=n;
  const ctx=canvas.getContext('2d'),nctx=normal.getContext('2d');
  const img=ctx.createImageData(n,n), nimg=nctx.createImageData(n,n);
  const gray=new Float32Array(n*n);
  const palettes={
    concrete:[132,135,129], asphalt:[57,61,64], cladding:[108,120,126],
    roof:[67,75,78], rust:[112,76,58], metal:[130,139,140],
    dirt:[95,85,70], gravel:[115,111,99], yellow:[177,119,36]
  };
  const base=palettes[kind]||palettes.concrete;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const i=y*n+x, k=i*4, nois=(hash(x,y,2)-.5)*34;
    const low=Math.sin(x*6.283185/n*3)*Math.cos(y*6.283185/n*2)*5;
    let v=nois+low;
    const joints=(x%64===0||y%64===0);
    if(kind==='concrete'){v+=(joints?-34:0);v+=(hash(Math.floor(x/64),Math.floor(y/64),3)-.5)*10;}
    if(kind==='asphalt'){v+=(hash(Math.floor(x/2),Math.floor(y/2),8)-.5)*19;}
    if(kind==='cladding'||kind==='roof'){let rib=Math.abs(Math.sin(x*Math.PI/14));v+=rib*18-(x%28<2?24:0);v+=Math.sin(y*.15)*2;}
    if(kind==='rust'){let run=Math.sin(x*.16+Math.sin(y*.018)*5);v+=run*17;v+=Math.sin(y*.09+x*.2)*5;}
    if(kind==='metal'){v+=Math.sin(y*.4)*3+(x%48<2?-21:0);}
    if(kind==='dirt'||kind==='gravel'){v+=(hash(x*.8|0,y*.8|0,12)-.5)*22;}
    gray[i]=v;
    const stain=(kind==='rust'||kind==='dirt')?Math.max(0,Math.sin(x*.1+y*.015))*10:0;
    img.data[k]=clamp(base[0]+v+stain,0,255);
    img.data[k+1]=clamp(base[1]+v*.85,0,255);
    img.data[k+2]=clamp(base[2]+v*.78-stain*.4,0,255);
    img.data[k+3]=255;
  }
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const v=gray[y*n+x],gx=gray[y*n+((x+1)%n)]-gray[y*n+((x+n-1)%n)];
    const gy=gray[((y+1)%n)*n+x]-gray[((y+n-1)%n)*n+x];
    const s=kind==='cladding'?.050:.026;
    let nx=-gx*s,ny=-gy*s,nz=1,l=Math.hypot(nx,ny,nz), k=(y*n+x)*4;
    nimg.data[k]=(nx/l*.5+.5)*255;
    nimg.data[k+1]=(ny/l*.5+.5)*255;
    nimg.data[k+2]=(nz/l*.5+.5)*255;
    nimg.data[k+3]=255;
  }
  ctx.putImageData(img,0,0);nctx.putImageData(nimg,0,0);
  const colorTex=new THREE.CanvasTexture(canvas),normalTex=new THREE.CanvasTexture(normal);
  for(const t of [colorTex,normalTex]){
    t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.minFilter=THREE.LinearMipmapLinearFilter;
    t.magFilter=THREE.LinearFilter;
    t.anisotropy=4;
  }
  colorTex.colorSpace=THREE.SRGBColorSpace;
  return [colorTex,normalTex];
}

export function createMaterials(){
  const out={};
  const make=(name,roughness,metalness=.0)=>{
    const [map,normalMap]=texturePair(name);
    return new THREE.MeshStandardMaterial({map,normalMap,normalScale:new THREE.Vector2(.25,.25),roughness,metalness});
  };
  out.concrete=make('concrete',.95);
  out.asphalt=make('asphalt',.97);
  out.cladding=make('cladding',.71,.48);
  out.roof=make('roof',.82,.45);
  out.rust=make('rust',.88,.52);
  out.metal=make('metal',.43,.76);
  out.dirt=make('dirt',1);
  out.gravel=make('gravel',.97);
  out.yellow=make('yellow',.7,.35);
  const solid=(color,roughness=.75,metalness=.25,extra={})=>
    new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
  out.dark=solid('#262d30',.67,.6);
  out.pipe=solid('#59666a',.54,.69);
  out.blue=solid('#477485',.58,.54);
  out.red=solid('#915039',.76,.4);
  out.white=solid('#c6cfcb',.75,.24);
  out.glass=solid('#152632',.19,.35);
  out.belt=solid('#161a1c',.88,.1);
  out.coal=solid('#292827',.98,.05);
  out.ore=solid('#65402e',.98,.02);
  out.slag=solid('#43413e',.97,.1);
  out.water=solid('#2c5260',.28,.4);
  out.grass=solid('#39483e',.97,.02);
  out.light=solid('#f2b46d',.48,.08,{emissive:'#e56822',emissiveIntensity:1.9});
  out.hot=solid('#ffac53',.32,.1,{emissive:'#ff4d0a',emissiveIntensity:3.7});
  out.rail=solid('#737576',.32,.85);
  return out;
}

export function boxGeometryWorldUV(x,y,z,w,h,d,tile=4){
  const g=new THREE.BoxGeometry(w,h,d);
  const uv=g.attributes.uv,p=g.attributes.position,n=g.attributes.normal;
  for(let i=0;i<p.count;i++){
    const X=x+p.getX(i),Y=y+p.getY(i),Z=z+p.getZ(i);
    const nx=n.getX(i),ny=n.getY(i);
    if(Math.abs(ny)>.5) uv.setXY(i,X/tile,Z/tile);
    else if(Math.abs(nx)>.5) uv.setXY(i,Z/tile,Y/tile);
    else uv.setXY(i,X/tile,Y/tile);
  }
  uv.needsUpdate=true;
  g.translate(x,y,z);
  return g;
}
