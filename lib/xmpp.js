// Setup
// -----

// Dependencies:
// 
//   * `crypto` for signing the connection request.
//   * `events` for extending EventEmitter
//   * `/.util` for helper functions
//   * `/.types` for converting data as strings to their appropriate types
//
var crypto = require( "crypto" )
  , events = require( "events" )
  , util   = require( "./util" )
  , types  = require( "./types" )
  , xmpp;

// Try to require node-xmpp. This isn't a hard requirement for the lib as not
// everyone will need XMPP support.
try { 
  xmpp = require( "node-xmpp" );
} catch ( e ) {
  xmpp = null;
}

// Where to find the XMPP server
exports.XMPP_HOST = "xmpp.flow.net";
exports.XMPP_PORT = 5222;
exports.XMPP_JID  = "pubsub.xmpp.flow.net";

// A presence stanza needs to be sent every so often so the connection won't
// timeout. This configures it to be sent every minute.
exports.PRESENCE_INTERVAL = 10 * 1000;

// XmppClient
// ----------

// The XmppClient requires a key, secret, and actor to connect. The actor can
// be either your application or a specific identity.
//
//     // Connect as your application
//     var xmpp = new flow.XmppClient( <key>, <secret>, {
//         appName : "mycoolapp"
//     });
// 
//     // Connect as a specific identity
//     var xmpp = new flow.XmppClient( <key>, <secret>, {
//         appName : "mycoolapp"
//       , identityId : "<identity_id>"
//       , identityAlias : "<identity_alias>"
//     });
//
// XmppClient inherits from EventEmitter and emits the following events:
//
//   * __online:__ When the client successfully connects
//   * __offline:__ When the client disconnects
//   * __error:__ When the client fails to connect
//   * __/drop/&lt;flow_id&gt;:__ When a new drop comes in for a specific flow

function XmppClient ( key, secret, actor ) {
  var appName = actor.appName
    , identId = actor.identityId
    , alias   = actor.identityAlias;

  events.EventEmitter.call( this );

  var shasum = crypto.createHash( "sha1" );
  shasum.update( key );
  shasum.update( secret );
  if ( identId ) shasum.update( identId );

  this._client = new xmpp.Client({
      jid      : appName + (alias ? "#" + alias : "") + "@" + exports.XMPP_HOST
    , password : shasum.digest( "hex" )
    , host     : exports.XMPP_HOST
    , port     : exports.XMPP_PORT
  });

  this._client
    .on( "online",  this._connectHandler.bind( this ))
    .on( "stanza",  this._stanzaHandler.bind( this ))
    .on( "error",   this._errorHandler.bind( this ))
    .on( "offline", this._offlineHandler.bind( this ));

  this._events = {};
  this._presenceInterval = null;
}

// Inherit from EventEmitter.
util.inherits( XmppClient, events.EventEmitter );

// XmppClient Instance Methods
// ---------------------------
util.extend( XmppClient.prototype, {
  // Handler for a successful connection.
  _connectHandler: function () {
    var self = this;

    // Start the presence interval
    this._presenceInterval = setInterval( function () {
      self._client.send( new xmpp.Presence({ to: exports.XMPP_JID }));
    }, exports.PRESENCE_INTERVAL );

    this.emit( "online" );
  },

  // Handler for any incoming stanzas.
  _stanzaHandler: function ( stanza ) {
    // The server periodically sends a ping request. Respond with a pong.
    if ( stanza.attrs.type == "get" ) {
      if ( extractNode( "ping", stanza, 2 )) {
        this._client.send( this._iq( "pong" ));
      }

    // If a drop comes in, parse it and send it out.
    } else if ( stanza.attrs.type == "result" ) {
      var drop = extractNode( "drop", stanza, 2 );
      if ( drop ) {
        drop = ltxToVal( drop, false );
        this.emit( "/drop/" + drop.flowId, drop );
      }
    }
  },

  // Simple proxy handler for a connection error.
  _errorHandler: function ( e ) {
    this.emit( "error", e );
  },

  // Handler for a disconnect.
  _offlineHandler: function () {
    clearInterval( this._presenceInterval );
    this.emit( "offline" );
  },

  // Helper for constructing (un)subscribe stanzas for a flow.
  _iq: function ( type, flowId ) {
    return new xmpp.Iq({ type: "set", to: exports.XMPP_JID, id: (+ new Date) })
      .c( "query", { xmlns: "flow:pubsub" })
        .c( type, flowId ? { flow: flowId } : {});
  },

  // Helper for sending a susbcribe stanza.
  _subscribe: function ( flowId ) {
    this._client.send( this._iq( "subscribe", flowId ));
  },

  // Helper for sending an unsibscribe stanza.
  _unsubscribe: function ( flowId ) {
    this._client.send( this._iq( "unsubscribe", flowId ));
  },

  // Custom implementation of addListener that performs special logic when
  // subscribing to a flow.
  addListener: function ( event, func ) {
    // If it's a drop event, send a subscribe stanza.
    if ( event.indexOf( "/drop/" ) === 0 ) {
      if (!( event in this._events )) {
        this._subscribe( event.substr( 6 ));
      }
    }

    return events.EventEmitter.prototype
      .addListener.call( this, event, func );
  },

  // Custom implementation of removeListener that performs special logic when
  // unsubscribing from a flow.
  removeListener: function ( event, func ) {
    events.EventEmitter.prototype
      .removeListener.call( this, event, func );

    // Send an unsubscribe stanza for drop events.
    if ( event.indexOf( "/drop/" ) === 0 ) {
      if (!( event in this._events )) {
        this._unsubscribe( event.substr( 6 ));
      }
    }

    return this;
  },

  // Custom implementation of removeAllListeners that will send out
  // unsubscribe stanzas for any open drop listeners.
  removeAllListeners: function () {
    for ( var event in this._events ) {
      if ( event.indexOf( "/drop/" ) === 0 ) {
        this._unsubscribe( event.substr( 6 ));
      }
    }

    return events.EventEmitter.prototype
      .removeAllListeners.call( this );
  },

  // End the connection
  disconnect: function () {
    this._client.end();
    return this;
  }
});

// Overwrite the old `on` implementation with the new one.
XmppClient.prototype.on = XmppClient.prototype.addListener;

// Export XmppClient. If node-xmpp isn't installed, return a function that
// will throw an error prompting you to install it.
exports.XmppClient = xmpp ? XmppClient : function () {
  throw new Error( "node-xmpp is required for XmppClient" );
};

// Module helper for turning the compact `ltx` representation of a drop stanza
// into a format that matches an API response.
function ltxToVal ( node, strict ) {
  var ret;
  if ( typeof node.children[0] === "string" ) {
    ret = types.typeToPrimitive( node.attrs.type, node.children.join( "" ));
  } else {
    ret = {};
    node.children.forEach( function ( child ) {
      ret[ child.name ] = ltxToVal( child, node.name === "elems" || strict );
    });
  }

  return strict ? { type: node.attrs.type, value: ret } : ret;
}

// Module helper for searching an `ltx` tree for a specific node.
function extractNode ( name, parent, depth ) {
  if ( !(typeof depth === "number") || depth < -1 )
    depth = -1

  if ( parent && parent.name === name )
    return parent;

  if ( parent && parent.children && parent.children.length && depth !== 0 ) {
    for ( var i = 0, node; i < parent.children.length; i++ ) {
      node = extractNode( name, parent.children[i], depth - 1 );
      if ( node ) return node;
    }
  }

  return false;
}
