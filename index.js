/*
Built by Damian Mostert
Contact Details
Email: damianmostert86@gmail.com
Phone: +27 74 433 5251
I need a job :(
*/
//includes
const express = require("express"); // for router
const mongoose = require("mongoose"); // to confirm that objects are mongoose models
const CryptoJS = require("crypto-js"); // to enctypt and decrypt data
const Session = require("express-session") // for router session
const cookieParser = require("cookie-parser") // for router cookies
//function to generate random strings
var generateString = require('./generateString.js')
//function to encrypt JSON
function encryptJSON(message,key){
  try{
    //try decrypt
    return (CryptoJS.AES.encrypt(JSON.stringify(message),key)).toString();
  }catch(e){
    //if failed return null
    return null
  }
}
//function to decrypt JSON
function dectriptJSON(data,key){
  try{
    //try decrypt
    return JSON.parse((CryptoJS.AES.decrypt(data, key)).toString(CryptoJS.enc.Utf8))
  }catch(e){
    //if failed return null
    return null
  }
}
//express mongo login error
const e_errors = []
const e = message => {
  e_errors.push(new Error("\033[91mexpress-mongo-login\033[0m "+message))
}
const inf = message => {
  console.info("\033[1;36mexpress-mongo-login\033[0m \033[1;33minfo\033[0;0m "+message)
}
const w = message => {
  console.warn("\033[1;36mexpress-mongo-login\033[0m \033[1;33mwarning\033[0;0m "+message)
}
const throwErrors = (s) =>{
  for(let error of e_errors)console.error(error)
  if(e_errors.length){
    w("cought errors; calling process exit")
    process.exit(0)
  }
}

//success callback
const success=success=>{
  if(success)
    return {success}
  return {success:true}
}
//error callback
const error=error=>{
  if(error)
    return {error}
  return {error:true}
}

