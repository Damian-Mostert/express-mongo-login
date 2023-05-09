# express-mongo-login
a easy and secure way to manage your user data with express and mongoose.

### install 

```cmd
npm i express-mongo-login
```

## how the authentication works :

 First the user will log in, this will set a session or a cookie depending on the remember option.
<br>The cookies and sessions are both token arrays, the tokens contain encrypted data and a pseudo key, the server uses the pseudo key to find the real randomly generated key to decrypt the data for each user.
<br> The decrypted  data contains a authentication token and the user._id,  the data that returned the key to decrypt the data in the first place contains this user._id and authentication-token, they will both be compared. if successful it will return the user data, note all items in array are unique, if one fails all other tokens get removed and the cookie as well as the session is deleted.

### Express Mongo Login function
```js
                                      //database model
app.use(expressMongoLogin(userModel,{
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
}))
```
### with socket.io
```js
const userRout = expressMongoLogin(userModel,{
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
io.use((socket,next)=>{
	userRout(socket.request,{},next)
})
```
you can now use socket.request to authenticate users, but not to login or logout.

### using this will enable the following :
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
{error:{noCookie:true}}
```
```js
//Santax error with cookie, cookie auto deletes
{error:{Santax:true}}
```
```js
//authentication error, cookie auto deletes
{error:{Auth:true}}
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
<br> !note all auth and login erros apply
#### &bull; res.mongo[].login (used to log user in)
USAGE
```js
let LoginAuth = await res.mongo["your cookie name"].login({
  //credentials
},{
  remember:true//if remember me it will use a cookie, if false or null, it will use session
})
if(LoginAuth.error)
  //handle error
else if(LoginAuth.success){
  //handle login success will only return true or null,
  //use authenticate to get user data
}
```
ERRORS
<br> !note all auth erros apply
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
{error:{overlogin:true}}
```
#### &bull; res.mongo[].logout (used to log user out)
USAGE
```js
let LogoutAuth = await res.mongo["your cookie name"].logout(userIndex)
//returns {success:{session:true,SessionIndex:Number(x),clearedToken:session[x]}} if session loged out and  
//returns {success:{cookie:true,CookieIndex:Number(x),clearedToken:cookie[x]}} if cookie loged out
```
ERRORS
<br> !note all auth erros apply
```js
{error:{noUserAtIndex:true}}
```
#### MORE ACTIONS COMMING SOON...
## Working Example

app.js
```js
//import mongoose
const mongoose = require("mongoose")
//import express
const express = require("express")
//import express-mongo-login
const expressMongoLogin = require("./")
//connect to mongodb
mongoose.connect("mongodb://localhost/test2")
//create user model
const userModel = new mongoose.model("Users", new mongoose.Schema({
  Username: String,
  Email: String,
  Password: String,
},{autoCreate: false,autoIndex: false}))

//toggle and edit if you want to create a user
//let main=async ()=>{console.log(await userModel.create({Username:"Damian",Email:"damianmostert86@gmail.com",Password:"1234",}))};main()

//create server
const app = express()
const http = require('http');
const server = http.createServer(app);
//make socket io server
const { Server } = require("socket.io");
const io = new Server(server)

//listen
server.listen(3000)

//make cookie secret

const CookieSecret = "BABA BLACK SHEEP"
const userRout= expressMongoLogin(userModel,{
  cookieName:"Users",
  findWith:"Email,Username",
  authWith:"Password",
  authTimeout:1000*60*60*12,//12 hrs timout
  secret:CookieSecret,
  cookie:{
    maxAge:1000*60*60*12,//12 hrs timout
  },
  Session:{
    secret:CookieSecret,
    cookie:{
        maxAge:1000*60*60*12,//12 hrs timout
     },
  },
})
app.use(express.json())//for req.body
//make express use rout
app.use(userRout)
//enable auth on socket
io.use((socket,next)=>{
	userRout(socket.request,{},next)
})

io.on('connection',async socket=>{
  console.log("a user connected")
  console.log(await socket.request.mongo.Users.authenticate())
})


app.get("/",async(req,res)=>{
  let auth = await req.mongo.Users.authenticate()
  if(auth.error){
    res.send("<a href='/login'>Go to login</a>")
  }else{
    res.send(`
      <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
      <script>
        var socket = io();
      </script>
      you are loged in
      `)
  }
})
app.get("/login",async (req,res)=>{
  res.sendFile(__dirname+"/login.html")
})
app.post("/basic-login",async (req,res)=>{
 res.json(await res.mongo.Users.login({
   Email:req.body.EmailOrUsername,
   Username:req.body.EmailOrUsername,
   Password:req.body.Password
 },{
   remember:req.body.remember
 }))
})
app.get("/logout",async (req,res)=>{
  res.json(await res.mongo.Users.logout(req.query.u))
})
app.post("/signup",(req,res)=>{
  //make new user over here
})

```
login.html
```html
<!DOCTYPE html>
<html>
  <body>
    <h1>Login Example</h1>
    <br><input id="EmailOrUsername">
    <br><input id="Password">
    <br>rememberMe<input type="checkbox" id="remember">
    <br><button onclick="login(document.getElementById('EmailOrUsername').value,document.getElementById('Password').value,document.getElementById('remember').checked)">Submit</button>
  </body>
</html>
<script>
async function login(EmailOrUsername,Password,remember){
  const response = await fetch("/basic-login", {
    method: "POST",
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    headers: {"Content-Type": "application/json",},
    body: JSON.stringify({EmailOrUsername,Password,remember}),
  });
  const jsonData = await response.json();console.log(jsonData);if(jsonData.success)window.location.href="/"
}
</script>
