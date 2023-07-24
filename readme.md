

# express-mongo-login

a easy and secure way to manage your user data with express and mongoose.
## how the authentication works :

 First the user will log in, this will set a session or a cookie depending on the remember option.
<br>The cookies and sessions are both token arrays, the tokens contain encrypted data and a pseudo key, the server uses the pseudo key to find the real randomly generated key to decrypt the data for each user.
<br> The decrypted  data contains a authentication token and the user._id,  the data that returned the key to decrypt the data in the first place contains this user._id and authentication-token, they will both be compared. if successful it will return the user data, note all items in array are unique, if one fails all other tokens get removed and the cookie as well as the session is deleted.

### Express Mongo Login function
```js
                                      //database model
app.use(expressMongoLogin(userModel,{
  maxDevices:null,//sets max allowed active devices, null will mean infinit devices
  maxUsers:null,//0,null or undefined for infinite users, number bigger than 0 to define max users
  cookieName:"Users",//required, sets cookie and session name
  authenticationMode:'strict',//strict ot null will compleatly log out all users on device if one fails to authentocate, anything else will enable lose mode, lose node will just logout one user if it failes to authenticate, lose recomended if maxDevices togeled
  findWith:"Email,Username",//finds user with data
  authWith:"Password",//authenticates user with data
  authTimeout:1000*60*60*12,//12 hrs timout, this timeout is for auth tokens, if set to null auth tokens wont flush
  secret:CookieSecret,//cookie secret
  cookie:{},//cookie config
  Session:{//session config
    secret:CookieSecret,
    cookie:{},
  },
}))
```
### with socket.io
```js
const userRout = expressMongoLogin(userModel,{
  maxDevices:1,//sets max allowed active devices, user will be kicked of another device if more than 1
  maxUsers:5,//max users set to 5, no more than 5 users will be allowed to login
  cookieName:"Users",//required, sets cookie and session name
  findWith:"Email,Username",//finds user with data
  authWith:"Password",//authenticates user with data
  authTimeout:1000*60*60*12,//12 hrs timout, this timeout is for auth tokens, if set to null auth tokens wont flush
  secret:CookieSecret,//cookie secret
  cookie:{},//cookie config
  Session:{//session config
    secret:CookieSecret,
    cookie:{},
  },
})
//use in app
app.use(userRout)
//use in io
io.use(userRout.io()) // enables socket.request.mongo['cookie name'].authenticate()
```
you can now use socket.request to authenticate users, but not to login or logout or to reAuthenticate.

### using express-mongo-login rout on server will enable the following :
#### &bull; req.mongo[].authenticate(used to authenticate user and get user data)
USAGE
```js
let Auth = await req.mongo["your cookie name"].authenticate()
if(Auth.error)
  //do something with Auth.error
else if(Auth.success)
  //Auth.success will return a array with user data
```
ERRORS
```js
//no cookie or session set yet
{error:{cookie:true}}
```
```js
//Santax error with cookie, cookie auto deletes when this error has ret
{error:{santax:true}}
```
```js
//authentication error, cookie auto deletes when this error has ret
{error:{auth:true}}
```
#### &bull; res.mongo[].reAuthenticate (used to change authtokens and encryption)
USAGE
```js
let Auth = await res.mongo["your cookie name"].reAuthenticate()
if(Auth.success)
//handle success
else //handle error
```
ERRORS
<br> note! all auth and login erros apply
#### &bull; res.mongo[].login (used to log user in)
USAGE
```js
let LoginAuth = await res.mongo["your cookie name"].login({
  //credentials
},{
  remember:true//if remember me it will use a cookie, if false or null, it will use session
  dontSanatize:true//if true it wont sanatize input, use with cuation

  dontLockon:true//if true will disable lockon, use with cuation
})
if(LoginAuth.error)
  //handle error
else if(LoginAuth.success){
  //LoginAuth.success.index can be used to set the new user index
  //handle login success will only return true or null,
  //use authenticate to get user data
}
```
ERRORS
<br> note! all auth erros apply
```js
//account locked becuase of lockon
{error:{locked:{attempts:/*amount of invalid attempts*/,timeleft:/*amoutn of time left*/}}}
```
```js
//bad input characters
{error:{input:true}}
```
```js
//user does not exist
{error:{user:true}}
```
```js
//password authentication is wrong
{error:{password:true}}
```
```js
//user has already been loged in on this device
{error:{users:true}}
```
#### &bull; res.mongo[].generateOTP (used to generate OTP for login, only avalable if otp is set in config)
USAGE
```js
let otpRes = await res.mongo["your cookie name"].generateOTP(/*login input 1*/,{
//same as login input but
authenticate:true // if set to true authWith details will be autofilled,
//so the user will need a password if null undefined or false, and wont need one if true
//this can be used for login, password recovery or confirming a users account after signup
//you can use dontLockon to skip bypass locked acounts
})
if(otpRes.success)
	var key = otpRes.success.key //important, this key must be sent to browser
else
//handle error
```
note! only one OTP is available per user
<br>
ERRORS
<br> note! all auth and login errors apply
#### &bull; res.mongo[].loginWithOTP (used to log user in with OTP, only avalable if otp is set in config)
USAGE
```js
let loginRes = await res.mongo["your cookie name"].loginWithOtp(/*key sent to browser*/,/*key sent to callback*/)
if(loginRes.success){
	//user is loged in
}else{
	//otp failed
}
```
ERRORS
<br> note! all auth and login erros apply
```js
{key:true}//browser key is bad
```
```js
{password:true}//ont time password is bad
```

