import io from "socket.io-client"
let callbacks={}
let perms={}
export let namespaces={}
let _socket
let _api
let _io
let _endpoint

let ctx={}
export let mutations={}
export let user=null;


let  Mutation={
	get(target,name){
	
		if (mutations.hasOwnProperty(name)){
			
			return async function(data){
				return await mutations[name](data)}
		}
		else{

			return target[name]	
		}
		

	},
	set(target,name,callback){
		return mutations[name]=callback
	}
}
mutations.is_login=async function(){
	let token=getCookie("graphyml")
	if (token==undefined){
		return false
	}
	else{
		let req=await fetch(_endpoint,{
		"method":"GET",
		"headers":{
			"x-access-tokens":token
		}})
		user= await req.json()
		return user

	}
}
mutations.login=async function(username,password){
				
				let req=await fetch(_endpoint,{"headers":{
					"Authorization":"Basic "+btoa(username+":"+password)}})
				let response=await req.json()
				if (req.status==200){
					
					setCookie("graphyml",response.token)
		
				}
				perms=response.perms
				console.log(response)
				user={"token":response.token,"perms":response.perms,
				"id":response.id,"username":response.username,"email":response.email}

				return {"ok":req.status==200,"token":response.token,"perms":response.perms,
				"id":response.id,"username":response.username,"email":response.email}
				
			}

mutations._get = async function(GET,mutation="get"){
	let token=getCookie("graphyml")
	let req=await fetch(_endpoint,{
		"method":"POST",
		"headers":{
			"content-type":"application/json",
			"x-access-tokens":token
		},
		"body":JSON.stringify({
			"<MUTATION>":mutation,
			"<GET>":GET,
			"<QUERY>":{},
			"<DATA>":{},
			})
		})

		let response
		response=await req.json()
		if (req.status!=200){
			if (callbacks[mutation]){
				for (let callback of callbacks[mutation]){
					console.log(response)
					callback({
						mutation:mutation,
						get:GET,
						post:null,
						query:null,
						status:req.status,
						error:response["error"]}
						)
				}
			}
			
		}
			
		
		

		return response.response
	
}
mutations._update = async function(QUERY,DATA,mutation="update"){
		let token=getCookie("graphyml")
			let get =[]
			for (let item in QUERY){
				get.push("$"+item.toLowerCase())
			}
			let req=await fetch(_endpoint,{
				"method":"POST",
				"headers":{
					"content-type":"application/json",
					"x-access-tokens":token
				},
				"body":JSON.stringify({
					"<MUTATION>":mutation,
					"<GET>":{},
					"<QUERY>":QUERY,
					"<DATA>":DATA,
					})
				})

				let response
				response=await req.json()
				if (req.status!=200){
					if (callbacks[mutation]){
						for (let callback of callbacks[mutation]){
							callback({
								mutation:mutation,
								get:null,
								post:DATA,
								query:QUERY,
								status:req.status,
								error:response["error"]}
								)
						}
					}
					
					
				}
				
				return response.response
			


			
}
mutations._post = async function(DATA,mutation="create"){
		let token=getCookie("graphyml")

			let req=await fetch(_endpoint,{
				"method":"POST",
				"headers":{
					"content-type":"application/json",
					"x-access-tokens":token
				},
				"body":JSON.stringify({
					"<MUTATION>":mutation,
					"<GET>":["$self"],
					"<QUERY>":{},
					"<DATA>":DATA,
					})
				})

				let response
				response=await req.json()
				if (req.status!=200){
					if (callbacks[mutation]){
						for (let callback of callbacks[mutation]){
							callback({
								mutation:mutation,
								get:null,
								post:DATA,
								query:QUERY,
								status:req.status,
								error:response["error"]}
								)
						}
					}
					
					
				}
				
				return response.response
			


			
}
mutations._mutate = async function(GET,QUERY,DATA,mutation="mutation"){
	let token=getCookie("graphyml")
			let req=await fetch(_endpoint,{
				"method":"POST",
				"headers":{
					"content-type":"application/json",
					"x-access-tokens":token
				},
				"body":JSON.stringify({
					"<MUTATION>":mutation,
					"<GET>":GET,
					"<QUERY>":QUERY,
					"<DATA>":DATA,
					})
				})
				let response
				response=await req.json()	
				if (callbacks[mutation]){
					for (let callback of callbacks[mutation]){
						callback({
							mutation:mutation,
							get:GET,
							post:DATA,
							query:QUERY,
							status:req.status,
							error:response["error"]}
							)
					}
				}
				
					
				

				
				return response.response
			


			
}
mutations.delete=async function (query,get={},mutation="delete"){
			let token=getCookie("graphyml")
			let req=await fetch(_endpoint,{
				"method":"DELETE",
				"headers":{
					"x-access-tokens":token
				},
				"body":JSON.stringify({
					"<MUTATION>":mutation,
					"<GET>":get,
					"<QUERY>":query,
					})
				})
				let response
				
				if (req.status!=200){
					if (callbacks[mutation]){
						for (let callback of callbacks[mutation]){
							callback({
								mutation:name,
								get:get,
								post:data,
								query:query,
								status:req.status,
								error:response["error"]}
								)
						}
					}
					
					
				}
				else{
					response=await req.json()
					return response.response
				}


			}