//fake token things class
class fakeTokenThings {
  constructor(){
    //fake token storage array
    var storage  = []
    //fake token start length
    var fakeTokenLength = 25
    //variabal to check how many times fake token generation overlaped (for when all avalable tokens are used)
    var iterated = 0
    //generate fake token
    function newFakeToken(){
      //generate new random string for fakse token
      const falseToken = generateString(fakeTokenLength)
      //check if fake token is taken
      for(let fakeTokenTag of storage)
        if(fakeTokenTag.fakeToken == falseToken){
          //if failed to find token 8 times increase token length
          if(iterated==8){
            fakeTokenLength++
            iterated=0
          }
          //change false token
          falseToken = newFakeToken()
          //increase iterated
          iterated++
        }
      return falseToken
    }
    //inner function for new fake token
    const fakeToken=(user_id,realToken)=>{
      var tk = {
        user_id,
        authToken:generateString(50),
        realToken,
        fakeToken:newFakeToken()
      }
      return tk
    }
    //outer function for new token
    this.makeNewToken=(user_id,realToken,timeout)=>{
      //make new fake token
      const newToken = fakeToken(user_id,realToken)
      //push intoo storage
      storage.push(newToken)
      //if timeout
      if(timeout){
        //set timeout to clear token
        newToken.timeout=setTimeout(()=>{
          this.clearToken(newToken.fakeToken)
        },timeout)
      }
      return newToken
    }
    //functin to reset token timeout
    this.resetTimeout=(key,timeout)=>{
      //find token
      for(let token in storage )if(key == storage[token].fakeToken){
        //if timeout
        if(storage[token].timeout)//clear timeout
          clearTimeout(storage[token].timeout)
        //make new timeout
        storage[token].timeout = setTimeout(()=>{
          this.clearToken(key)
        },timeout)
        return success()
      }
      //return error if no timout was reset
      return error()
    }
    //function to get token
    this.getToken=key=>{
      //find token and return
      for(let token of storage )if(token&&(key == token.fakeToken))return token
      //return null if no token was found
      return null
    }
    //function to clear token
    this.clearToken=(key)=>{
      //find token
      for(let i = 0;i< storage.length;i++ )
        if(key == storage[i].fakeToken){
          //remove at index
          storage.splice(i, 1);
          //return success
          return success()
        }
      //no token was found return error
      return error()
    }
  }
}
//attempt bank class to store onlock things
class onLockStorage{
  constructor(config){
    var storage = {}
    this.getFailStatus=id=>{
      if(!storage[id])storage[id]={
        failed:0,
        locked:false,
        timeout:false,
      }
      return storage[id]
    }
    this.increaseFailStatus=id=>{
      storage[id].failed ++
      var lock
      for(let i in config)
        if(!lock)if(storage[id].failed==i){
          lock = i
        }
      if(lock){
          if(typeof config[lock].callback == 'function')config[lock].callback(id)
          storage[id].locked = true
          storage[id].timeout = setTimeout(()=>{
            storage[id].locked = false
            storage[id].timeout = false
          },config[lock].timeout)
      }
    }
    this.clearFailStatus=id=>{
      if(storage[id]&&storage[id].timeout)clearTimeout(storage[id].timeout)
      storage[id] = null
      let ns = {}
      for(let i in storage)if(storage[i])ns[i]=storage[i]
      storage=ns
    }
  }
}
//otp storage class
class OtpStorage{
  constructor(config){
    var storage = {}
    let len = 20
    let itr = 0
    this.newKey=()=>{
      let id = generateString(len)
      if(storage[id]){
        itr++
        if(itr == 10){
          len++
          itr = 0
        }
        return this.newKey()
      }else return id
    }
    this.createPassword = async(key,user,loginConfig) =>{
      var password = generateString(config.length,config.characters)
      for(let item in storage)
        if(storage[item].user._id.toString()==user._id.toString())
          this.clearKey(item)
      storage[key] = {
        password,
        user,
        loginConfig,
        timeout:setTimeout(()=>{
          storage[key] = null
          let nstor = {}
          for(let i in storage)
            if(storage[i])nstor[i]=storage[i]
          storage = nstor
        },config.timeout)
      }
      await config.callback(user,password)
      return password
    }
    this.clearKey = browser_key =>{
      if(storage[browser_key]){
        clearTimeout(storage[browser_key].timeout)
        storage[browser_key] = null
        let nstor = {}
        for(let i in storage)
          if(storage[i])nstor[i]=storage[i]
        storage = nstor
        return success()
      }
      return error()
    }
    this.authenticate = (browser_key,password) =>{
      if(storage[browser_key]){
        if(storage[browser_key].password == password){
          let user = storage[browser_key].user
          this.clearKey(browser_key)
          return success({user})
        }else return error({password:true})
      }else return error({key:true})
    }
  }
}
//exports
module.exports =
//express mongoose function input
function expressMongooseLogin(model={},config={}){
  //config checking
  if(!model)//if model is not mongoose model
    e("No mongoose model")
  if(!config.cookieName)//if no cookie name throw error
    e("No cookieName set, expected a string")
  if(!config.findWith)//if no find with throw error
    e("No findWith in config, expected a string")
  if(!config.authWith)//if no auth with throw error
    e("No authWith in config, expected a string")
  if(!config.authTimeout)//if no find with throw error
    e("No authTimeout in config, expected a number")
  if(config.cookieName&&typeof config.cookieName!="string")//if no cookie name throw error
    e("cookieName is not a string")
  if(config.findWith&&typeof config.findWith!="string")//if no find with string throw error
    e("findWith in config is not a string")
  if(config.authWith&&typeof config.authWith!="string")//if no auth with string throw error
    e("authWith in config is not a string")
  if(config.authTimeout&&typeof config.authTimeout!="number")//if no auth with string throw error
    e("authTimeout in config is not a number")
  throwErrors()
  if(!config.secret)//if no auth with string throw error
    inf("no cookie config set; use 'secret' in config to set a cookie secret")
  if(!config.cookie)//if no auth with string throw error
    inf("no cookie config set; use 'cookie' in config to set cookie config")
  if(!config.Session)//if no auth with string throw error
    w("no session config set; will use null")
  if(!config.otp)//if no auth with string throw error
    w("no otp config set; otp will be disabled")
  if(!config.lockon)//if no auth with string throw error
    w("no lockon settings in config; user acounts will not be locked out for timeout if auth input was incorect.")
  //lockon errors
  if(config.lockon&&typeof config.lockon != "object")e("config.lockon was not a object")
  throwErrors(' ')
  for(let i in config.lockon){
    if(!i.match(/\d+/))e("lockon expects only numbers to indicate when a action must take place")
  if(typeof config.lockon[i]!="object")e("lockon['"+i+"'] was expecting a object")
  else {
    if((!config.lockon[i].timeout)||(typeof config.lockon[i].timeout !="number"))e("lockon['"+i+"'].timeout is not a number")
    if((config.lockon[i].callback)&&(typeof config.lockon[i].callback!="function"))w("lockon['"+i+"'].callback is not a function; you would mabey like to use callback to warn users via email or phone")
  }
  }
  if(config.otp){
    if(typeof config.otp == "object"){
      if(!config.otp.characters)config.otp.characters = '0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM'
      if(config.otp.characters)if(typeof config.otp.characters != "string")e("otp.characters in config is not a string")
      if(typeof config.otp.length != "number")e("otp.length in config is not a number")
      if(typeof config.otp.timeout != "number")e("otp.timeout in config is not a number")
      if(((typeof config.otp.callback!="function")))e("otp.callback in config is not a funtion")
    }else e("otp in config is not a object")
  }
  throwErrors(' ')
  //make auth arrays
  const findWithArray = config.findWith.split(",")
  const authWithArray = config.authWith.split(",")
  const authAndFindWithArray =  [...findWithArray,...authWithArray]
  //check if schema matches with auth and find arrays
  const schema = model.schema.obj;
  for(let a of findWithArray)//for each findWith
    for(let b of authWithArray)//for each authWith
     //if authWith is the same as findWith warn
     if(a == b)
      w("posible authentication problem; '"+a+"' is used in both findWith and authWith")
  //check if model has findWith input
  for(let a of findWithArray)
    if(!schema[a])//if not warn
      w("posible authentication problem; '"+a+"' in findWith is not in '"+model.collection.collectionName+"' schema")
    else if(!((schema[a].type&&schema[a].type == String)||(schema[a] == String)))//check that type is string
      w("posible authentication problem with '"+a+"' in findWith. in model '"+model.collection.collectionName+"' '"+a+"' is not a string; authentication will fail as express-mongo-login can only compaires strings")
  //check if model has authWith input
  for(let a of authWithArray)
    if(!schema[a])//if not warn
      w("posible authentication problem; '"+a+"' in authWith is not in '"+model.collection.collectionName+"' schema")
    else if(!((schema[a].type&&schema[a].type == String)||(schema[a] == String)))//check that type is string
      w("posible authentication problem with '"+a+"' in authWith. in model '"+model.collection.collectionName+"' '"+a+"' is not a string; authentication will fail as express-mongo-login can only compaires strings")

  //make private fakeTokenThings
  const fakeTokens = new fakeTokenThings
  //make private onLockStorage
  const LockStorage = new onLockStorage(config.lockon)
  //make private otpStorage
  var otpBank
  if(config.otp)
    otpBank = new OtpStorage(config.otp)
  //create express router
  const rout = express.Router()
  //enable cookie parser
  .use(cookieParser(config.secret,config.cookie))
  //enable session
  .use(Session(config.Session))
  //real rout
  .use(async function(request,response={},next){
    //create false next if no next
    if(typeof next!="function")e("expected next to be funtion, but instead got '"+typeof next+"'")
    //make stored cookie array
    const storedCookies = {}
    //setCookie function
    response.setCookie=function setCookie(name,data,config){
        //update cookie in request
        request.cookies[name] = data
        //store cookie for end of request
        storedCookies[name] = {data,config}
    }
    //store response.end
    const response_end = response.end
    //create new response.end
    response.end =function end(callback0,callback1,callback2){
      //send stored cookies before end
      for(let i in storedCookies)
        if(response.cookie)
          if(storedCookies[i].data!=null)
            response.cookie(i,storedCookies[i].data,storedCookies[i].config)
          else response.clearCookie(i)
      //save session
      request.session.save()
      //call original response.end
      response_end(callback0,callback1,callback2)
    }
    //function to clear cookie and session
    const clearThisCookie=()=>{
      response.setCookie("Users",null,config.cookie)
      request.session[config.cookieName+"_session"]=null
      return error({auth:true})
    }
    //function to logout without authentication
    function logoutNoAuth(x){
      //get session
      var session = request.session[config.cookieName+"_session"]
      //get cookue
      var cookie = request.cookies[config.cookieName]
      //if x in session index
      if(session&&(session.length>x)){
        //if no user at x return error at session
        if(!session[x])
          return error({index:true})
        //clear fake token
        if(fakeTokens.clearToken(session[x].fakeToken).success){
          //splce at session x
          request.session[config.cookieName+"_session"].splice(x, 1);
          //if session and cookies empty clear cookies
          return success()
        }else //if fake token didnt clear clear cookie
          return clearThisCookie()
      }else if(cookie){
        //if session fix x to cookie
        if(session)x -= session.length
        if(!cookie[x])return error({index:true})
        if(fakeTokens.clearToken(cookie[x].fakeToken).success){
          //splice cookie at index
          cookie.splice(x,1)
          //if session and cookies empty clear cookies
          response.setCookie(config.cookieName,cookie,config.cookie)
          //return success if no errors
          return success()
        }else //no cookies or session,clean up
            return clearThisCookie()
        }
        //return no user at index error
        return error({index:true})
    }
    //function to authenticate
    async function authenticate(){
      //if cookies or session exists
      if(request.cookies[config.cookieName]&&request.session[config.cookieName+"_session"]){
        //try
        try{
          //push session and cookies in one array
          const data = [...request.session[config.cookieName+"_session"],...request.cookies[config.cookieName]]
          //make array variabal for return
          const built = []
          //for each item in data
          for(let item in data)
            //if data has fakeToken and encrypted
            if(data[item]&&data[item].fakeToken&&data[item].encrypted){
              //get real token data
              const realTokenData = fakeTokens.getToken(data[item].fakeToken)
              //if no realTokenData return clear session and cookie
              if(!realTokenData)
                return clearThisCookie()
              //decryptJSON
              const decrypted = dectriptJSON(data[item].encrypted,realTokenData.realToken)
              //if token has timeout reset it
              if(realTokenData.timeout)
                fakeTokens.resetTimeout(realTokenData.fakeToken,config.authTimeout)
              //if decrypted and authtokens match with id,find and push user
              if(decrypted&&(decrypted.authToken == realTokenData.authToken)&&(decrypted.user_id==realTokenData.user_id))
                built.push(await model.findById(realTokenData.user_id))
              else //if failed return clear session and cookie
                return clearThisCookie()
            }else{ // return santax error
              clearThisCookie()
              return error({santax:true})
            }
            //if not built return and ckear session and cookue
            if(!built.length)
              return clearThisCookie()
            //success, no errors return users
            return success(built)
        }catch(e){
          //some error happend, clear cookie and session
          return clearThisCookie()
        }
      }else //return no cookie error
        return error({cookie:true})
    }
    //generate otp for login function
    async function generateOTP(input={},loginConfig={}){
      //set user variabal
      var user
      //find user
      for(let i of findWithArray)
        //if no user has been found
        if(!user){
          //sanatize
          var smallInput = {}
          smallInput[i] = input[i]
          //find
          user = await model.findOne(smallInput)
        }else continue // user found continue
      if(!user)return error({user:true})
      if(loginConfig.authenticate){
        for(let i of authWithArray)
          //if user password match input password
          if(user[i] === input[i]){
            //authenticated, send OTP
            const key = otpBank.newKey()
            const password = await otpBank.createPassword(key,user,loginConfig)
            return success({key:key})
          }
        return error({password:true})
      }else{
        //no authentication required send OTP
        const key = otpBank.newKey()
        const password =await otpBank.createPassword(key,user,loginConfig)
        return success({key:key})
      }
    }
    //normal login
    async function login(start_input={},loginConfig={}){
      //make variabal for user
      var user
      //function to build user cookie
      function newCookie(){
        const newKey = generateString(50)
        const newToken = fakeTokens.makeNewToken(user._id,newKey,config.authTimeout)
        this.fakeToken = newToken.fakeToken
        this.encrypted = encryptJSON({user_id:user._id,authToken:newToken.authToken},newKey)
      }
      //sanatize start input
      var input ={}
      if(!loginConfig.dontSanatize)
      for(let string of authAndFindWithArray)
      if(start_input[string]&&(typeof start_input[string] == "string"))
      input[string] = start_input[string]
      else return error({input:true})
      if(!loginConfig.dontSanatize)
      for(let string in start_input)
          if(!authAndFindWithArray.includes(string))return error({input:true})
      if(loginConfig.dontSanatize)input = start_input
      //find user with findWith
      for(let i of findWithArray)
      //if no user has been found
      if(!user){
        //sanatize
        var smallInput = {}
        smallInput[i] = input[i]
        //find
        user = await model.findOne(smallInput)
      }else continue // user found continue
      //if no user return error
      function getTimeLeft(timeout){
        return Math.ceil((timeout._idleStart + timeout._idleTimeout) - (process.uptime()*1000));
      }
      if(!user)
      return error({user:true})
      //check lock on status
      if(config.lockon&&!loginConfig.dontLockon){
        let result = LockStorage.getFailStatus(user._id)
        if(result.locked){
          return error({locked:{
            attempts:result.failed,
            timeleft:getTimeLeft(result.timeout)
          }})
        }
      }
      //auth to check for other users
      const auth = await authenticate()
      if(auth.error)clearThisCookie()
      if(config.maxUsers&&auth.success&&config.maxUsers == auth.success.length)return error({maxUsers:true})
      //for each in authWith array
      for(let i of authWithArray)
      //if user password match input password
      if(user[i] === input[i]){//if items match
        //if other users, check to make shure no overlaping of users will take place
        if(auth.success)
        for(let i in auth.success)
        if(auth.success[i]._id.toString() == user._id.toString())
        return error({users:true})
        //if no cookie buid cookie
        if(!request.cookies[config.cookieName])response.setCookie(config.cookieName,[],config.cookie)
        //if no session build session
        if(!request.session[config.cookieName+"_session"])request.session[config.cookieName+"_session"]=[]
        //if remember
        if(loginConfig.remember)
          response.setCookie(config.cookieName,[...request.cookies[config.cookieName],new newCookie()],config.cookie)
        else
          request.session[config.cookieName+"_session"] = [...request.session[config.cookieName+"_session"],new newCookie()]
        //clear lock on status
        if(config.lockon&&!loginConfig.dontLockon){
          LockStorage.clearFailStatus(user._id)
        }
        //no erros return success
        return success()
      }
      //increase lockon status
      if(config.lockon&&!loginConfig.dontLockon){
        LockStorage.increaseFailStatus(user._id)
        let resultss = LockStorage.getFailStatus(user._id)
        if(resultss.locked){
          return error({password:true,locked:{
            attempts:resultss.failed,
            timeleft:getTimeLeft(resultss.timeout)
          }})
        }
      }
      //password bad return error
      return error({password:true})
    }
    //login with otp function
    async function loginWithOTP(browser_key,user_key){
      let result = otpBank.authenticate(browser_key,user_key)
      if(result.error)return result
      return await login(result.success.user,{...result.success.loginConfig,dontSanatize:true})
    }
    //function to reAuthenticate, change encryption, fake tokens and auth tokens
    async function reAuthenticate(){
      //first authenticate
      const auth = await authenticate();
      //if error return error
      if (auth.error) return auth;
      //set input for search
      var input
      //variabal to count how many session users have been handled
      var sessionCount = 0;
      //generate session length
      var sessionLength = 0
      if(request.session[config.cookieName+"_session"])sessionLength = request.session[config.cookieName+"_session" ].length
      //logout of all users, no auth
      if((await logoutAll()).error)
        return error({logout:true})
      //for each user in success
      for (const user of auth.success) {
        //clear/set input
        input = {}
        //set input to match user
        for (const key of authAndFindWithArray)input[key] = user[key];
        //if session count is smaller than session length
        if (sessionCount < sessionLength){ // handle session user
          sessionCount++
          if ((await login(input,{dontSanatize:true})).error){
            clearThisCookie()
            return error({ login: true });
          }
        }//relogin cookie user
        else{
          let res = await login(input, { remember: true,dontSanatize:true })
          //if error clear cookie and return error
          if(res.error){
            clearThisCookie()
            return error({ login: true });
          }
        }
      }
      //return success, no erros cougth
      return success();
    }
    //function to logout user at index
    async function logout(x){
      //authenticate users
      const auth = await authenticate();
      //if auth error return auth error
      if(auth.error)
        return auth.error
      //logout with no auth at x index
      return await logoutNoAuth(x)
    }
    //function to logout all users
    async function logoutAll(){
      //authenticate users
      const auth = await authenticate()
      //if auth error return auth error
      if(auth.error)
        return auth;
      //for each user
      for(let i=0;i<auth.success.length;i++)
          if((await logoutNoAuth(0)).error)
            return error()
      return success()
    }
    //build mongo in request and response if it doesnt exist
    //request
    //if mongo is not part of request create mongoRequest class
    if(!request.mongo)request.mongo = new class mongoRequest{
      constructor(){
          this[config.cookieName] =  {authenticate} // req authenticate
        }
      }
    else
      //if mongo exists just add cookie
      request.mongo[config.cookieName] =  {authenticate} // req authenticate

    //response
    //if mongo is not part of response create mongoResponse class
    if(!response.mongo)response.mongo = new class mongoResponse{
      constructor(){
          this[config.cookieName] =  {login,logout,logoutAll,reAuthenticate} //res login , logout, logoutAll, logoutNoAuth, reAuthenticate
          //add otp routes if otp is in config
          if(config.otp)
            this[config.cookieName] = {...this[config.cookieName],generateOTP,loginWithOTP}
        }
      }
    else
      //if mongo exists just add cookie
      response.mongo[config.cookieName] =  {login,logout,logoutAll,reAuthenticate} //res login , logout, logoutAll, logoutNoAuth, reAuthenticate
    //continue
    next()
  })
  //create a rout for socket.io to use req.authenticate
  rout.io = () =>{
    return async function io(socket,next){
      return await rout.handle(socket.request,{},next)
    }
  }
  //return rout
  return rout
}
module.exports.tools = require('./tools.js')