#### &bull; res.mongo[].logout (used to log user out)
USAGE
```js
let LogoutAuth = await res.mongo["your cookie name"].logout(userIndex)
//returns {success:{session:true,SessionIndex:Number(x),clearedToken:session[x]}} if session loged out and  
//returns {success:{cookie:true,CookieIndex:Number(x),clearedToken:cookie[x]}} if cookie loged out
```
ERRORS
<br> note! all auth erros apply
```js
//no user at index
{error:{index:true}}
```
## using with lockon

lockon blockes users from loging in after failed attemts
```js
const login = expressMongoLogin(userModel,{
  //lockon config
  lockon:{
      5:{//on 5 attempts
        timeout:1000*60,
        callback:id=>{
          console.log("user "+id+" locked out for 1 minute")
        },
      },
      6:{//on 6 bad attempts
        timeout:1000*60*3,
        callback:id=>{
          //callback with id, you can use this to notify users of bad activity
          console.log("user "+id+" locked out for 3 minute")
        },
      }
  },
})
```
## Experimental example
note! some customization might be needed
app.js
```js
const mongoose = require("mongoose")
const express = require("express")
const expressMongoLogin = require("../")
mongoose.connect("mongodb://localhost/test2")
const userModel = new mongoose.model("Users", new mongoose.Schema({
  Username: String,
  Email: String,
  Password: String,
},{autoCreate: false,autoIndex: false}))
const app = express()
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server)
server.listen(3000)
const CookieSecret = "BABA BLACK SHEEP"
const login = expressMongoLogin(userModel,{
  secret:CookieSecret,
  cookie:{
    'Same Site':"strict",
    maxAge:1000*60*60*12*7
  },
  Session:{
    secret:CookieSecret,
    cookie:{
      'Same Site':"strict",
      maxAge:1000*60*60
    },
  },
  cookieName:"Users",
  findWith:"Email,Username",
  authWith:"Password",
  authTimeout:1000*60*60*12,
  otp:{
    length:8,
    timeout:1000*60*5,
    callback:async(user,password)=>{
      console.log(password)
    }
  },
  lockon:{
      5:{
        timeout:1000*60,
        callback:id=>{
          console.log("user "+id+" locked")
        },
      },
      6:{
        timeout:1000*60*3,
        callback:id=>{
          console.log("user "+id+" locked")
        },
      }
  },
})
app.use(login)
io.use(login.io())
app.use(express.json())
app.use(express.static(__dirname+'/static'))
io.on('connection',async socket=>{
  socket.on('authenticate',async()=>{
    socket.emit("authenticated",await socket.request.mongo.Users.authenticate())
  })
})
app.post("/re-auth",async (req,res)=>{
 res.json(await res.mongo.Users.reAuthenticate())
})
app.post("/login",async (req,res)=>{
 res.json(await res.mongo.Users.login(req.body.auth,req.body.config))
})
app.post("/login/otp/generate",async (req,res)=>{
 res.json(await res.mongo.Users.generateOTP(req.body.auth,req.body.config))
})
app.post("/login/otp/",async (req,res)=>{
  res.json(await res.mongo.Users.loginWithOTP(req.body.browser_key,req.body.user_key))
})
app.post("/logout",async (req,res)=>{
  res.json(await res.mongo.Users.logout(req.body.x))
})
app.post("/logoutAll",async (req,res)=>{
  res.json(await res.mongo.Users.logoutAll())
})
```
static/index.html
```html
<style media="screen">
  html{
    background:#000;
    color:#fff;
    font-family:monospace
  }
</style>
<h1>please use the console to test the functions</h1>
&bull; Windows/Linux: Press Control + Shift + K
<br>
<br>&bull; Mac: Press Command + Option + K
<br>
<br><a target="_blank" href="https://www.npmjs.com/package/express-mongo-login?activeTab=readme">read manual</a>
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
<script type="text/javascript">
  var socket = io();
  var onAuthArray = []
  onAuth = callback =>{
    onAuthArray.push(callback)
  }
  socket.on("authenticated",auth=>{for(callback of onAuthArray)callback(auth)})
  socket.emit('authenticate')
  async function logout(x){
    const response = await fetch("/logout", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({x}),
      });
      var res = await response.json()
      if(res.success)window.location.href=window.location.href
      return res
  }
  async function logoutAll(){
    const response = await fetch("/logoutAll", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body:'{}',
      });
      var res = await response.json()
      if(res.success)window.location.href=window.location.href
      return res
  }
  async function login(auth,config){
    const response = await fetch("/login", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({auth,config}),
      });
      var res = await response.json()
      if(res.success)window.location.href=window.location.href
      return res
  }
  async function generateOTP(auth,config){
    const response = await fetch("/login/otp/generate", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({auth,config}),
      });
      return await response.json()
  }
  async function loginWithOTP(browser_key,user_key){
    const response = await fetch("/login/otp", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({browser_key,user_key}),
      });
      var res = await response.json()
      if(res.success)window.location.href=window.location.href
      return res
  }
  async function reAuthenticate(){
    const response = await fetch("/re-auth", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body:'{}',
      });
      var res = await response.json()
      if(res.success)window.location.href=window.location.href
      return res
  }
  async function signup(auth,config){
    const response = await fetch("/signup", {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({auth,config}),
      });
      return await response.json()
  }
  onAuth(auth=>{
    console.info('auth',auth)
  })
</script>
```
# tools

