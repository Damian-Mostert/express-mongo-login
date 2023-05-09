const mongoose = require("mongoose")
const express = require('express')
const Router = express.Router()
const CryptoJS = require("crypto-js");
function generateString(length) {const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';let result = '';for ( let i = 0; i < length; i++ )result += characters.charAt(Math.floor(Math.random() * characters.length));return result;}
function encryptJSON(message,key){try{return (CryptoJS.AES.encrypt(JSON.stringify(message), key)).toString();}catch(e){console.error(e);return null}}
function dectriptJSON(data,key){try{return JSON.parse((CryptoJS.AES.decrypt(data, key)).toString(CryptoJS.enc.Utf8));}catch(e){console.error(e);return null}}
module.exports = function expressMongooseLogin(userModel,config){
  const e = message => {throw new Error("\033[94mexpress-mongoose-login:\033[0m\config.authTimeout"+message)}
  if(!config.cookieName)e("No cookieName set.")
  if(!config.findWith)e("Missing findWith in config.")
  if(!config.authWith)e("Missing authWith in config.")
  const ftkns = new class fakeTokenThings {
    constructor(){
      var fakeTokenLength = 25
      var iterated = 0
      var fakeTokenTagsStorage  = []
      function newFakeToken(){
        const falseToken = generateString(fakeTokenLength)
        for(let fakeTokenTag of fakeTokenTagsStorage ){
          if((fakeTokenTag.fakeToken == falseToken)){
            if(iterated==8){
              fakeTokenLength++
              iterated=0
            }
            falseToken = newFakeToken()
            iterated++
          }
        }
        return falseToken
      }
      const fakeToken=(user_id,realToken)=>{
        var tk = {
          user_id,
          authToken:generateString(50),
          realToken,
          fakeToken:newFakeToken()
        }
        return tk
      }
      this.makeNewToken=(user_id,realToken,timeout)=>{
        const newToken = fakeToken(user_id,realToken)
        fakeTokenTagsStorage.push(newToken)
        if(timeout){
          newToken.timeout=setTimeout(()=>{
            this.clearToken(newToken.fakeToken)
          },timeout)
        }
        return newToken
      }
      this.resetTimeout=(key,timeout)=>{
        for(let token in fakeTokenTagsStorage )if(key == fakeTokenTagsStorage[token].fakeToken){
          if(fakeTokenTagsStorage[token].timeout)
          clearTimeout(fakeTokenTagsStorage[token].timeout)
          fakeTokenTagsStorage[token].timeout = setTimeout(()=>{
            this.clearToken(key)
          },timeout)
        }
      }
      this.getToken=key=>{
        for(let token of fakeTokenTagsStorage )if(token&&(key == token.fakeToken))return token
      }
      this.clearToken=(key)=>{
        for(let i = 0;i< fakeTokenTagsStorage.length;i++ )
          if(key == fakeTokenTagsStorage[i].fakeToken){
            fakeTokenTagsStorage.splice(i, 1);
            return{success:true}
          }
        return{error:true}
      }
    }
  }
  Router
  .use(require("cookie-parser")(config.secret,config.cookie))
  .use(require("express-session")(config.Session))
  .use(async function(request,response,next){
    var realEnd = response.end
    var storedCookies = {}
    response.setCookieOnEnd=(name,data,config)=>{
        request.cookies[name] = data
        storedCookies[name] = {data,config}
    }
    response.end =data=>{
      for(let i in storedCookies)
        if(response.cookie)response.cookie(i,storedCookies[i].data,storedCookies[i].config)
      realEnd(data)
    }
    const success=inp=>{
      request.session.save()
      if(inp)return {success:inp};return {success:true}
    }
    const error=inp=>{
      request.session.save()
      if(inp)return {error:inp};return {error:true}
    }
    const clearThisCookie=()=>{if(response&&response.cookie)response.setCookieOnEnd("Users",undefined,config.cookie);request.session[config.cookieName]=null;return error({Auth:true})}
    request.mongo = {}
    request.mongo[config.cookieName] = {
      authenticate:async function authenticate(){
        if(request.cookies[config.cookieName]||request.session[config.cookieName]){
          try{
            var data
            if(request.session[config.cookieName]&&request.cookies[config.cookieName])data = [...Array.from(request.session[config.cookieName]),...Array.from(request.cookies[config.cookieName])]
            else if(request.cookies[config.cookieName])data = [...Array.from(request.cookies[config.cookieName])]
            else if(request.session[config.cookieName])data = [...Array.from(request.session[config.cookieName])]
            let built = []
            for(let item in data)
            if(data[item]&&data[item].fakeToken&&data[item].encrypted){
              const realTokenData = ftkns.getToken(data[item].fakeToken)
              if(!realTokenData)return clearThisCookie()
              const decrypted = dectriptJSON(data[item].encrypted,realTokenData.realToken)
              if(realTokenData.timeout)ftkns.resetTimeout(realTokenData.fakeToken,config.authTimeout)
              if(decrypted&&(decrypted.authToken == realTokenData.authToken)&&(decrypted.user_id==realTokenData.user_id))built.push(await userModel.findById(realTokenData.user_id))
              else return clearThisCookie()
            }else return error({Santax:true})
            if(!built.length)return clearThisCookie()
            return success(built)
          }catch(e){
            return clearThisCookie()
          }
        }else return error({noCookie:true})
      }
    }
    const logout=(x,dontClear)=>{
      var session = function(){try{return request.session[config.cookieName]}catch(w){return null}}()
      var cookie = function(){try{return Array.from(request.cookies[config.cookieName])}catch(w){return null}}()
      if(session&&session.length>(x)){
        const fakeToken = session[x].fakeToken
        if(!session[x])return error({noUserAtIndex:true})
        if(ftkns.clearToken(session[x].fakeToken)){
          request.session[config.cookieName].splice(x, 1);
          if(!dontClear&&!request.session[config.cookieName].length)return clearThisCookie()
          return success()
        }else return clearThisCookie()
      }else if(cookie){
        if(session)x -= session.length
        if(!cookie[x])return error({noUserAtIndex:true})
        if(ftkns.clearToken(cookie[x].fakeToken)){
          cookie.splice(x,1)
          if(!dontClear&&!cookie.length)return clearThisCookie()
          else response.setCookieOnEnd(config.cookieName,cookie,config.cookie)
          return success()
          }else return clearThisCookie()
        }
        return error({noUserAtIndex:true})
    }
    response.mongo = {}
    response.mongo[config.cookieName] = {
      login:async function login(input,loginConfig={}){
        var user
        for(let i of config.findWith.split(","))
          if(!user){
            const Search = {}
            Search[i] = input[i]
            const posible_user = await userModel.findOne(Search)
            if(posible_user)user = posible_user
          }
        if(!user)return{error:{user:true}}
        const newCookie = () =>{
          var key = generateString(50)
          var newTks = ftkns.makeNewToken(user._id,key,config.authTimeout)
          return{fakeToken:newTks.fakeToken,encrypted:encryptJSON({user_id:user._id,authToken:newTks.authToken},key),}
        }
        const auth = await request.mongo[config.cookieName].authenticate()
        for(let i of config.authWith.split(","))if(user[i] == input[i]){//if success
          if(auth.success){
              for(let i in auth.success)
                if(auth.success[i]._id.toString() == user._id.toString())
                  return error()
              if(loginConfig.remember){
                response.setCookieOnEnd(config.cookieName,[...Array.from(request.cookies[config.cookieName]),newCookie()],config.cookie)
                return success()
              }else{
                request.session[config.cookieName] = [...Array.from(request.session[config.cookieName]),newCookie()]
                return success()
              }
          }else
            if(loginConfig&&loginConfig.remember){
              response.setCookieOnEnd(config.cookieName,[newCookie()],config.cookie)
              request.session[config.cookieName] = []
              return success()
            }else{
              request.session[config.cookieName] = [newCookie()]
              response.setCookieOnEnd(config.cookieName,[],config.cookie)
              return success()
            }
        }
        return{error:{password:true}}
      },
      reAuthenticate:async function reAuthenticate() {
        const authResult = await request.mongo[config.cookieName].authenticate();
        if (authResult.error) return authResult;
        const authUsers = authResult.success;
        const input = {};
        const sessionUsers = [];
        const cookieUsers = [];
        const sessionLength = function(){
          if(request.session[config.cookieName ])return request.session[config.cookieName ].length
          return 0
        }();
        for(let i = 0;i<authUsers.length;i++)logout(0,true)
        for (const user of authUsers) {
          for (const key of [...config.findWith.split(","), ...config.authWith.split(",")]) {
            input[key] = user[key];
          }
        if (sessionUsers.length < sessionLength) {
          sessionUsers.push(user);
        } else {
          cookieUsers.push(user);
        }
      }
      for (const user of sessionUsers) {
        for (const key of [...config.findWith.split(","), ...config.authWith.split(",")]) {
          input[key] = user[key];
        }
        const loginResult = await response.mongo[config.cookieName].login(input);
        if (loginResult.error) {
          return error({ login: true });
        }
      }
      for (const user of cookieUsers) {
        for (const key of [...config.findWith.split(","), ...config.authWith.split(",")]) {
          input[key] = user[key];
        }
        const loginResult = await response.mongo[config.cookieName].login(input, { remember: true });
        if (loginResult.error) {
          return error({ login: true });
        }
      }
      return success();
    },
      logout:async function(x){
        const auth = await request.mongo[config.cookieName].authenticate();
        if(auth.error)return auth.error
        return await logout(x)
      },
      logoutAll:async function logoutAll(){
        const auth = await request.mongo[config.cookieName].authenticate()
        if(auth.error)return auth;
        for(let i=0;i<auth.success.length;i++)if((await logout(i)).error)return error()
        return success()
      }
    }
    next()
  })
  return Router
}
