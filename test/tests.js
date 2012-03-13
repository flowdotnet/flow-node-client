var flow   = require( "../lib/flow" )
  , config = require( "./config.json" )
  , util   = require( "./util" )
  , assert = require( "assert" );

//
// REST Client
// ===========
//

suite( "flow.RestClient", function () {

  var client = new flow.RestClient(
      config.key
    , config.secret
    , config.actor
  );

  var sample = {
      path : config.namespace + "/" + util.randomStr( 12 )
    , name : util.randomStr( 12 )
    , description : util.randomStr( 12 )
  };

  var sampleId;

  test( "POST", function ( done ) {
    client.post( "/flow", sample, function ( err, resp, flow ) {
      assert.ok( resp.head.ok );
      sampleId = flow.id;
      done();
    });
  });

  test( "GET", function ( done ) {
    client.get( "/flow/" + sampleId, function ( err, resp, flow ) {
      assert.ok( resp.head.ok );
      done();
    });
  });

  test( "PUT", function ( done ) {
    var update = {
      name : util.randomStr( 12 )
    };

    client.put( "/flow/" + sampleId, update, function ( err, resp, flow ) {
      assert.ok( resp.head.ok );
      done();
    });
  });

  test( "DELETE", function ( done ) {
    client.delete( "/flow/" + sampleId, function ( err, resp ) {
      assert.ok( resp.head.ok );
      done();
    });
  });

});

//
// Query
// =====
//

suite( "flow.Query", function () {

  var query = new flow.Query();

  test( "path", function () {
    var q = query.path( "flow", "foo", "bar" ).toObject();
    assert.equal( "/flow/foo/bar", q.path );
  });

  test( "header", function () {
    var q = query.header( "X-Foo", "Bar" ).toObject();
    assert.equal( "Bar", q.headers[ "X-Foo" ]);
  });

  test( "only", function () {
    var q = query.only( "foo", "bar" ).toObject();
    assert.equal( "foo,bar", q.params.only );
  });

  test( "start", function () {
    var q = query.start( 20 ).toObject();
    assert.equal( 20, q.params.start );
  });

  test( "limit", function () {
    var q = query.limit( 20 ).toObject();
    assert.equal( 20, q.params.limit );
  });

  test( "order", function () {
    var q = query.order( "asc" ).toObject();
    assert.equal( "asc", q.params.order );
  });

  test( "refs", function () {
    var q = query.refs( true ).toObject();
    assert.equal( true, q.params.refs );
  });

  test( "criteria:equality", function () {
    var q = query.criteria( "foo", "bar" ).toObject();
    assert.equal( "bar", q.params.criteria.foo.value );
  });

  test( "criteria:expression", function () {
    var q = query.criteria( "foo", "<", 10 ).toObject();
    assert.equal( "<", q.params.criteria.foo.value.operator );
    assert.equal( 10,  q.params.criteria.foo.value.operand.value );
  });

  test( "criteria:regex", function () {
    var q = query.criteria( "foo", /bar/i ).toObject();
    assert.equal( "regex", q.params.criteria.foo.value.operator );
    assert.equal( "(?i)bar", q.params.criteria.foo.value.operand );
  });

  test( "criteria:date", function () {
    var date = new Date()
      , q = query.criteria( "foo", date ).toObject();
    assert.equal( date.getTime(), q.params.criteria.foo.value );
  });

  test( "criteria:array", function () {
    var q = query.criteria( "foo", [ "bar" ]).toObject();
    assert.equal( "in", q.params.criteria.foo.value.operator );
    assert.equal( "bar", q.params.criteria.foo.value.operand[0].value );
  });

});

//
// XMPP Client
// ===========
//

suite( "flow.XmppClient", function () {
  function createXmppClient () {
    return new flow.XmppClient( config.key, config.secret, {
      appName : config.appName
    });
  }

  var client = new flow.RestClient( config.key, config.secret, config.actor );

  var sampleFlow = {
      path : config.namespace + "/" + util.randomStr( 12 )
    , name : util.randomStr( 12 )
  };

  var sampleDrop = {
      path : sampleFlow.path
    , elems : {
        title : { type: "string", value: util.randomStr( 12 ) }
      , description : { type : "text", value : {
            format : "html"
          , safe : true
          , content : util.randomStr( 12 )
        }
      }
    }
  };

  var flowId;

  setup( function ( done ) {
    client.post( "/flow", sampleFlow, function ( err, resp, flow ) {
      if ( resp.head.ok ) {
        flowId = flow.id;
        done();
      }
    });
  });

  test( "xmpp:drop", function ( done ) {
    var xmpp = createXmppClient();

    xmpp.on( "online", function () {
      xmpp.on( "/drop/" + flowId, function ( drop ) {
        done();
      });
      setTimeout( function () {
        client.post( "/drop", sampleDrop );
      }, 2000 );
    });
  });

  teardown( function ( done ) {
    client.delete( "/flow/" + flowId, function ( err, resp ) {
      done();
    });
  });
});
