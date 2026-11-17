(function () {
  "use strict";
  // The real Theseus engine renders all four menu blades and their animations.
  // Change *its* ini-driven 3D labels, not a separate HTML reproduction.
  var path="/home/web_user/.local/share/theseus/Configs/config.ini";
  var values={
    MainMenuItems:"4",
    Button1Text:"APPS",
    Button1Action:"GoToMemory()",
    Button2Text:"MUSIC",
    Button2Action:"GoToMusic()",
    Button3Text:"FILES",
    Button3Action:"GoToMedia()",
    Button4Text:"SETTINGS"
  };
  var prior=window.ogxConfig&&window.ogxConfig.migrate;
  if(prior){
    window.ogxConfig.migrate=function () {
      prior();
      var fs=window.Module&&window.Module.FS;
      if(!fs)return;
      try{
        var txt=fs.readFile(path,{encoding:"utf8"});
        var section="",lines=txt.split(/\r?\n/),found={};
        for(var i=0;i<lines.length;i++){
          var v=lines[i].trim();
          if(v[0]==="[" && v[v.length-1]==="]"){section=v.slice(1,-1);continue;}
          if(section!=="MainMenu")continue;
          var j=lines[i].indexOf("=");if(j<0)continue;
          var k=lines[i].slice(0,j).trim();
          if(Object.prototype.hasOwnProperty.call(values,k)){
            lines[i]=k+"="+values[k];found[k]=true;
          }
        }
        for(var k in values)if(!found[k]){
          var at=lines.findIndex(function(l){return l.trim()==="[MainMenu]";});
          if(at>=0)lines.splice(at+1,0,k+"="+values[k]);
        }
        fs.writeFile(path,lines.join("\n"));
        if(window.ogxPersist)window.ogxPersist.touch();
        if(window.ogx&&window.ogx.log)window.ogx.log("info","Android: phone menu labels installed into real 3D menu");
      }catch(e){if(window.ogx)window.ogx.log("warn","phone config: "+e);}
    };
  }
  // No 4:3 bars or resolution-reducing scale: use the full rendered viewport.
  function fullScreen(){
    if(window.ogxFraming)window.ogxFraming.set("fill");
    var c=document.getElementById("canvas");
    if(c){c.style.width="100vw";c.style.height="100vh";}
  }
  fullScreen();
  window.addEventListener("ogx:ready",fullScreen);
  window.addEventListener("resize",fullScreen);
  var css=document.createElement("style");
  css.textContent="html,body,#stage,canvas{width:100%!important;height:100%!important;margin:0!important}"+
      ".ogxc{display:none!important}.ogxf{display:none!important}"+
      "#bootvid video{object-fit:cover!important}";
  document.head.appendChild(css);
})();
