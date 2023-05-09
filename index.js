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
function generateString(length) {
  //characters for random string
  const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  //set result variabal
  let result = '';
  for ( let i = 0; i < length; i++ )
    result += characters.charAt(Math.floor(Math.random() * characters.length));
    //add random character to result
  return result;
}
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
const e = message => {
  throw new Error("\033[91mexpress-mongo-login\033[0m "+message)
}
const w = message => {
  console.warn("\033[96mexpress-mongo-login\033[0m "+message)
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
    var fakeTokenStorageArray  = []
    //fake token start length
    var fakeTokenLength = 25
    //variabal to check how many times fake token generation overlaped (for when all avalable tokens are used)
    var iterated = 0
    //generate fake token
    function newFakeToken(){
      //generate new random string for fakse token
      const falseToken = generateString(fakeTokenLength)
      //check if fake token is taken
      for(let fakeTokenTag of fakeTokenStorageArray)
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
      //push intoo fakeTokenStorageArray
      fakeTokenStorageArray.push(newToken)
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
      for(let token in fakeTokenStorageArray )if(key == fakeTokenStorageArray[token].fakeToken){
        //if timeout
        if(fakeTokenStorageArray[token].timeout)//clear timeout
          clearTimeout(fakeTokenStorageArray[token].timeout)
        //make new timeout
        fakeTokenStorageArray[token].timeout = setTimeout(()=>{
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
      for(let token of fakeTokenStorageArray )if(token&&(key == token.fakeToken))return token
      //return null if no token was found
      return null
    }
    //function to clear token
    this.clearToken=(key)=>{
      //find token
      for(let i = 0;i< fakeTokenStorageArray.length;i++ )
        if(key == fakeTokenStorageArray[i].fakeToken){
          //remove at index
          fakeTokenStorageArray.splice(i, 1);
          return success()
        }
      return error()
    }
  }
}
//exports
module.exports =
//express mongoose function input
function expressMongooseLogin(model={},config={}){
  //input checking
  if(!(model.prototype instanceof mongoose.Model))//if model is not mongoose model
    e("No mongoose model")
  if(!config.cookieName)//if no cookie name throw error
    e("No cookieName set")
  if(!config.findWith)//if no find with throw error
    e("No findWith in config")
  if(!config.authWith)//if no auth with throw error
    e("No authWith in config")
  //make auth arrays
  const findWithArray = config.findWith.split(",")
  const authWithArray = config.authWith.split(",")
  const authfindArray =  [...findWithArray,...authWithArray]
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
  //check if model has authWith input
  for(let a of authWithArray)
    if(!schema[a])//if not warn
      w("posible authentication problem; '"+a+"' in authWith is not in '"+model.collection.collectionName+"' schema")
  //make private fakeTokenThings
  const fakeTokens = new fakeTokenThings
  //init express router
  return express.Router()
  //enable cookie parser
  .use(cookieParser(config.secret,config.cookie))
  //enable session
  .use(Session(config.Session))
  //real rout
  .use(async function(request,response,next){
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
            response.cookie(i,storedCookies[i].data,storedCookies[i].config)
      //save session
      request.session.save()
      //call original response.end
      response_end(callback0,callback1,callback2)
    }
    //function to clear cookie and session
    const clearThisCookie=()=>{
      response.setCookie("Users",undefined,config.cookie)
      request.session[config.cookieName]=null
      return error({Auth:true})
    }
    //function to logout without authentication
    function logoutNoAuth(x){
      //get session
      var session = request.session[config.cookieName]
      //get cookue
      var cookie = request.cookies[config.cookieName]
      //if x in session index
      if(session&&session.length>x){
        //if no user at x return error at session
        if(!session[x])
          return error({noUserAtIndex:true})
        //clear fake token
        if(fakeTokens.clearToken(session[x].fakeToken)){
          //splce at session x
          request.session[config.cookieName].splice(x, 1);
          //if session and cookies empty clear cookies
          if(!request.session[config.cookieName].length&&!request.cookies[config.cookieName].length)
            return clearThisCookie()
          return success()
        }else //if fake token didnt clear clear cookie
          return clearThisCookie()
      }else if(cookie){
        //if session fix x to cookie
        if(session)x -= session.length
        if(!cookie[x])return error({noUserAtIndex:true})
        if(fakeTokens.clearToken(cookie[x].fakeToken)){
          //splice cookie at index
          cookie.splice(x,1)
          //if session and cookies empty clear cookies
          if(!request.session[config.cookieName].length&&!request.cookies[config.cookieName].length)
            return clearThisCookie()
          else //set new cookie
            response.setCookie(config.cookieName,cookie,config.cookie)
          //return success if no errors
          return success()
        }else //no cookies or session,clean up
            return clearThisCookie()
        }
        //return no user at index error
        return error({noUserAtIndex:true})
    }
    //function to authenticate
    async function authenticate(){
      //if cookies or session exists
      if(request.cookies[config.cookieName]&&request.session[config.cookieName]){
        //try
        try{
          //push session and cookies in one array
          const data = [...request.session[config.cookieName],...request.cookies[config.cookieName]]
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
            }else // return santax error
              return error({Santax:true})
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
        return error({noCookie:true})
    }
    //login function
    async function login(input,loginConfig={}){
      //make variabal for user
      var user
      //function to build user cookie
      function newCookie(){
        const newKey = generateString(50)
        const newToken = fakeTokens.makeNewToken(user._id,newKey,config.authTimeout)
        this.fakeToken = newToken.fakeToken
        this.encrypted = encryptJSON({user_id:user._id,authToken:newToken.authToken},newKey)
      }
      //find user with findWith
      for(let i of findWithArray)
        if(!user){
          var v = {}
          v[i] = input[i]
          user = await model.findOne(v)
        }
      //if no user return error
      if(!user)
        return error({user:true})
      //auth to check for other users
      const auth = await authenticate()
      //for each in authWith array
      for(let i of authWithArray)
        if(user[i] === input[i]){//if items match
          //if other users, check to make shure no overlaping of users will take place
          if(auth.success)
            for(let i in auth.success)
              if(auth.success[i]._id.toString() == user._id.toString())
                return error({overLogin:true})
          //if no cookie buid cookie
          if(!request.cookies[config.cookieName])
            response.setCookie(config.cookieName,[],config.cookie)
          //if no session build session
          if(!request.session[config.cookieName])
            request.session[config.cookieName]=[]
          //if remember
          if(loginConfig.remember)
            //cookie login
            response.setCookie(config.cookieName,[...request.cookies[config.cookieName],new newCookie()],config.cookie)
          else
            //session login
            request.session[config.cookieName] = [...request.session[config.cookieName],new newCookie()]
          //return success
          return success()
        }
      return error({password:true})
    }
    //function to reAuthenticate, change encryption, fake tokens and auth tokens
    async function reAuthenticate() {
      //authenticate users
      const auth = await authenticate();
      //if authenticate error return error
      if (auth.error)return auth;
      //set input
      const input = {};
      //logout of all users with logoutNoAuth since request is already authenticated
      for(let i = 0;i<auth.success.length;i++)logoutNoAuth(0)
      //for each user in success
      for (const user of auth.success){
        //set input keys
        for (const key of authfindArray)
          input[key] = user[key];
        if ((await login(input)).error)
          //login, if error return error
          return error({ login: (sessionUsers.length < request.session[config.cookieName ].length) })
      }
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
        //logout with no auth at i index
        if(await (logoutNoAuth(i)).error)
          return error()
      return success()
    }
    //build mongo in request and response if it doesnt exist
    if(!request.mongo)request.mongo = new class mongoRequest{
      constructor(){
          this[config.cookieName] =  {authenticate}
        }
      }
    else
      request.mongo[config.cookieName] =  {authenticate}
    if(!response.mongo)response.mongo = new class mongoResponse{
      constructor(){
          this[config.cookieName] =  {login,logout,logoutAll,logoutNoAuth,reAuthenticate}
        }
      }
    else
      response.mongo[config.cookieName] =  {login,logout,logoutAll,logoutNoAuth,reAuthenticate}
    //continue
    next()
  })
}
