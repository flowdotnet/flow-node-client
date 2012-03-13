// Setup
// -----

// Dependencies:
//
//   * `http` for requests to the Flow.net API.
//   * `crypto` for  signing the API requests.
//   * `querystring` for building a querystring from a map.
//   * `/.util` for helper functions.
//
var http = require( "http" )
  , crypto = require( "crypto" )
  , querystring = require( "querystring" )
  , util = require( "./util" )
  , extend = util.extend

// Module state for keeping track of the currently 'active' client (ie. the
// client used for FlowQueries).
var activeClient = null
  
// Where to find the API.
exports.API_HOST  = "api.flow.net";
exports.API_PORT  = 80;

// RestClient
// ----------

// The RestClient requires a key and secret to get started, but can optionally
// take an actor and an active flag. By default, when you create a new client
// it becomes the currently "active" client. Meaning it will be used by
// FlowQuery (which doesn't require you to pass it a RestClient). Explicitly
// setting the flag to `false` will prevent it from becoming the active client.
function RestClient ( key, secret, actor, active ) {
  this.key = key;
  this.secret = secret;
  this.actor = actor || null;
  this.setOptions({});

  if ( active !== false ) {
    this.activate();
  }
} 

exports.RestClient = RestClient;

// JSON is the default content type for requests and responses.
RestClient.MIME_JSON = "application/json";

// Default headers for requests: send and receive JSON.
RestClient.DEFAULT_HEADERS = {
    GET    : { "Accept" : RestClient.MIME_JSON }
  , DELETE : { "Accept" : RestClient.MIME_JSON }
  , POST   : { "Accept" : RestClient.MIME_JSON, "Content-type" : RestClient.MIME_JSON }
  , PUT    : { "Accept" : RestClient.MIME_JSON, "Content-type" : RestClient.MIME_JSON }
  , MGET   : { "Accept" : RestClient.MIME_JSON, "Content-type" : RestClient.MIME_JSON }
  , MPUT   : { "Accept" : RestClient.MIME_JSON, "Content-type" : RestClient.MIME_JSON }
};

// Default query paramaters for requests. Type hints are turned off by default
// as they don't provide much value in Javascript.
RestClient.DEFAULT_PARAMS = {
  hints : 0
};

// Class method for returning the currently active client.
RestClient.activeClient = function () {
  return activeClient;
};

