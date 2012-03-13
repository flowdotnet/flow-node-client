var util = require( "./util" );

var FIELD_TYPES = {
    id                : "id"
  , alias             : "string"
  , avatar            : "url"
  , creationDate      : "date"
  , creator           : "map"
  , creatorId         : "id"
  , description       : "string"
  , displayName       : "string"
  , dropId            : "id"
  , dropPermissions   : "permissions"
  , elems             : "map"
  , email             : "string"
  , filter            : "string"
  , filterString      : "string"
  , firstName         : "string"
  , flags             : "flag"
  , flowId            : "id"
  , from              : "path"
  , groupIds          : "set"
  , hasChildren       : "boolean"
  , icon              : "url"
  , identities        : "set"
  , isDiscoverable    : "boolean"
  , isInviteOnly      : "boolean"
  , key               : "string"
  , lastEditDate      : "date"
  , lastEditorId      : "id"
  , lastName          : "string"
  , local             : "boolean"
  , location          : "location"
  , mimeType          : "string"
  , name              : "string"
  , parentId          : "id"
  , path              : "path"
  , permissions       : "permissions"
  , ratings           : "rating"
  , reference         : "url"
  , secret            : "string"
  , size              : "integer"
  , template          : "constraints"
  , text              : "string"
  , to                : "path"
  , topParentId       : "id"
  , transformFunction : "transform"
  , url               : "url"
  , userId            : "id"
  , weight            : "integer"
};

var TYPE_PRIMITIVES = {
    id                : "string"
  , boolean           : "boolean"
  , constraints       : "array"
  , date              : "date"
  , flag              : "object"
  , float             : "number"
  , integer           : "number"
  , location          : "object"
  , path              : "string"
  , permissions       : "object"
  , rating            : "object"
  , set               : "array"
  , string            : "string"
  , transform         : "object"
  , url               : "string"
}

function wrapField ( name, val ) {
  if ( !val.type || !val.value ) {
    val = { type: FIELD_TYPES[ name ], value: val };
  }
  return val;
};

function fieldType ( name ) {
  return FIELD_TYPES[ name ];
}

var milliReg = /^\d+$/;

function typeToPrimitive ( type, value ) {
  var prim = TYPE_PRIMITIVES[ type ];

  if ( typeof prim === "undefined" ) {
    return value;
  }

  switch ( prim ) {
  case "string":
    return String( value );
  case "number":
    return Number( value );
  case "date":
    if ( typeof value === "string" && value.match( milliReg ))
      value = Number( value );
    return + new Date( value );
  case "array":
    return util.type( value ) === "array" ? value : Array( value );
  case "boolean":
    return typeof value === "string" && value == "false"  ? false : !!value;
  default:
    return value;
  }
}

module.exports = {
    wrapField : wrapField
  , fieldType : fieldType
  , typeToPrimitive : typeToPrimitive
};