### Signup

```js
//express mongo signup tool
const signupTool = require('express-mongo-login').tools.signup
//make new signup
const Signup = new signupTool(database.Users,{
  findWith:"Email",//findWith is the main unique element that will be used to find/get user, required
  timeout:1000*60*3,//sets time for when key expires defualt is 5 mins
  keyLength:8,//sets key length, defualt is 12
  characters:"0123456789"//sets key characters
})
//create generate route
app.post("/signup/generate",async(req,res)=>{
      //clean input
      const {Email,Username,Password} = req.body //get data from body
      //if items arnet strings
      if(typeof Email!="string"||typeof Username !="string"||typeof Password !="string")
        return res.json({error:{santax:true}})//send error and return
      //input is clean, generate key
      const generated = await Signup.generateKey({Email,Username,Password}) // generateKey with user data, data will be saved untill key expires/timesout
      //if error while generating key, send error and return
      if(generated.error)
        return res.json(generated)
      //generated.success is signup key, send to user using third party application
      const Key = generated.success
      //send success
      res.json({success:true})
})
//create confrim rout
app.post("/signup/confirm",async(req,res)=>{
  //clean input
  const {Email,Key} = req.body // get email and key from req.body
  if(typeof Email!="string"||typeof Key !="string")//check that email and key are strings
    return res.json({error:{santax:true}})//if input not clean return and send error
  //confirm key with Email and sent Key
  const response = Signup.confirmKey(Email,Key)
  //check if error confirming key
  if(response.error)return res.json({error:response.error})//return and send error
  //no errors, key correct, create user with data from response.success, also add defualts ect...
  await database.Users.create({...response.success})
  //send success
  res.json({success:true})
})
```
