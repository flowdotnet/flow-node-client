var util = require( "util" );

function type ( val ) {
  var typeStr = Object.prototype.toString.call( val );
  return typeStr.substring( 8, typeStr.length - 1 ).toLowerCase();
};

function jsonClone ( val ) {
  // If it's a primitive, just return the primitive
  if ( typeof val != "object" && typeof val != "function" ) {
    return val;
  }

  var t = type( val );

  if ( t == "array" ) {
    var list = [], newVal;
    for ( var i = 0; i < val.length; i++ ) {
      newVal = jsonClone( val[i] );
      if ( newVal !== undefined ) {
        list.push( newVal );
      }
    }
    return list;
  }

  if ( t == "object" ) {
    var obj = {}, newVal;
    for ( var x in val ) {
      newVal = jsonClone( val[x] );
      if ( newVal !== undefined ) {
        obj[x] = newVal;
      }
    }
    return obj;
  }

  return undefined;
};

function extend () {
  var len = arguments.length;
  
  if ( len === 0 ) return {};
  if ( len === 1 ) return arguments[0];

  var a = arguments[0], b, i, x;
  for ( i = 1; b = arguments[i]; i++ ) {
    for ( x in b ) {
      a[x] = b[x];
    }
  }
  return a;
};

module.exports = {
    jsonClone : jsonClone
  , extend : extend
  , type : type
  , inherits : util.inherits
  , inspect : util.inspect
};
