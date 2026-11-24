import * as THREE from 'three';
import { boxGeometryWorldUV } from './materials.js';

// Building shells, real portals, circulation aisles, functional lighting and doors.
// Both existing district builders support the same box() interface.
export function buildInterior(D,x,z,w,d,h,m,colliders,interactive,dynamic,lights,kind='service'){
  const T=.42, front=z+d/2,back=z-d/2, left=x-w/2,right=x+w/2;
  const portal=Math.min(12,w*.32), sidePortal=Math.min(5,d*.3), sideCenter=z;
  const b=(X,Y,Z,W,H,L,M=m.cladding)=>D.box(X,Y,Z,W,H,L,M);
  const solid=(X,Z,W,L,H,base=0)=>{
    const c={minX:X-W/2,maxX:X+W/2,minZ:Z-L/2,maxZ:Z+L/2,height:base+H,base};
    colliders.push(c);return c;
  };
  const wall=(X,Z,W,L,H)=>{b(X,H/2+.12,Z,W,H,L);solid(X,Z,W,L,H);};
  b(x,.08,z,w,.16,d,m.concrete);
  b(x,h+.3,z,w+1.2,.6,d+1.2,m.roof);
  wall(x,back,w,T,h);
  wall((left+x-portal/2)/2,front,(w-portal)/2,T,h);
  wall((right+x+portal/2)/2,front,(w-portal)/2,T,h);
  b(x,(h+8)/2,front,portal,h-8,T);
  for(const X of [left,right]){
    wall(X,(back+sideCenter-sidePortal/2)/2,T,(d-sidePortal)/2,h);
    wall(X,(front+sideCenter+sidePortal/2)/2,T,(d-sidePortal)/2,h);
    b(X,(h+3.8)/2,sideCenter,T,h-3.8,sidePortal);
    b(X,3.8,sideCenter,T+.22,.24,sidePortal+.4,m.yellow);
    // Fixed open pedestrian exits prevent the powered shutter from trapping the player.
  }
  for(let X=left+3;X<right-2;X+=8){
    for(const Z of [back+1,front-1]){
      if(Z===front-1&&Math.abs(X-x)<portal/2+1)continue;
      b(X,h/2,Z,.42,h,.48,m.rust);
      b(X,.2,Z,1.0,.4,1.1,m.concrete);
      solid(X,Z,.45,.5,h);
      b(X,h-2.1,Z,4,1.25,.10,m.glass);
    }
    b(X,h-.75,z,.36,.56,d-1.3,m.metal);
  }
  for(const X of [x-portal/2-.3,x+portal/2+.3]){
    b(X,4,front+.23,.48,8,.55,m.yellow);
    b(X,8.15,front+.2,.65,.44,.7,m.metal);
  }
  b(x,8.3,front+.15,portal+1.1,.45,.72,m.metal);
  const shutter=new THREE.Group();shutter.position.set(x,8.25,front+.13);
  const gateMaterial=m.rust;
  for(let row=0;row<16;row++){
    const slab=new THREE.Mesh(new THREE.BoxGeometry(portal-.2,.47,.27),gateMaterial);
    slab.position.y=-7.75+row*.48;slab.castShadow=true;slab.receiveShadow=true;slab.visible=false;shutter.add(slab);
  }
  // Door is initially open; the panels are physically carried above the entrance.
  shutter.position.y=16.25;D.group.add(shutter);
  const gate=solid(x,front,portal,.7,8);
  gate.base=8;gate.height=8.4;gate.door=true;
  let open=true,doorY=16.25;
  const buttonX=x+portal/2+1.4, buttonZ=front+1.15;
  b(buttonX,1.05,buttonZ,.58,2.1,.48,m.dark);
  b(buttonX,1.7,buttonZ+.26,.32,.24,.06,m.light);
  interactive.push({x:buttonX,z:buttonZ+1.0,r:3.2,label:'E · ROLLER SHUTTER',activate:()=>{
    open=!open;return open?'SHUTTER OPENING':'SHUTTER CLOSING';
  }});
  let previous=0;
  dynamic.push((t)=>{
    const dt=Math.min(.06,Math.max(0,t-previous));previous=t;
    doorY+=Math.sign((open?16.25:8.25)-doorY)*Math.min(Math.abs((open?16.25:8.25)-doorY),dt*3.6);
    shutter.position.y=doorY;gate.base=Math.max(0,doorY-8.25);gate.height=8.4;
    for(const slab of shutter.children)slab.visible=doorY+slab.position.y<8.15;
  });
  // Two service aisles along the side walls, wide unobstructed central aisle.
  for(const side of [-1,1]){
    const X=x+side*(w*.32);
    const count=Math.max(2,Math.floor((d-12)/8));
    for(let i=0;i<count;i++){
      const Z=back+6+i*(d-12)/Math.max(1,count-1);
      if(Math.abs(Z-z)<4.5)continue;
      const width=Math.min(4.8,w*.16);
      if(kind==='control'){
        b(X,.95,Z,width,1.9,2.15,m.dark);
        b(X,1.94,Z,width+.2,.14,2.4,m.metal);
        for(let j=0;j<3;j++){
          b(X+(j-1)*width*.28,2.28,Z-.57,.76,.54,.18,m.glass);
          b(X+(j-1)*width*.28,1.99,Z+.48,.24,.05,.20,m.yellow);
        }
        solid(X,Z,width,2.2,2.6);
      }else if(i%3===0){
        b(X,.75,Z,width,1.5,3.1,m.rust);
        b(X,1.54,Z,width+.25,.18,3.3,m.metal);
        b(X,2.15,Z,width*.65,1.05,2.0,m.blue);
        b(X,2.78,Z,.75,.26,.8,m.rail);
        solid(X,Z,width+.2,3.3,2.9);
      }else if(i%3===1){
        for(const a of [-1,1])for(const q of [-1,1])b(X+a*width*.46,2,Z+q*1.0,.13,4,.13,m.rust);
        for(const Y of [.18,1.75,3.25]){
          b(X,Y,Z,width,.13,2.2,m.metal);
          for(let j=0;j<3;j++)b(X+(j-1)*width*.28,Y+.45,Z,width*.24,.8,1.65,j%2?m.yellow:m.dark);
        }
        solid(X,Z,width,2.25,4);
      }else{
        b(X,.2,Z,width,.4,2.9,m.concrete);
        b(X,1.2,Z,width*.9,1.9,2.5,m.blue);
        for(let j=0;j<8;j++)b(X-width*.38+j*width*.105,1.1,Z+1.29,.07,1.5,.11,m.metal);
        b(X,2.32,Z,.55,.35,.8,m.yellow);solid(X,Z,width,2.9,2.55);
      }
    }
  }
  for(let Z=back+4;Z<front-2;Z+=10){
    for(const s of [-1,1]){
      const X=x+s*portal*.57;
      b(X,.17,Z, .10,.02,5,m.yellow);
      const ly=Math.min(h-1.6,7.5);
      b(X,ly,Z,2.7,.18,.7,m.metal);b(X,ly-.12,Z,2.5,.08,.55,m.light);
      lights.push({x:X,y:ly-.30,z:Z,power:120,range:27,indoor:true});
      b(X,(ly+h)/2,Z,.10,h-ly,.1,m.metal);
    }
  }
  // Utility duct and cable tray suspended safely above the walking route.
  b(x,h-2.1,z,1.6,.6,d-4,m.metal);
  for(let Z=back+3;Z<front-2;Z+=4){
    b(x,h-1.7,Z,1.8,.12,.14,m.rust);
  }
  lights.push({x:buttonX,y:3.0,z:buttonZ+1,power:70,range:17,indoor:true});
}

