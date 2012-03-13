var STR_CHOICES = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";

function randomStr( len ) {
  var str = [];
  while ( len-- ) {
    str.push( STR_CHOICES.substr( Math.round( Math.random() * (STR_CHOICES.length - 1) ), 1 ));
  }
  return str.join( "" );
}

exports.randomStr = randomStr;
