/** Bound startup work, including loaders whose promises never settle. */
export async function loadWithTimeout<T>(name:string,load:()=>Promise<T>,timeoutMs=20000):Promise<T>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    return await Promise.race([
      Promise.resolve().then(load),
      new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error(`Loading ${name} took too long. Reload the game to retry.`)),timeoutMs);})
    ]);
  }finally{clearTimeout(timer);}
}
