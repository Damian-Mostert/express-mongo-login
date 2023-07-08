var generateString = require('./generateString.js')
module.exports = {
  //signup helper tool
  signup:class signupTool{
    //main generateKey
    async generateKey(User){
      if(await this.model.findOne(User))
        return {error:{user:true}}
      var newKeySecret = generateString(this.maxKeyLength,this.allowedCharacters)
      var newKey = this.newConfirmationKey(newKeySecret,User)
      newKey.timeout = setTimeout(()=>{
        this.clearConfirmKey(User[Config.findWith])
      },this.timeout)
      this.ConfirmationKeys.push(newKey)
      return {success:newKeySecret}
    }
    //main confirmKey
    confirmKey(findWith,Key){
      var k = this.getConfirmKey(findWith)
      if(k?.Key == Key){
        clearTimeout(k.timeout)
        return {success:this.clearConfirmKey(findWith)}
      }
      else return{error:true}
    }
    constructor(Model,Config={}){
      //if no find with error
      if(typeof Config.findWith!='string')
        throw new Error('express-mongo-login signup tool requires authWith, and authWith must be string')
      //set basics
      this.model = Model
      this.timeout = Config.timeout||(1000*60*5)
      this.findWith = Config.findWith
      this.maxKeyLength = Config.keyLength||12
      this.allowedCharacters = Config.characters
      this.ConfirmationKeys = []
      //function for new key
      this.newConfirmationKey = function newConfirmationKey(Key,User){
        for(let i in this.ConfirmationKeys)
          if(this.ConfirmationKeys[i].User[Config.findWith] == User[Config.findWith])
            this.ConfirmationKeys.splice(i,1)
        return {Key,User}
      }
      //funtion to clear key
      this.clearConfirmKey = function clearConfirmKey(findWith){
        for(let i in this.ConfirmationKeys)
          if(this.ConfirmationKeys[i].User[Config.findWith] == findWith)
            return this.ConfirmationKeys.splice(i,1)[0].User
      }
      //funtion to get key
      this.getConfirmKey = function getConfirmKey(findWith){
        for(let i in this.ConfirmationKeys)
          if(this.ConfirmationKeys[i].User[Config.findWith] == findWith)
            return this.ConfirmationKeys[i]
      }
    }
  }
}