// RestClient Instance Methods
// ---------------------------
RestClient.prototype = {
  // Make this client the active client.
  activate: function () {
    activeClient = this;
  },

  // Set the actor for the client.
  setActor: function ( actor ) {
    this.actor = actor;
    return this;
  },

  // Set default options for requests. Pass in an options object like this:
  //
  //     {
  //          headers : { ... }
  //       ,  params  : { ... } 
  //     }
  //
  setOptions: function ( opts ) {
    this.options = extend({ 
        headers : {}
      , params : extend({}, RestClient.DEFAULT_PARAMS )
    }, opts );

    return this;
  },

  // Signs the request with a sha1 hash of the actor, key, and timestamp.
  _makeSignature: function ( headers ) {
    var shasum = crypto.createHash( "sha1" );

    [ "X-Actor", "X-Key", "X-Timestamp" ].forEach( function ( key ) {
      shasum.update( key.toLowerCase() + ":" + headers[ key ]);
    });

    shasum.update( this.secret );
    return shasum.digest( "hex" );
  },

  // Returns proper credential headers for the request. Credentials include
  // the actor, the application key, the current time, and hash signature.
  _makeCreds: function () {
    var headers = {
        "X-Actor" : this.actor
      , "X-Key"   : this.key
      , "X-Timestamp" : + (new Date())
    };

    headers[ "X-Signature" ] = this._makeSignature( headers );
    return headers;
  },

  // Returns headers for the request.
  _makeHeaders: function ( headers, defaults ) {
    return extend({}
      , defaults || {}
      , headers || {}
      , this._makeCreds()
    );
  },

  // Generates a URI based based on the passed in URI and any query params.
  _makeURI: function ( uri, params ) {
    var parts = uri.split( "?" )
      , path = parts[0]
      , qs = parts.length > 1 ? parts[1] : "";

    for ( var x in params ) {
      // Stringify any objects, otherwise they'll show up blank.
      if ( typeof params[x] == "object" ) {
        params[x] = JSON.stringify( params[x] );
      }
    }

    qs += (qs.length ? "&" : "") + querystring.stringify( params );
    return path + (qs.length ? "?" + qs : "");
  },

  // Make an API request based on an options object with a callback. Available
  // options are as follows:
  //
  //     {
  //         path    : "/path/to/resource"
  //       , method  : "GET|POST|PUT|DELETE|MGET|MPUT"
  //       , body    : <Object or String>
  //       , headers : { ... }
  //       , params  : { ... }
  //     }
  //
  // Default headers and params will be overridden by the supplied options. If
  // an object is supplied for the body, it will be stringified before being
  // sent. The callback signature looks like this:
  // 
  //     function ( error, response, responseBody ) {
  //       ...
  //     }
  //
  // `error` should rarely be non-null as it is is used for network issues. If
  // there is an HTTP error, you can check `response.head` for the status code
  // and any messages. `responseBody` will be the resource(s) you requested.
  request: function ( requestOpts, callback ) {
    requestOpts = extend({
        host   : exports.API_HOST
      , port   : exports.API_PORT
      , path   : "/"
      , method : "GET"
      , body   : "",
    }, requestOpts );

    var defaultHeaders = RestClient.DEFAULT_HEADERS[ requestOpts.method.toUpperCase() ];
    requestOpts.headers = this._makeHeaders(
        extend( defaultHeaders, requestOpts.headers )
      , this.options.headers
    );

    requestOpts.path = this._makeURI(
        requestOpts.path
      , extend( this.options.params, requestOpts.params )
    );

    var requestBody = requestOpts.body;
    if ( requestBody && typeof requestBody != "string" ) {
      requestBody = JSON.stringify( requestBody );
    } else {
      requestBody = "";
    }

    requestOpts.headers[ "Content-length" ] = requestBody.length;

    var request = http.request( requestOpts, function ( resp ) {
      var len = parseInt( resp.headers[ "content-length" ])
        , data = "";

      resp.on( "data", function ( chunk ) {
        data += chunk;
        if ( data.length === len && callback ) {
          var json = JSON.parse( data );
          process.nextTick( function () {
            callback( null, json, json.body );
          });
        }
      });
    });

    request.on( "error", function ( e ) {
      callback && process.nextTick( function () {
        callback( e, {}, {});
      });
    });

    if ( requestBody ) {
      request.write( requestBody );
    }

    request.end();
    return request;
  },

  // The HTTP helper methods take a variable number of arguments. This returns
  // a consistent set of arguments that each one can use.
  _resolveArgs: function ( args ) {
    var requestOpts = {}
      , callback = null;

    if ( typeof args[0] == "string" ) {
      requestOpts.path = args[0];
    } else {
      extend( requestOpts, args[0] );
    }

    if ( typeof args[1] != "function" ) {
      requestOpts.body = args[1];
    } else {
      callback = args[1];
    }

    if ( !callback && args[2] ) {
      callback = args[2];
    }

    return [ requestOpts, callback ];
  },

  // Helper for making a request.
  _makeRequest: function ( args, method ) {
    args = this._resolveArgs( args )
    var requestOpts = args[0]
      , callback = args[1];

    requestOpts.method = method;
    return this.request( requestOpts, callback );
  },

  // These HTTP methods will take a path or options object, an optional
  // request body, and a callback. For GET requests, the request body will be
  // used as params.
  //
  //     // Request a flow:
  //     api.get( "/flow/<flow_id>", function ( e, resp, flow ) {
  //       console.log( flow.name );
  //     });
  //
  //     // Create a flow:
  //     var flowData = {
  //         name : "My New Flow"
  //       , path : "/path/to/my-flow"
  //     };
  //
  //     api.post( "/flow", flowData, function ( e, resp, flow ) {
  //       if ( resp.head.ok ) {
  //         console.log( "Flow created!" );
  //       }
  //     });

  get: function (/* requestOpts, body, callback */) {
    var args = this._resolveArgs( arguments )
      , requestOpts = args[0]
      , callback = args[1];

    if ( requestOpts.body ) {
      requestOpts.params = extend(
          requestOpts.params || {}
        , requestOpts.body
      );
      delete requestOpts.body;
    }

    requestOpts.method = "GET"; 
    return this.request( requestOpts, callback );
  },

  post: function (/* requestOpts, body, callback */) {
    return this._makeRequest( arguments, "POST" );
  },

  put: function (/* requestOpts, body, callback */) {
    return this._makeRequest( arguments, "PUT" );
  },

  delete: function (/* requestOpts, body, callback */) {
    return this._makeRequest( arguments, "DELETE" );
  },

  mget: function (/* requestOpts, body, callback */) {
    return this._makeRequest( arguments, "MGET" );
  },

  mput: function (/* requestOpts, body, callback */) {
    return this._makeRequest( arguments, "MPUT" );
  }
};
