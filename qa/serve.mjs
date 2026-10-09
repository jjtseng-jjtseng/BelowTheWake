import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost:5174');const file=url.pathname==='/trials'?path.resolve('qa/trials.html'):path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(file!==path.resolve('qa/trials.html')&&!file.startsWith(root+path.sep))throw Error('Outside root');const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}}).listen(5174,'127.0.0.1',()=>console.log('Isolated QA server: http://localhost:5174/trials'));
