import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMaterials } from '../src/materials.js';
import { createWorld } from '../src/world.js';

// Minimal Canvas 2D stub: lets us exercise procedural geometry from Node
// without pretending to test actual Firefox/WebGL rasterisation.
globalThis.document={
  createElement(type){
    assert.equal(type,'canvas');
    return {
      width:256,height:256,
      getContext(kind){
        assert.equal(kind,'2d');
        return {
          createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4),width:w,height:h};},
          putImageData(){},fillRect(){},fillText(){},
          createRadialGradient(){return {addColorStop(){}};},
          set fillStyle(v){},set font(v){},set textAlign(v){}
        };
      }
    };
  }
};
const scene=new THREE.Scene();
const materials=createMaterials();
const world=createWorld(scene,materials);
assert.equal(world.landmarks.length,13,'Expected 13 connected industrial sectors');
assert.equal(world.expansion.landmarks.length,7,'Expected 7 new facilities');
assert.ok(world.colliders.length>30,'Factory shells and stockpiles need collisions');
assert.ok(world.expansion.sectors.length>=9,'New world should be subdivided into cullable districts');

const errors=[];
for(const [i,landmark] of world.landmarks.entries()){
  const [x,y,z]=landmark.pos;
  if(![x,y,z].every(Number.isFinite))errors.push('Invalid waypoint '+landmark.name);
  const collisions=world.colliders.filter(c=>
    x>c.minX-.52&&x<c.maxX+.52&&z>c.minZ-.52&&z<c.maxZ+.52
  );
  if(collisions.length)errors.push('Waypoint '+(i+1)+' inside '+collisions.length+' solid building(s): '+landmark.name);
}
assert.equal(errors.length,0,errors.join('\n'));

let geos=0,verts=0,invalid=0;
scene.traverse(o=>{
  if(!o.isMesh)return;
  const attr=o.geometry?.getAttribute('position');
  if(!attr)return;
  geos++;verts+=attr.count;
  const sampleStep=Math.max(1,Math.floor(attr.count/8000));
  for(let i=0;i<attr.count;i+=sampleStep){
    for(const p of ['getX','getY','getZ'])if(!Number.isFinite(attr[p](i)))invalid++;
  }
});
assert.equal(invalid,0,'Detected NaN or Infinity in industrial geometry');
assert.ok(geos>25,'Expected batched meshes + live equipment');
assert.ok(verts>25000,'Expected actual detailed industrial geometry');

const camera=new THREE.PerspectiveCamera(75,1,.1,2500);
for(const loc of world.landmarks){
  camera.position.set(...loc.pos);
  world.update(7,1/60,camera,1);
  const close=world.expansion.sectors.filter(s=>
    s.center.distanceTo(camera.position)<s.range
  );
  assert.ok(close.every(s=>s.group.visible),'Nearby sector should render: '+loc.name);
}

const systems=world.expansion.state;
const sample=[[465,915,'shunt'],[-447,875,'scrapCrane'],[-760,-277,'power'],
  [286,-645,'slag'],[694,496,'pumps'],[656,-652,'portCrane']];
for(const [x,z,key] of sample){
  camera.position.set(x,2,z);
  const old=systems[key],label=world.activate(camera);
  assert.ok(label,'Missing usable control for '+key);
  assert.notEqual(systems[key],old,'Control not attached to active machine: '+key);
}
assert.ok(world.getVisitedOperations()>=6,'Operating checks should record interactions');
console.log('PASS: '+world.landmarks.length+' districts, '+geos+' meshes, '+
  verts+' vertices, '+world.colliders.length+' collision proxies, '+
  world.getVisitedOperations()+' functional machinery checks.');
