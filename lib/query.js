var util   = require( "./util" )
  , types  = require( "./types" )
  , client = require( "./client" )

function segsToPath ( segments ) {
  var path = Array.prototype.join.call( segments, "/" );

  if ( path[0] !== "/" )
    path = "/" + path;

  return path;
}

function Query () {
  return new Query.q( Array.prototype.slice.call( arguments ));
}

Query.q = function ( pathSegments ) {
  this._query = {
      path    : segsToPath( pathSegments || [] )
    , params  : {}
    , headers : {}
  };
};

Query.q.prototype = {
  _clone: function () {
    var clonedQuery = util.jsonClone( this._query )
      , query = new Query.q();

    query._query = clonedQuery;
    return query;
  },

  toObject: function () {
    return util.jsonClone( this._query );
  },

  path: function (/* pathSegments */) {
    var q = this._clone()
      , p = Array.prototype.join.call( arguments, "/" );

    if ( p[0] !== "/" ) {
      p = "/" + p;
    }

    q._query.path = p;
    return q;
  },

  header: function ( key, val ) {
    var q = this._clone()
      , o = {};
    o[ key ] = val;
    util.extend( q._query.headers, o );
    return q;
  },

  only: function (/* fields... */) {
    var args = Array.prototype.slice.call( arguments )
      , q = this._clone();
    q._query.params.only = args.join( "," );
    return q;
  },

  start: function ( start ) {
    var q = this._clone();
    q._query.params.start = start;
    return q;
  },

  limit: function ( limit ) {
    var q = this._clone();
    q._query.params.limit = limit;
    return q;
  },

  order: function ( order ) {
    var q = this._clone();
    q._query.params.order = order;
    return q;
  },

  sort: function ( sort ) {
    var q = this._clone();
    q._query.params.sort = sort;
    return q;
  },

  refs: function ( refs ) {
    var q = this._clone();
    q._query.params.refs = refs;
    return q;
  },

  criteria: function ( field, operator, operand ) {
    var q = this._clone()
      , e = { type  : "expression" , value : {} };

    if ( operand == undefined ) {
      operand = operator;
      operator = null;
    }

    var opType = util.type( operand );

    function wrapType ( val ) {
      return types.wrapField( field, val );
    }

    if ( opType == "date" ) {
      operand = operand.getTime();
    }

    if ( opType == "regexp" ) {
      e.value.operator = "regex";
      e.value.operand  = operand.source;

      if ( operand.global || operand.ignoreCase || operand.multiline ) {
        var flags = "";
        if ( operand.global ) flags += "g";
        if ( operand.ignoreCase ) flags += "i";
        if ( operand.multiline ) flags += "m";
        e.value.operand = "(?" + flags + ")" + e.value.operand;
      }
    }

    else if ( opType == "array" ) {
      e.value.operator = "in";
      e.value.operand = operand.map( wrapType );
    }

    else if ( operator ) {
      e.value.operator = operator;
      e.value.operand = wrapType( operand );
    } 

    else {
      e = wrapType( operand );
    }

    if ( util.type( q._query.params.criteria ) != "object" ) {
      q._query.params.criteria = {};
    }

    q._query.params.criteria[ field ] = e;
    return q;
  },

  _client: function () {
    return client.RestClient.activeClient();
  },

  get: function ( callback ) {
    return this._client().get( this._query, callback );
  },

  post: function ( body, callback ) {
    return this._client().post( this._query, body, callback );
  },

  put: function ( body, callback ) {
    return this._client().put( this._query, body, callback );
  },

  delete: function ( body, callback ) {
    if ( arguments.length == 1 && typeof body == "function" ) {
      return this._client().delete( this._query, body );
    } else {
      return this._client().delete( this._query, body, callback );
    }
  },

  mget: function ( body, callback ) {
    return this._client().mget( this._query, body, callback );
  },

  mput: function ( body, callback ) {
    return this._client().mput( this._query, body, callback );
  }
};

module.exports = {
  Query : Query
};
