module.exports = function generateString(length,characters='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
  //set result variabal
  let result = '';
  for ( let i = 0; i < length; i++ )
    result += characters.charAt(Math.floor(Math.random() * characters.length));
    //add random character to result
  return result;
}
