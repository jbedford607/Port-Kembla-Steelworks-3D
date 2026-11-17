import * as THREE from 'three';

// FURNACE WATCHER — self-contained nighttime horror behaviour and synthesis.
// No recordings, external audio files, network requests or heavy physics engine.
export function createFurnaceWatcher(scene, world, camera, opts={}) {
  const aabb=world.colliders;
  const state={night:false,phase:'dormant',time:0,phaseTime:0,pressure:0,
    seenFor:0,unseenFor:0,stuckFor:0,repath:0,hideFor:0,footclock:0,
    cooldown:0,captureTime:0,strobe:0,mute:false,master:.58,
    seenRecently:false,ready:false,goal:[],targetIndex:0,
    lastX:0,lastZ:0,nextFright:0,nearMiss:0,lostSight:0,stun:0,flareCooldown:0,
    lastTargetX:0,lastTargetZ:0,ambientClock:8,heartbeatClock:0,hiddenFor:0};
  const root=new THREE.Group();
  root.visible=false;root.name='FURNACE WATCHER';
  scene.add(root);

  const charMat=new THREE.MeshStandardMaterial({color:0x13191a,metalness:.80,roughness:.55});
  const shadowMat=new THREE.MeshStandardMaterial({color:0x090d10,metalness:.54,roughness:.9});
  const seamMat=new THREE.MeshStandardMaterial({color:0x5e3627,metalness:.66,roughness:.6});
  const eyeMat=new THREE.MeshStandardMaterial({
    color:0xff941e,emissive:0xff4603,emissiveIntensity:3.7,metalness:.10,roughness:.2
  });
  const emberMat=new THREE.MeshStandardMaterial({
    color:0x8e3213,emissive:0xff4d06,emissiveIntensity:1.2,metalness:.4,roughness:.55
  });
  const joint=new THREE.SphereGeometry(1,8,6);
  function part(parent,w,h,d,mat,x,y,z,angle=0){
    const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    o.position.set(x,y,z);o.rotation.z=angle;o.castShadow=true;parent.add(o);return o;
  }
  function node(parent,px,py,pz,mat,r=.4){
    const o=new THREE.Mesh(joint,mat);
    o.position.set(px,py,pz);o.scale.setScalar(r);o.castShadow=true;parent.add(o);return o;
  }
  // Industrial thin frame, wired ribs, asymmetry and a long angled jaw.
  const torso=new THREE.Group();torso.position.y=4.35;root.add(torso);
  part(torso,1.22,2.55,.72,charMat,0,-.13,0,-.035);
  part(torso,.92,1.15,.85,shadowMat,.05,-1.14,.07,-.08);
  for(let i=0;i<5;i++) {
    const y=.80-i*.40;
    part(torso,1.29-i*.06,.075,.82,seamMat,0,y,.05,0);
    part(torso,.045,.32,.045,emberMat,Math.sin(i*1.8)*.23,y-.17,.47,0);
  }
  part(torso,.14,2.45,.14,charMat,-.52,-.20,-.37,-.05);
  part(torso,.14,2.45,.14,charMat,.52,-.20,-.37,.05);
  // Head looks like a cast-metal mask instead of a human face.
  const head=new THREE.Group();head.position.set(0,1.55,-.11);torso.add(head);
  part(head,.95,1.08,.75,shadowMat,.02,.18,0,.08);
  part(head,1.08,.27,.90,charMat,0,.73,.04,0);
  part(head,.66,.53,.60,charMat,.04,-.48,.11,.12);
  part(head,.24,.55,.68,charMat,-.28,-.68,.17,-.31);
  part(head,.22,.49,.58,charMat,.32,-.66,.17,.23);
  for(let s of [-1,1]){
    const eye=new THREE.Mesh(new THREE.SphereGeometry(.115,8,7),eyeMat);
    eye.position.set(s*.27,.27,.425);
    eye.scale.set(1.05,.52,.48);head.add(eye);
    part(head,.33,.055,.09,seamMat,s*.25,.05,.45,s*.12);
  }
  for(let i=0;i<5;i++)
    part(head,.055,.30,.06,emberMat,(i-2)*.12,-.49,.449,(i%2-.5)*.16);

  const arms=[],legs=[];
  for(let s of [-1,1]){
    const arm=new THREE.Group();arm.position.set(s*.91,.68,0);torso.add(arm);arms.push(arm);
    node(arm,0,0,0,charMat,.25);
    part(arm,.29,1.77,.31,charMat,s*.08,-.88,0,s*.10);
    node(arm,s*.13,-1.80,0,seamMat,.2);
    part(arm,.27,1.80,.32,shadowMat,s*.20,-2.63,.06,s*.035);
    part(arm,.38,.66,.36,charMat,s*.22,-3.75,.12,s*.09);
    for(let i=0;i<3;i++)part(arm,.045,.55,.06,seamMat,s*(.04+i*.14),-4.20+i*.06,.18,s*.09);

    const leg=new THREE.Group();leg.position.set(s*.37,2.84,0);root.add(leg);legs.push(leg);
    node(leg,0,0,0,charMat,.25);
    part(leg,.34,1.23,.44,charMat,s*.06,-.60,.02,s*.035);
    node(leg,s*.07,-1.22,.01,seamMat,.22);
    part(leg,.29,1.45,.33,shadowMat,s*.12,-1.95,.10,-s*.06);
    part(leg,.39,.21,.87,charMat,s*.15,-2.67,.28);
  }

  // Neck cable loops, back ribs and steam exhaust.
  for(let i=0;i<7;i++){
    const a=i/6*Math.PI, xa=Math.cos(a)*.66;
    part(torso,.075,1.28,.07,i%3?charMat:seamMat,xa,.43-i*.12,-.37,Math.sin(i)*.16);
  }
  const eyeLight=new THREE.PointLight(0xff5e16,2.5,17,2);
  eyeLight.position.set(0,5.95,.60);root.add(eyeLight);
  const smokeCanvas=document.createElement('canvas');
  smokeCanvas.width=smokeCanvas.height=64;
  const sctx=smokeCanvas.getContext('2d');
  const grad=sctx.createRadialGradient(32,32,0,32,32,31);
  grad.addColorStop(0,'rgba(80,95,98,.27)');
  grad.addColorStop(.43,'rgba(51,57,64,.13)');
  grad.addColorStop(1,'rgba(10,16,21,0)');
  sctx.fillStyle=grad;sctx.fillRect(0,0,64,64);
  const smokeTex=new THREE.CanvasTexture(smokeCanvas);
  const smokeMaterial=new THREE.SpriteMaterial({
    map:smokeTex,transparent:true,depthWrite:false,opacity:.54,color:0x52646d
  });
  const smoke=[];
  for(let i=0;i<5;i++){
    const s=new THREE.Sprite(smokeMaterial);
    s.scale.set(3,4,1);root.add(s);smoke.push(s);
  }

  // Minimal UI created here; other game modes aren't affected.
  const hud=document.createElement('div');
  hud.id='furnace-horror-hud';
  hud.innerHTML='<div class="fh-title">NIGHT SHIFT / ANOMALOUS MOVEMENT</div><div class="fh-meter"><i></i></div><div class="fh-state"></div><div class="fh-controls">K · MUTE HORROR AUDIO</div>';
  document.body.append(hud);
  const meter=hud.querySelector('.fh-meter i');
  const phaseLabel=hud.querySelector('.fh-state');
  const audioLabel=hud.querySelector('.fh-controls');
  const flash=document.createElement('div');
  flash.id='furnace-horror-flash';
  flash.innerHTML='<div class="fh-noise"></div><div class="fh-head"><div class="fh-eyes"><i></i><i></i></div><div class="fh-scar"></div><div class="fh-jaw"></div></div><div class="fh-warning">THE FURNACE WATCHER</div>';
  document.body.append(flash);
  const vignette=document.createElement('div');
  vignette.id='furnace-horror-vignette';document.body.append(vignette);
  let audio=null,noiseBuffer=null,humOsc=null,humGain=null,windSource=null,windGain=null,windFilter=null,masterGain=null;
  function initAudio(){
    if(state.mute)return;
    if(!audio){
      const AudioContextType=window.AudioContext||window.webkitAudioContext;
      if(!AudioContextType)return;
      audio=new AudioContextType();
      masterGain=audio.createGain();masterGain.gain.value=.30*state.master;
      masterGain.connect(audio.destination);
      noiseBuffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate);
      const data=noiseBuffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.75;
      humOsc=audio.createOscillator();humOsc.type='sine';humOsc.frequency.value=46;
      humGain=audio.createGain();humGain.gain.value=0;
      humOsc.connect(humGain);humGain.connect(masterGain);humOsc.start();
      windSource=audio.createBufferSource();windSource.buffer=noiseBuffer;windSource.loop=true;
      windFilter=audio.createBiquadFilter();windFilter.type='lowpass';windFilter.frequency.value=380;
      windGain=audio.createGain();windGain.gain.value=0;
      windSource.connect(windFilter);windFilter.connect(windGain);windGain.connect(masterGain);
      windSource.start();
    }
    if(audio.state==='suspended')audio.resume().catch(()=>{});
  }
  function envelope(node,t,peak,duration,attack=.025){
    node.gain.setValueAtTime(.0001,t);
    node.gain.exponentialRampToValueAtTime(Math.max(.001,peak),t+attack);
    node.gain.exponentialRampToValueAtTime(.0001,t+duration);
  }
  function tone(freq,end,dur,level,type='sawtooth',filter=550){
    if(!audio||audio.state!=='running'||state.mute)return;
    const t=audio.currentTime,osc=audio.createOscillator(),g=audio.createGain();
    const f=audio.createBiquadFilter();f.type='lowpass';f.frequency.value=filter;
    osc.type=type;osc.frequency.setValueAtTime(Math.max(14,freq),t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(14,end),t+dur);
    osc.connect(f);f.connect(g);g.connect(masterGain);
    envelope(g,t,level,dur);osc.start(t);osc.stop(t+dur+.05);
  }
  function burst(dur,level,cutoff=650,frequencyEnd=180){
    if(!audio||audio.state!=='running'||state.mute)return;
    const t=audio.currentTime,source=audio.createBufferSource(),f=audio.createBiquadFilter(),g=audio.createGain();
    source.buffer=noiseBuffer;f.type='bandpass';f.frequency.setValueAtTime(cutoff,t);
    f.frequency.exponentialRampToValueAtTime(Math.max(60,frequencyEnd),t+dur);
    f.Q.value=1.7;source.connect(f);f.connect(g);g.connect(masterGain);
    envelope(g,t,level,dur,.009);source.start(t);source.stop(t+dur+.05);
  }
  function fx(kind,distance=15){
    const attenuation=Math.max(.12,1/(1+(distance/28)**2));
    if(kind==='step'){tone(70,31,.16,.13*attenuation,'triangle',210);burst(.16,.055*attenuation,185,75);}
    if(kind==='scrape'){tone(510,120,.85,.10*attenuation,'sawtooth',900);burst(.85,.13*attenuation,960,90);}
    if(kind==='growl'){tone(78,34,1.1,.27*attenuation,'sawtooth',370);burst(1.0,.10*attenuation,400,160);}
    if(kind==='roar'){
      tone(122,38,1.9,.45,'sawtooth',1500);
      tone(52,114,1.7,.39,'square',540);
      burst(1.85,.40,1820,95);
    }
    if(kind==='impact'){
      tone(95,24,1.2,.65,'sawtooth',700);
      tone(760,90,.60,.25,'square',2000);
      burst(1.65,.50,2000,110);
    }
    if(kind==='sting'){tone(680,63,.54,.25,'sawtooth',1450);burst(.50,.20,1300,90);}
    if(kind==='electrical'){burst(.32,.15*attenuation,2200,320);tone(190,65,.26,.12*attenuation,'sawtooth',2400);}
    if(kind==='heartbeat'){tone(72,48,.16,.25*attenuation,'sine',220);tone(87,51,.11,.12*attenuation,'triangle',270);}
    if(kind==='breath'){burst(1.7,.09*attenuation,360,130);tone(60,37,1.6,.09*attenuation,'sine',180);}
    if(kind==='flare'){tone(930,110,.47,.22*attenuation,'sawtooth',1800);burst(.5,.15*attenuation,1900,230);}
    if(kind==='steam'){burst(1.7,.08*attenuation,1500,500);}
  }

  const rand=(a,b)=>a+Math.random()*(b-a);
  const horizontal=(x,z,y,w)=>Math.hypot(x-y,z-w);
  const padded=(x,z,r=1.2)=>{
    for(const c of aabb){
      if(x>c.minX-r&&x<c.maxX+r&&z>c.minZ-r&&z<c.maxZ+r)return true;
    }
    return false;
  };
  // Segment against expanded solid-building AABB. Used for line of sight and movement.
  function blockedSegment(ax,az,bx,bz,r=.7){
    let minT=1.0001;
    const dx=bx-ax,dz=bz-az;
    for(const c of aabb){
      let t0=0,t1=1;
      const x0=c.minX-r,x1=c.maxX+r,z0=c.minZ-r,z1=c.maxZ+r;
      for(const [start,delta,lo,hi] of [[ax,dx,x0,x1],[az,dz,z0,z1]]){
        if(Math.abs(delta)<1e-8){if(start<lo||start>hi){t0=2;break;}}
        else {
          let a=(lo-start)/delta,b=(hi-start)/delta;if(a>b){const tmp=a;a=b;b=tmp;}
          t0=Math.max(t0,a);t1=Math.min(t1,b);
          if(t0>t1)break;
        }
      }
      if(t0<=t1&&t1>=0&&t0<=1)minT=Math.min(minT,t0);
    }
    return minT<=1;
  }
  function posClear(x,z){return !padded(x,z,2.2);}
  function lineClear(x,z,tx,tz){return !blockedSegment(x,z,tx,tz,1.0);}

  // Coarse, bounded A* keeps the entity out of closed halls rather than clipping through them.
  // Calculations run at most ~once per 1.5 seconds.
  const STEP=13,BOUND=1500,offset=Math.floor(BOUND/STEP),limit=2*offset;
  function astar(sx,sz,tx,tz){
    const toGrid=(v)=>Math.max(-offset,Math.min(offset,Math.round(v/STEP)));
    const start=[toGrid(sx),toGrid(sz)],end=[toGrid(tx),toGrid(tz)];
    function nearestFree([gx,gz]){
      for(let radius=0;radius<6;radius++){
        for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
          if(Math.abs(dx)!==radius&&Math.abs(dz)!==radius)continue;
          const px=(gx+dx)*STEP,pz=(gz+dz)*STEP;
          if(Math.abs(px)>BOUND||Math.abs(pz)>BOUND||!posClear(px,pz))continue;
          return [gx+dx,gz+dz];
        }
      }
      return [gx,gz];
    }
    const [sxg,szg]=nearestFree(start),[gx,gz]=nearestFree(end);
    const encode=(x,z)=>(x+offset)*(limit+1)+(z+offset);
    const begin=encode(sxg,szg),dest=encode(gx,gz);
    const map=new Map(),opened=[];
    map.set(begin,{x:sxg,z:szg,g:0,f:Math.hypot(gx-sxg,gz-szg),parent:-1});
    opened.push(begin);
    let examined=0;
    while(opened.length&&examined++<1350){
      let ix=0;
      for(let i=1;i<opened.length;i++)if(map.get(opened[i]).f<map.get(opened[ix]).f)ix=i;
      const id=opened.splice(ix,1)[0],cur=map.get(id);
      if(id===dest){
        const points=[];let seek=id;
        while(seek!==-1){
          const item=map.get(seek);
          points.push([item.x*STEP,item.z*STEP]);
          seek=item.parent;
        }
        points.reverse();points.shift();
        points.push([tx,tz]);
        return points;
      }
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
        const x=cur.x+dx,z=cur.z+dz;
        if(Math.abs(x)>offset||Math.abs(z)>offset)continue;
        if(!posClear(x*STEP,z*STEP))continue;
        if(dx&&dz&&(!posClear((cur.x+dx)*STEP,cur.z*STEP)||!posClear(cur.x*STEP,(cur.z+dz)*STEP)))continue;
        if(blockedSegment(cur.x*STEP,cur.z*STEP,x*STEP,z*STEP,.9))continue;
        const k=encode(x,z),g=cur.g+Math.hypot(dx,dz);
        const old=map.get(k);
        if(old&&g>=old.g)continue;
        map.set(k,{x,z,g,f:g+Math.hypot(gx-x,gz-z),parent:id});
        if(!opened.includes(k))opened.push(k);
      }
    }
    return [];
  }
  const safeZones=[
    [-18,410,31], [92,330,22], [301,333,16],
    [465,913,18],[-447,873,16],[-760,-279,18],
    [-26,-540,16],[596,401,20],[656,-654,17],[218,992,20]
  ];
  function nearSafe(x,z){return safeZones.some(p=>horizontal(x,z,p[0],p[1])<p[2]);}
  function spawn(player,near=78,requireHidden=false){
    const px=player.x,pz=player.z;
    const forward=new THREE.Vector3();
    camera.getWorldDirection(forward);
    const candidates=[];
    for(let i=0;i<48;i++){
      const r=rand(near*.7,near*1.25),a=rand(-Math.PI,Math.PI);
      const x=px+Math.cos(a)*r,z=pz+Math.sin(a)*r;
      if(Math.abs(x)>1260||Math.abs(z)>1350||!posClear(x,z)||nearSafe(x,z))continue;
      const d=horizontal(x,z,px,pz),fwd=((x-px)*forward.x+(z-pz)*forward.z)/d;
      const sight=lineClear(x,z,px,pz);
      if(requireHidden && fwd>.15 && sight)continue;
      const score=(requireHidden?fwd>-.25?15:0:0)+Math.abs(d-near)+Math.random()*9;
      candidates.push({x,z,score});
    }
    if(!candidates.length)return false;
    candidates.sort((a,b)=>a.score-b.score);
    const best=candidates[0];root.position.set(best.x,0,best.z);
    state.lastX=best.x;state.lastZ=best.z;
    state.goal=[];state.repath=0;return true;
  }
  function startNight(player){
    state.night=true;state.phase='watch';state.phaseTime=0;state.time=0;
    state.pressure=0;state.seenFor=0;state.unseenFor=0;state.cooldown=3;
    state.repath=0;state.nextFright=10;state.captureTime=0;
    state.flareCooldown=0;state.stun=0;state.lostSight=0;
    state.lastTargetX=player.x;state.lastTargetZ=player.z;state.ambientClock=7;
    root.visible=spawn(player,92,true);
    hud.classList.add('visible');
    vignette.classList.add('visible');
    if(audio&&audio.state==='running')fx('scrape',70);
  }
  function exitNight(){
    state.night=false;state.phase='dormant';state.pressure=0;state.captureTime=0;
    state.stun=0;state.flareCooldown=0;state.lostSight=0;state.hiddenFor=0;
    root.visible=false;flash.classList.remove('active');hud.classList.remove('visible');
    vignette.classList.remove('visible');
    if(humGain&&audio)humGain.gain.setTargetAtTime(0,audio.currentTime,.15);
    if(windGain&&audio)windGain.gain.setTargetAtTime(0,audio.currentTime,.15);
  }
  function scare(player){
    state.phase='caught';state.captureTime=0;state.cooldown=22;state.pressure=0;
    flash.classList.remove('active');
    void flash.offsetWidth;flash.classList.add('active');
    if(audio)fx('impact');
    opts.onScare?.();
  }
  function changePhase(name){
    if(state.phase===name)return;
    state.phase=name;state.phaseTime=0;state.repath=0;state.goal=[];
    if(name==='chase'){
      if(audio)fx('roar');
      opts.onChase?.();
    } else if(name==='stalk'){
      if(audio)fx('growl',65);
    }
  }
  function navigate(player,speed,dt){
    const tx=player.x,tz=player.z;
    const x=root.position.x,z=root.position.z;
    let goal=[tx,tz],dist=horizontal(x,z,tx,tz);
    if(dist>6&&!lineClear(x,z,tx,tz)){
      state.repath-=dt;
      if(state.repath<=0||state.goal.length===0){
        state.goal=astar(x,z,tx,tz);
        state.targetIndex=0;
        state.repath=1.4+Math.random()*.45;
      }
      while(state.targetIndex<state.goal.length&&horizontal(x,z,...state.goal[state.targetIndex])<3.2)state.targetIndex++;
      if(state.targetIndex<state.goal.length)goal=state.goal[state.targetIndex];
    } else{state.goal=[];state.repath=0;}
    const d=horizontal(x,z,goal[0],goal[1]);
    if(d<.08)return false;
    const nx=x+(goal[0]-x)/d*Math.min(speed*dt,d);
    const nz=z+(goal[1]-z)/d*Math.min(speed*dt,d);
    if(lineClear(x,z,nx,nz)&&posClear(nx,nz)){
      root.position.x=nx;root.position.z=nz;
      root.rotation.y=Math.atan2(tx-root.position.x,tz-root.position.z);
      return true;
    }
    state.repath=0;
    return false;
  }
  function update(time,dt,player,context={}) {
    if(!state.night)return;
    state.time+=dt;state.phaseTime+=dt;state.cooldown=Math.max(0,state.cooldown-dt);
    state.stun=Math.max(0,state.stun-dt);
    state.flareCooldown=Math.max(0,state.flareCooldown-dt);
    state.ambientClock-=dt;
    state.heartbeatClock-=dt;
    state.hiddenFor=context.hidden?state.hiddenFor+dt:0;
    if(state.phase==='caught'){
      state.captureTime+=dt;
      root.visible=false;
      if(state.captureTime>1.25){
        flash.classList.remove('active');
        opts.onRespawn?.();
        state.phase='watch';state.phaseTime=0;state.pressure=0;
        spawn(player,110,true);root.visible=true;
      }
      return;
    }
    if(!root.visible){
      if(state.phaseTime>3)root.visible=spawn(player,83,true);
      else return;
    }
    const x=root.position.x,z=root.position.z;
    const d=horizontal(x,z,player.x,player.z);
    const dir=new THREE.Vector3();camera.getWorldDirection(dir);
    const inFront=(((x-player.x)*dir.x+(z-player.z)*dir.z)/Math.max(d,.01))>.71;
    const visible= inFront && d<160 && lineClear(player.x,player.z,x,z);
    const safe=nearSafe(player.x,player.z);
    // Separate the player's sight of the creature from its awareness of the player.
    // Stillness and concealment matter; sprinting creates more opportunities to be found.
    const monsterSees=!context.hidden&&!safe&&
      d<(context.crouching?53:context.sprinting?145:103)&&lineClear(x,z,player.x,player.z);
    if(monsterSees){
      state.lostSight=0;
      state.lastTargetX=player.x;state.lastTargetZ=player.z;
    }else state.lostSight+=dt;
    if(context.flashlightHit&&state.flareCooldown<=0&&d<70){
      state.flareCooldown=19;
      state.stun=state.phase==='chase'?1.45:3.3;
      state.pressure+=1.8;
      eyeLight.intensity=0.4;
      fx('flare',d);
    }
    if(context.hidden)state.pressure=Math.max(0,state.pressure-dt*2.8);

    if(visible) { state.seenFor+=dt;state.unseenFor=0;state.seenRecently=true; }
    else {state.unseenFor+=dt;state.seenFor=Math.max(0,state.seenFor-dt*.8);}
    if(safe||context.hidden){
      state.pressure=Math.max(0,state.pressure-dt*(safe?3.2:2.8));
      if(state.phase==='chase'&&state.phaseTime>5)changePhase('stalk');
    } else if(state.cooldown<=0) {
      state.pressure+=dt*(state.phase==='watch'?.50:state.phase==='stalk'?.88:.3);
      if(visible && d<95)state.pressure+=dt*.75;
      if(context.sprinting&&d<145&&monsterSees)state.pressure+=dt*1.15;
      if(context.crouching&&!monsterSees)state.pressure=Math.max(0,state.pressure-dt*.75);
      if(d<23)state.pressure+=dt*1.8;
    }

    if(state.phase==='watch'){
      // Watches from cover, moving in short steps when no longer observed.
      if(state.phaseTime>7 || state.pressure>12)changePhase('stalk');
      else if(!visible&&!context.hidden&&state.unseenFor>3.5&&d>50&&state.stun<=0)navigate(player,1.55,dt);
    } else if(state.phase==='stalk'){
      if(!safe&&!context.hidden&&state.cooldown<=0 && ((state.pressure>33&&monsterSees) || (state.seenFor>2.7&&d<40) || (d<12&&monsterSees))){
        changePhase('chase');
      } else if(d>17){
        const speed=state.stun>0?0:visible?.35:context.crouching?1.5:2.5;
        if(!safe&&!context.hidden&&d<145&&speed>0)navigate(player,speed,dt);
      }
      if(!visible&&d>190&&state.unseenFor>11)spawn(player,85,true);
    } else if(state.phase==='chase'){
      // When sight is lost, search the last observed position rather than tracking through walls.
      const speed=state.stun>0?0:Math.min(11.15,8.4+state.phaseTime*.085);
      const target=state.lostSight>.65?
        {x:state.lastTargetX,z:state.lastTargetZ}:player;
      const moved=speed>0?navigate(target,speed,dt):false;
      if(d<3.5 && !safe && !context.hidden && monsterSees && state.stun<=0 && state.cooldown<=0){
        scare(player);return;
      }
      if(safe&&state.phaseTime>8)changePhase('stalk');
      else if(state.lostSight>5.7 && !monsterSees)changePhase('search');
      else if(d>175 && state.phaseTime>14)changePhase('stalk');
      if(!moved && state.stun<=0)state.stuckFor+=dt;else state.stuckFor=0;
      if(state.stuckFor>6&&d>45){state.stuckFor=0;spawn(player,75,true);}
      state.footclock-=dt;
      if(state.footclock<=0){fx('step',d);state.footclock=.43+.05*Math.random();}
    } else if(state.phase==='search'){
      if(monsterSees&&!context.hidden&&d<95)changePhase('chase');
      else {
        if(state.stun<=0)navigate({x:state.lastTargetX,z:state.lastTargetZ},4.0,dt);
        if(state.phaseTime>9)changePhase('stalk');
      }
    }
    if(state.phase==='stalk'||state.phase==='search'){
      state.footclock-=dt;
      if(state.footclock<=0 && d<70 && !visible){fx('scrape',d);state.footclock=rand(3.8,6.8);}
    }
    if(d<23&&!visible&&state.nextFright<state.time&&state.phase==='stalk'&&!safe&&!context.hidden){
      // Brief non-capture silhouette and metallic sting; no rapid strobing.
      flash.classList.add('near-miss');if(audio)fx('sting',d);
      state.nearMiss=.20;state.nextFright=state.time+rand(19,34);
    }
    if(state.nearMiss>0){
      state.nearMiss-=dt;if(state.nearMiss<=0)flash.classList.remove('near-miss');
    }

    const moving=state.stun>0?.07:state.phase==='chase'?1.8:state.phase==='stalk'?.75:state.phase==='search'?.9:.18;
    const step=time*(state.phase==='chase'?9:2.8);
    legs[0].rotation.x=Math.sin(step)*.52*moving;
    legs[1].rotation.x=Math.sin(step+Math.PI)*.52*moving;
    arms[0].rotation.x=-Math.sin(step+.6)*.34*moving;
    arms[1].rotation.x=Math.sin(step+.6)*.34*moving;
    torso.position.y=4.35+Math.abs(Math.sin(step))*.12*moving;
    torso.rotation.z=Math.sin(time*.72)*.025+(state.phase==='chase'?Math.sin(step*.4)*.06:0);
    head.rotation.y=Math.sin(time*.43)*.16+(visible?Math.sin(time*7)*.022:0);
    root.scale.y=1+Math.sin(time*.82)*.012;
    eyeLight.intensity=state.stun>0?.28:1.9+Math.sin(time*(state.phase==='chase'?14:4))*.75;
    for(let i=0;i<smoke.length;i++){
      const s=smoke[i],q=(time*.16+i/5)%1;
      s.position.set(Math.sin(time+i*3)*(.7+q),2+q*7,-.8+q*.3);
      s.scale.setScalar(2+q*4);
    }
    const severity=state.phase==='chase'?.95:state.phase==='search'?.71:Math.min(.86,state.pressure/40);
    if(audio&&audio.state==='running'&&state.heartbeatClock<=0&&severity>.22){
      fx('heartbeat',Math.max(5,d*.35));
      state.heartbeatClock=1.1-Math.min(.55,severity*.52);
    }
    if(audio&&audio.state==='running'&&state.ambientClock<=0){
      if(!context.hidden && d<130)fx(Math.random()<.48?'breath':Math.random()<.5?'steam':'electrical',d);
      state.ambientClock=4.8+Math.random()*8;
    }
    hud.style.setProperty('--watcher-threat',Math.round(100*severity)+'%');
    meter.style.width=Math.round(100*severity)+'%';
    phaseLabel.textContent=context.hidden?'HIDDEN / LISTEN CAREFULLY':
      state.stun>0?'WATCHER RECOILING / MOVE NOW':
      state.phase==='search'?'SEARCHING THE LAST SIGHTING':
      state.phase==='chase'?'RUN / IT IS COMING':
      visible&&d<95?'VISUAL CONTACT / DO NOT LINGER':
      d<34?'MOVEMENT VERY CLOSE':
      state.phase==='stalk'?'SCRAPING DETECTED':'ANOMALY UNCONFIRMED';
    vignette.style.opacity=String(Math.min(.83,.12+severity*.62+Math.max(0,40-d)/110));
    if(audio&&audio.state==='running'){
      humGain.gain.setTargetAtTime((.016+severity*.11)/(1+Math.max(0,d-15)/70),audio.currentTime,.28);
      windGain.gain.setTargetAtTime((.013+severity*.075)/(1+Math.max(0,d-15)/80),audio.currentTime,.45);
      humOsc.frequency.setTargetAtTime(39+severity*14,audio.currentTime,.4);
      windFilter.frequency.setTargetAtTime(250+severity*570,audio.currentTime,.45);
    }
  }
  function setNight(on,player){
    if(on===state.night)return;
    if(on)startNight(player);
    else exitNight();
  }
  function toggleMute(){
    state.mute=!state.mute;
    if(state.mute&&audio){
      audio.suspend().catch(()=>{});
    }else{
      initAudio();
    }
    audioLabel.textContent=state.mute?'K · HORROR SOUND MUTED':'K · MUTE HORROR AUDIO';
    return !state.mute;
  }
  function onPlayerTeleport(player){
    if(!state.night)return;
    if(state.phase==='caught')return;
    state.cooldown=6;state.pressure=Math.max(0,state.pressure-9);
    spawn(player,95,true);changePhase('watch');
  }
  return {
    update,setNight,toggleMute,tryAudio:initAudio,onPlayerTeleport,
    getPosition(){return {x:root.position.x,z:root.position.z};},
    inScare(){return state.phase==='caught';},
    getThreat(){return state.phase==='chase'?1:Math.min(1,state.pressure/35);},
    get phase(){return state.phase;}
  };
}
