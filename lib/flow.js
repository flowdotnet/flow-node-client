var client = require( "./client" )
  , query = require( "./query" )
  , xmpp = require( "./xmpp" )

module.exports = {
    RestClient : client.RestClient
  , XmppClient : xmpp.XmppClient
  , Query : query.Query
};