export function createPlantLighting(scene,world){
  const sources=world.lightSources||[];
  // Stable number of active point lights; no shader recompilation when travelling.
  const pool=Array.from({length:6},()=>{
    const l=new THREE.PointLight(0xffbe83,0,60,2);scene.add(l);return l;
  });
  let chosen=[],next=0;
  return function update(t,camera,weather,quality,threat){
    if(t>=next){
      next=t+.22;
      chosen=sources.map(p=>({p,d:(p.x-camera.position.x)**2+(p.z-camera.position.z)**2+(.5*(p.y-camera.position.y))**2}))
        .filter(v=>v.d<155**2&&(weather===3||v.p.indoor)).sort((a,b)=>a.d-b.d).slice(0,quality===0?3:6).map(v=>v.p);
    }
    pool.forEach((l,i)=>{
      const p=chosen[i];
      if(!p){l.intensity=0;return;}
      l.position.set(p.x,p.y,p.z);l.distance=p.range||65;
      l.color.setHex(p.indoor?0xffdec1:0xffb879);
      const fade=weather===3?1:p.indoor?.65:0;
      const flicker=weather===3&&threat>.5?1-threat*.23*Math.max(0,Math.sin(t*4+i*1.7)):1;
      l.intensity=p.power*fade*flicker;
    });
  };
}

