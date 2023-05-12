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
