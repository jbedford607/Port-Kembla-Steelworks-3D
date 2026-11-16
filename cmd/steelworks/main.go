package main

import (
 "embed"
 "errors"
 "fmt"
 "io/fs"
 "net"
 "net/http"
 "os"
 "os/exec"
 "path/filepath"
 "runtime"
 "time"
)

//go:embed static
var gameFiles embed.FS

func openFirefox(url string) error {
 if runtime.GOOS != "windows" { return exec.Command("xdg-open",url).Start() }
 var paths []string
 for _,key := range []string{"ProgramFiles","ProgramFiles(x86)","LOCALAPPDATA"} {
  if base:=os.Getenv(key); base!="" {
   paths=append(paths,filepath.Join(base,"Mozilla Firefox","firefox.exe"))
  }
 }
 for _,p:=range paths {
  if s,e:=os.Stat(p);e==nil && !s.IsDir() {
   return exec.Command(p,url).Start()
  }
 }
 if err:=exec.Command("cmd","/C","start","","firefox",url).Start();err==nil {return nil}
 return errors.New("Firefox not found at typical installation paths")
}

func main() {
 fmt.Println("PORT KEMBLA STEELWORKS 3D — Three.js edition")
 fmt.Println("No Node.js, npm, or command-line setup required.")
 root,err:=fs.Sub(gameFiles,"static")
 if err!=nil {fmt.Println("Missing embedded game assets:",err);fmt.Scanln();return}
 mux:=http.NewServeMux()
 server:=http.FileServer(http.FS(root))
 mux.Handle("/",http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  w.Header().Set("Cache-Control","no-store")
  w.Header().Set("X-Content-Type-Options","nosniff")
  server.ServeHTTP(w,r)
 }))
 listener,err:=net.Listen("tcp","127.0.0.1:0")
 if err!=nil {fmt.Println("Cannot start local web server:",err);fmt.Scanln();return}
 address:="http://"+listener.Addr().String()+"/"
 fmt.Println("Game address:",address)
 go func(){ if e:=http.Serve(listener,mux);e!=nil{fmt.Println("Server stopped:",e)} }()
 time.Sleep(350*time.Millisecond)
 if e:=openFirefox(address);e!=nil{fmt.Println(e)}
 fmt.Println("If Firefox did not open automatically, paste the game address above into Firefox.")
 fmt.Println("Keep this window open while playing; close it when finished.")
 select{}
}