export function createIndustrialAudio(){
  let ctx,master,noise,drone,droneGain,windGain,windFilter,muted=false,stepDistance=0,lastX=0,lastZ=0,ready=false;
  function init(){
    if(!ctx){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      try{
        ctx=new AC();master=ctx.createGain();master.gain.value=.22;master.connect(ctx.destination);
        noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
        const arr=noise.getChannelData(0);let prev=0;
        for(let i=0;i<arr.length;i++){prev=(prev+.12*(Math.random()*2-1))*.94;arr[i]=prev*3;}
        const wind=ctx.createBufferSource();wind.buffer=noise;wind.loop=true;
        windFilter=ctx.createBiquadFilter();windFilter.type='lowpass';windFilter.frequency.value=700;
        windGain=ctx.createGain();windGain.gain.value=0;wind.connect(windFilter);windFilter.connect(windGain);windGain.connect(master);wind.start();
        drone=ctx.createOscillator();drone.type='triangle';drone.frequency.value=47;
        droneGain=ctx.createGain();droneGain.gain.value=0;drone.connect(droneGain);droneGain.connect(master);drone.start();
      }catch(e){return;}
    }
    if(ctx?.state==='suspended')ctx.resume().catch(()=>{});
  }
  function sound(level,frequency,duration=.17){
    if(!ctx||ctx.state!=='running'||muted||!noise||!master)return;
    const t=ctx.currentTime,src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    src.buffer=noise;f.type='bandpass';f.frequency.value=frequency;f.Q.value=.8;
    src.connect(f);f.connect(g);g.connect(master);
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(level,t+.012);
    g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    src.start(t,Math.random()*.9);src.stop(t+duration+.02);
  }
  function update(player,weather,hidden,dt){
    if(!ready){lastX=player.x;lastZ=player.z;ready=true;}
    const distance=Math.hypot(player.x-lastX,player.z-lastZ);
    lastX=player.x;lastZ=player.z;
    if(distance<2.5&&player.grounded&&!player.fly&&!hidden){
      stepDistance+=distance;
      const stride=player.sprinting?2.05:1.38;
      if(stepDistance>stride){stepDistance%=stride;sound(player.sprinting?.35:.21,player.crouching?190:530);}
    }else if(distance>10)stepDistance=0;
    if(ctx?.state==='running'&&windGain&&droneGain){
      windGain.gain.setTargetAtTime(hidden?.015:weather===1?.24:weather===3?.065:.095,ctx.currentTime,.25);
      windFilter.frequency.setTargetAtTime(weather===1?1250:460,ctx.currentTime,.3);
      droneGain.gain.setTargetAtTime(hidden?.02:weather===3?.035:.07,ctx.currentTime,.4);
    }
  }
  function toggle(){muted=!muted;if(master&&ctx)master.gain.setTargetAtTime(muted?0:.22,ctx.currentTime,.05);if(!muted)init();return !muted;}
  return {init,update,toggle,click:()=>sound(.22,1300,.2)};
}
