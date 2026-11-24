import * as THREE from 'three';

// NIGHT EVENTS: player flashlight, powered lamps, hiding lockers and rare false silhouettes.
// All effects are local; no external assets or sound downloads.
export function createNightEvents(scene,world,camera) {
  const state={night:false,flashlightOn:false,hidden:false,hideIndex:-1,time:0,decoyTimer:32,
    decoyLife:0,decoyType:0,electricPulse:0,electricTimer:7};
  const environment=new THREE.Group();environment.name='Night Shift Infrastructure';scene.add(environment);

  const metal=new THREE.MeshStandardMaterial({color:0x283137,roughness:.71,metalness:.63});
  const trim=new THREE.MeshStandardMaterial({color:0x718187,roughness:.45,metalness:.77});
  const dark=new THREE.MeshStandardMaterial({color:0x090e12,roughness:.95,metalness:.12});
  const glass=new THREE.MeshStandardMaterial({color:0x3c4546,emissive:0x8f4617,emissiveIntensity:.4,metalness:.08,roughness:.35});
  const eye=new THREE.MeshBasicMaterial({color:0xff6725});
  function cube(parent,material,w,h,d,x,y,z) {
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);return m;
  }

  const hidingSpots=[
    {x:-339,z:293,title:'WORKSHOP LOCKER'},
    {x:-212,z:298,title:'MAINTENANCE CABINET'},
    {x:248,z:184,title:'DISPATCH LOCKER'},
    {x:-170,z:15,title:'FURNACE SERVICE CABINET'},
    {x:395,z:-65,title:'PORT SERVICE BOX'},
    {x:78,z:607,title:'RAIL YARD CABINET'},
    {x:-472,z:591,title:'SCRAP GATE LOCKER'},
    {x:-745,z:-11,title:'POWER ROOM LOCKER'},
    {x:-35,z:-542,title:'STOCKYARD SHELTER'},
    {x:597,z:437,title:'WATERWORKS LOCKER'},
    {x:658,z:-712,title:'WHARF CONTROL BOX'},
    {x:-220,z:940,title:'DEPOT STORAGE CABINET'}
  ];
  for (const spot of hidingSpots){
    const body=new THREE.Group();body.position.set(spot.x,0,spot.z);
    cube(body,metal,2.3,3.3,1.6,0,1.65,0);
    cube(body,dark,1.72,2.75,.1,0,1.68,.86);
    for(const s of [-1,1]){
      cube(body,trim,.08,2.78,.12,s*.93,1.66,.92);
      cube(body,trim,.70,.10,.13,s*.50,2.82,.94);
      cube(body,trim,.7,.07,.13,s*.50,2.63,.94);
      cube(body,metal,.12,.35,.16,s*.18,1.54,1);
    }
    cube(body,trim,2.5,.24,1.9,0,3.34,0);
    environment.add(body);
  }

  const lampPositions=[
    [-341,28,288], [-205,24,268], [-185,32,80], [260,27,240],
    [352,28,-70], [104,23,370],[-305,25,190], [20,27,-201],
    [220,24,710], [-380,24,780],[-725,26,-190],[-122,25,-750],
    [770,26,505],[755,24,-725],[0,24,1080]
  ];
  const lamps=[];
  for(let i=0;i<lampPositions.length;i++){
    const [x,y,z]=lampPositions[i];
    const arm=new THREE.Group();arm.position.set(x,0,z);
    cube(arm,metal,.25,y, .25,0,y/2,0);
    cube(arm,trim,2.1,.14,.68,0,y-.40,0);
    cube(arm,glass,1.8,.08,.56,0,y-.54,0);
    environment.add(arm);
    world.lightSources?.push({x,y:y-1,z,power:650,range:72});
  }

  // No shadow-map allocation for the flashlight, so it works in Performance mode.
  const torch=new THREE.SpotLight(0xffe1b4,900,90,Math.PI/8,.42,1.4);
  torch.castShadow=false;
  torch.visible=false;torch.position.set(0,0,0);scene.add(torch);
  const torchTarget=new THREE.Object3D();scene.add(torchTarget);torch.target=torchTarget;

  const apparition=new THREE.Group();scene.add(apparition);
  const phantomMaterial=new THREE.MeshBasicMaterial({color:0x090d0e,transparent:true,opacity:.0,depthWrite:false});
  const phantomEyes=new THREE.MeshBasicMaterial({color:0xff490d,transparent:true,opacity:0,depthWrite:false});
  cube(apparition,phantomMaterial,.95,3.6,.67,0,2.5,0);
  cube(apparition,phantomMaterial,1.9,.38,.53,0,4.08,0);
  cube(apparition,phantomMaterial,.76,1.2,.58,0,4.8,0);
  for(let s of [-1,1]){
    cube(apparition,phantomMaterial,.28,3,.36,s*.73,2.25,0);
    cube(apparition,phantomMaterial,.27,1.9,.38,s*.29,.96,0);
    cube(apparition,phantomEyes,.13,.07,.12,s*.21,4.94,.36);
  }
  apparition.visible=false;

  const hiddenOverlay=document.createElement('div');hiddenOverlay.id='steel-hiding-view';
  hiddenOverlay.innerHTML='<div class="steel-hiding-slit"></div><div class="steel-hiding-text">HIDDEN IN CABINET — E TO EXIT</div>';
  document.body.append(hiddenOverlay);

  const flashlightIcon=document.createElement('div');flashlightIcon.id='steel-torch-hint';
  flashlightIcon.textContent='F  FLASHLIGHT';document.body.append(flashlightIcon);

  function intersects(ax,az,bx,bz){
    for(const c of world.colliders){
      if((c.base||0)>3.5||c.height<.3)continue;
      let a=0,b=1;const dx=bx-ax,dz=bz-az;
      for(const [origin,delta,lo,hi] of [[ax,dx,c.minX-.7,c.maxX+.7],[az,dz,c.minZ-.7,c.maxZ+.7]]){
        if(Math.abs(delta)<.00001){if(origin<lo||origin>hi){a=2;break;}}
        else {
          let aa=(lo-origin)/delta,bb=(hi-origin)/delta;
          if(aa>bb)[aa,bb]=[bb,aa];
          a=Math.max(a,aa);b=Math.min(b,bb);
          if(a>b)break;
        }
      }
      if(a<=b&&a<=1&&b>=0)return true;
    }
    return false;
  }

  function nearestSpot(player){
    let closest=-1,min=Infinity;
    hidingSpots.forEach((s,i)=>{
      const d=Math.hypot(player.x-s.x,player.z-s.z);
      if(d<4.6&&d<min){closest=i;min=d;}
    });
    return closest;
  }
  function interact(player){
    if(!state.night)return null;
    if(state.hidden){
      state.hidden=false;state.hideIndex=-1;hiddenOverlay.classList.remove('visible');
      return 'LEFT HIDING PLACE';
    }
    const i=nearestSpot(player);
    if(i<0)return null;
    const s=hidingSpots[i];
    state.hidden=true;state.hideIndex=i;
    player.x=s.x;player.z=s.z+1.3;player.y=1.4;player.vy=0;player.grounded=true;
    hiddenOverlay.classList.add('visible');
    return 'HIDDEN / '+s.title;
  }
  function getPrompt(player){
    if(!state.night)return null;
    if(state.hidden)return 'E  ·  LEAVE HIDING PLACE';
    const i=nearestSpot(player);
    return i<0?null:'E  ·  HIDE IN '+hidingSpots[i].title;
  }
  function exitHiding(){
    state.hidden=false;state.hideIndex=-1;hiddenOverlay.classList.remove('visible');
  }
  function flashlightHit(x,y,z) {
    if(!state.night||!state.flashlightOn||state.hidden)return false;
    const direction=new THREE.Vector3();camera.getWorldDirection(direction);
    const delta=new THREE.Vector3(x-camera.position.x,y-camera.position.y,z-camera.position.z);
    const length=delta.length();
    if(length>77||length<.1)return false;
    if(delta.normalize().dot(direction)<.935)return false;
    return !intersects(camera.position.x,camera.position.z,x,z);
  }
  function spawnApparition(player){
    if(state.hidden||state.decoyLife>0)return;
    const forward=new THREE.Vector3();camera.getWorldDirection(forward);
    const result=[];
    for(let i=0;i<20;i++){
      const a=Math.atan2(forward.z,forward.x)+((Math.random()<.5?-1:1)*(1.0+Math.random()*1.0));
      const r=48+Math.random()*60,x=player.x+Math.cos(a)*r,z=player.z+Math.sin(a)*r;
      if(Math.abs(x)>1260||Math.abs(z)>1350||world.colliders.some(c=>x>c.minX-1&&x<c.maxX+1&&z>c.minZ-1&&z<c.maxZ+1))continue;
      if(!intersects(player.x,player.z,x,z))result.push({x,z});
    }
    if(!result.length)return;
    const chosen=result[Math.floor(Math.random()*result.length)];
    apparition.position.set(chosen.x,0,chosen.z);
    apparition.visible=true;
    state.decoyLife=2.6+Math.random()*1.4;
    state.decoyType=Math.random()<.5?0:1;
  }
  function setNight(on){
    if(state.night===on)return;
    state.night=on;state.time=0;state.decoyTimer=20+Math.random()*18;
    state.decoyLife=0;apparition.visible=false;
    environment.visible=on;exitHiding();
    state.flashlightOn=false;torch.visible=false;
    flashlightIcon.classList.toggle('visible',on);flashlightIcon.textContent='F  FLASHLIGHT OFF';
    if(!on)hiddenOverlay.classList.remove('visible');
  }
  environment.visible=false;
  function toggleFlashlight(){
    if(!state.night)return false;
    state.flashlightOn=!state.flashlightOn;
    torch.visible=state.flashlightOn&&!state.hidden;
    flashlightIcon.textContent=state.flashlightOn?'F  FLASHLIGHT ON':'F  FLASHLIGHT OFF';
    return state.flashlightOn;
  }
  function update(t,dt,player,threat=0){
    if(!state.night)return;
    state.time+=dt;
    const forward=new THREE.Vector3();camera.getWorldDirection(forward);
    torch.position.copy(camera.position);
    torchTarget.position.copy(camera.position).addScaledVector(forward,24);
    // Electrical lights sag and glitch when the Watcher approaches, never high-frequency strobing.
    state.electricTimer-=dt;
    if(state.electricTimer<0){state.electricTimer=5+Math.random()*13;state.electricPulse=1.15;}
    state.electricPulse=Math.max(0,state.electricPulse-dt);
    for(const {light,i} of lamps) {
      const dx=light.position.x-player.x,dz=light.position.z-player.z;
      const nearby=Math.hypot(dx,dz)<155;
      const flutter=1-((Math.sin(t*7+i*2.3)>.84 && threat>.35)?(.2+.6*threat):0);
      const powerLoss=state.electricPulse>.4?.70:1;
      light.intensity=nearby?(10+9*Math.sin(t*.24+i))*flutter*powerLoss:3;
    }
    const beamBreak=threat>.90&&state.flashlightOn&&!state.hidden&&Math.sin(t*5)>.94;
    torch.intensity=beamBreak?90:900;
    torch.visible=state.flashlightOn&&!state.hidden;
    state.decoyTimer-=dt;
    if(state.decoyTimer<0 && threat>.12){
      spawnApparition(player);
      state.decoyTimer=31+Math.random()*25;
    }
    if(state.decoyLife>0){
      state.decoyLife-=dt;
      const a=Math.min(1,state.decoyLife/.55,Math.max(0,(4-state.decoyLife)*2));
      phantomMaterial.opacity=.76*a;phantomEyes.opacity=.90*a;
      apparition.rotation.y=Math.atan2(player.x-apparition.position.x,player.z-apparition.position.z);
      if(state.decoyLife<=0)apparition.visible=false;
      const d=Math.hypot(player.x-apparition.position.x,player.z-apparition.position.z);
      if(d<12){state.decoyLife=Math.min(state.decoyLife,.12);}
    }
  }
  return {
    setNight,update,interact,getPrompt,exitHiding,toggleFlashlight,flashlightHit,
    isHidden(){return state.hidden;},
    isFlashlightOn(){return state.flashlightOn;},
    get apparitionVisible(){return apparition.visible;}
  };
}
