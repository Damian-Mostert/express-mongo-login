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