mutations.logout=async function(){
				setCookie("graphyml",null)
			}
mutations.refresh=async function(){
				let token=getCookie("graphyml")
				let req=await fetch(_endpoint,{"headers":{
					"x-access-tokens":token
				}})
				
				if (req.status==200){
					let response=await req.json()
					setCookie("graphyml",response.token)
	
				}

		
				return {"ok":req.status==200,"token":token,"perms":response.perms}
				
			}

let  MutationSock={
	get(target,name){
		/*
		Todas las operaciones socket son POST ya que 
		los get los recive el on, si quiere hacer un get prueba 
		una API
		*/
		function emit(muration,MESSAGE,QUERY=null,DATA=null,TARGET=null){
	
		
				target.io.emit(muration,{
					"<MESSAGE>":MESSAGE,
					"<QUERY>":QUERY,
					"<DATA>":DATA,
					"<TARGET>":TARGET
				})
			}
		if (name=="room"){
			return function(name){
				return {
					"emit":(mutation,MESSAGE,QUERY=null,DATA=null)=>emit(mutation,MESSAGE,QUERY,DATA,name),
					"post":(mutation,QUERY=null,DATA=null)=>emit(mutation,QUERY,DATA,name)
				}
			}
		}
		else if (name=="post"){
		
				return (mutation,QUERY,DATA)=>emit(mutation,null,QUERY,DATA,null)
			
		}	
		else if (name=="emit"){
			return emit
			

		}

		else if(name=="on"){
		
			return function(event,callback){
					target.io.on(event,(data)=>{
						callback(data)
					})
				
			}

		}
		else if (target.hasOwnProperty(name)){

			return target[name]

		}
	
	},
	async set(target,name,callback){
		target[name]=callback
	}
}
export let setCookie=function(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
  let expires = "expires="+d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

export let  getCookie=function(cname) {
  let name = cname + "=";
  let ca = document.cookie.split(';');
  for(let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return null;
}

export let checkCookie = function(name) {
  let _user = getCookie(name);
  if (_user != null) {
    return true
  } else {
    return false
  }
}

export let onError=function(callback){
	callbacks.push(callback)
}
export let offError=function(callback){
	callbacks.remove(callback)
}
export let Api=function(endpoint){
	let token=getCookie("graphyml")
	_endpoint=endpoint
	return mutations
	/*return new Proxy({"endpoint":endpoint,"_token":token,
		"_error":null,"perms":{},"mutations":{}}, Mutation);
		*/
}

function SockProxy(socket){
	return new Proxy({"_token":token,"socket":socket}, MutationSock)
}

export let of=function(name,fn){
	if (!_io){
		console.error("Necesita inicializar el cliente socket")
	}

	let namespace=_io.of(name)

	return {"on":(event,fn)=>{
		namespace.on(event,(socket)=>{fn(SockProxy(socket))})
	}}
}

export let use=function(namespace){

	if (!namespaces.hasOwnProperty(namespace)){
		namespaces[namespace]=new Proxy({
			"io":null,
			"_namespace":namespace,
			}, MutationSock)
	}
		
		

	return namespaces[namespace]
}

export let on=function(name,fn){
	
	if (!_io){
		console.error("Necesita inicializar el cliente socket")
	}
	_io.on(name,(socket)=>{fn(SockProxy(socket))})
}
export let socket;

export function get(name){
	if (name){
		return ctx[name]
	}
	else{
		return ctx
	}
}
export function set(name,value){
	ctx[name]=value
}

export let Socket=class {
	constructor(endpoint){
		let token=getCookie("graphyml")
		let _namespace;
		if (endpoint.startsWith("http")){
			_namespace=endpoint.split("?")[0].split("/").slice(-1)
		}else{

			_namespace=endpoint.split("?")[0].split("/").slice(3,endpoint.length).join("/");
		}
		if (endpoint.indexOf("?")>-1){
			endpoint+="&namespace="
		}
		else{
			endpoint+="?namespace="
		}
		_io = io(endpoint+_namespace,{extraHeaders: {
	  	"x-access-tokens": token,
		}});
		

		//_io=WebSocket(endpoint)
		if (!namespaces.hasOwnProperty("/"+_namespace)){
			namespaces["/"+_namespace]=new Proxy({
			"_token":token,
			"io":_io,
			"_namespace":"/"+_namespace,
			}, MutationSock)

		}
		else{
			namespaces["/"+_namespace].io=_io
		}
		

		token=getCookie("graphyml")

		return namespaces["/"+_namespace]
		
		/*
		return {
			"io":
			"on":(name,callback)=>{
				callback.fn=(socket)=>{
						callback(SockProxy(socket))
				}
				socket.on(event,callback.fn)
			},
			"off":(name,callback)=>{socket.off(name,callback.fn)}
		}
		*/
	}

}

export function add_callback(mutation,callback,options){
	if(!callbacks.hasOwnProperty(mutation)){
		callbacks[mutation]=[]
	}
	if (options && options.unique){
		if (callbacks[mutation].length==0){
			callbacks[mutation]=[callback]
		}
	}
	else if (options && options.overwrite){

			callbacks[mutation]=[callback]
		
	}else{
		callbacks[mutation].push(callback)
	}

}

export function has_perm(perm){
	return perms
}