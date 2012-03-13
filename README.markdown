## Flow.net REST Client

Get started by creating a new instance of `RestClient` and passing in your API
key, secret, and optionally the id of your actor.

    var flow = require( "flow" );
    var api  = new flow.RestClient( <key>, <secret>, <actor> );

You should only need to create one RestClient instance for your application.

At any point in your program flow, you can change the actor by calling
`setActor` on the client and passing in an id. Any subsequent API calls will
then be requested on behalf of that actor.

    api.setActor( <identity_id> );

Default request options can be set by calling `setOptions` passing in a map of
headers and query paramaters.

    api.setOptions({
        params  : { hints : 0 }
      , headers : { ... }
    });

By default, type hints are turned off as they don't generally provide much
value in a dynamically typed language such as Javscript.

Any request can be made by calling `request` and passing in a configuration
object and a callback function. For example, to create a new flow:

    var opts = {
        path   : "/flow"
      , method : "POST"
      , params : { ... }
      , body   : {
          path : "/path/to/my/new_flow"
        , name : "My New Flow"
      }
    };

    api.request( opts, function ( e, resp, flow ) {
      ...
    });

The request body will automatically be stringified for you. The callback is
passed three arguments: an error (if there is some sort of network issue), the
entire parsed response, and finally the parsed response body.

Helper methods exist to alleviate the tedium:

    // Get a resource
    api.get( "/flow/<my_flow_id>", function ( e, resp, flow ) {
      ...
    });

    // Create a resource
    var body = {
        path : "/path/to/my/new_flow"
      , name : "My New Flow"
    };

    api.post( "/flow", body, function ( e, resp, flow ) {
      ...
    });

    // Update a resource
    var body = { name: "My Updated Name" };
    api.put( "/flow/<my_flow_id>", body, function ( e, resp, flow ) {
      ...
    });

    // Delete a resource
    api.delete( "/flow/<my_flow_id>", function ( e, resp, flow ) {
      ...
    });

    // Retrieve multiple resources
    var flowIds = ["<flow_id_a>", "<flow_id_b>"];
    api.mget( "/flow", flowIds, function ( e, resp, flows ) {
      ...
    });

    // Update multiple resources
    var flowUpdates = {
        "<flow_id_a>" : { ... }
      , "<flow_id_b>" : { ... }
    };

    api.mput( "/flow", flowUpdates, function ( e, resp, flows ) {
      ...
    });

Calls to `delete` can also take a request body like the other calls in certain
instances. If you would like to override params or headers, you can pass in a 
configuration object like when calling `request`.

    // Get references with this request
    var opts = {
        path   : "/flow/<my_flow_id>"
      , params : { refs: 1 }
    };

    api.get( opts, function ( e, resp, flow ) {
      // References are now in the head
      var refs = resp.head.references;

      // Get the identity of the flow's creator
      var creator = refs.identity[ flow.creatorId ];
    });

## Query Builder

Complex requests can get quite verbose in their configuration, so we've
included a chainable query builder to simplify the process.

    var flow = require( "flow" );
    var Query = flow.Query;
    
    // Start by creating a RestClient instance for your application
    // The query builder is aware of the currently active client
    var api = new flow.RestClient( <key>, <secret>, <actor> );

    // Find 10 flows created after a certain date with a path that
    // matches a RegExp.
    var flowQuery =
      Query( "flow" )
        .criteria( "creationDate", ">=", new Date( "Jan 1, 2011" ))
        .criteria( "path", /^my\/path\/(a|b)\// )
        .limit( 10 )

    flowQuery.get( function ( e, resp, flows ) {
      ...
    });

The `Query` constructor takes a variable number of arguments specifiying the
various segments in the objects URI.

    // Get only the id and path of a specific drop
    Query( "drop", "<flow_id>", "<drop_id>" )
      .only( "id", "path" )
      .get( function ( e, resp, drop ) {
        ...
      });

Each method creates a clone of the query, so you can predefine queries that
build on top of one another.

    var sortedQuery = Query( "flow" ).sort( "lastEditDate" );
    var smallSortedQuery = sortedQuery.only( "id", "name", "lastEditDate" );

    // Get flows sorted by `lastEditDate`
    sortedQuery.get( function ( e, resp, flows ) {
      ...
    });

    // Get only a few members
    smallSortedQuery.get( function ( e, resp, flows ) {
      ...
    });

They query builder can also be used to make other kinds of HTTP requests, but
methods such as `criteria` only apply for `get`.

    var pathQuery = Query( "flow" ).criteria( "path", /my\/path\/(a|b)/ );

    // Attempt to delete all flows that match a path
    // This will fail as delete must be called on specific resources
    pathQuery.delete( ... );

    // Deleting a specific flow will work however
    Query( "flow", "<flow_id>" ).delete();

## Flow.net XMPP Client

Connect using our XMPP client and get drop updates in realtime. Pass in your
key, secret, and a configuration object for the actor.

    var flow = require( "flow" );
    
    // Connect as your application
    var xmpp = new flow.XmppClient( <key>, <secret>, {
        appName : "mycoolapp"
    });

    // Connect as a specific identity
    var xmpp = new flow.XmppClient( <key>, <secret>, {
        appName : "mycoolapp"
      , identityId : "<identity_id>"
      , identityAlias : "<identity_alias>"
    });

Once connected, you can start listening in on specific flows.

    xmpp.on( "online", function () {
      xmpp.on( "/drop/<flow_id>", function ( drop ) {
        // A new drop came in!
      });
    });

`XmppClient` implements the standard `EventEmitter` interface and emits the
following events:

* __online:__ When the client successfully connects
* __offline:__ When the client disconnects
* __error:__ When the client fails to connect
* __/drop/&lt;flow_id&gt;:__ When a new drop comes in for a specific flow

Disconnect at any time by calling `disconnect()`.
