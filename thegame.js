var redis = require('redis-client')
  , nerve = require('nerve')
  , sys = require('util')
  , qs = require('querystring')
  , cp = require('child_process')
  , _ = require('underscore')._;

/* Passes cb to a new instance redis.Client.connect
 * but handles error in connecting
 * accepts optional errback as second argument
 * the callback gets a this.redis representing the redis object
 *
 * Returns nothing
 */
var withRedis = function( cb ) {
  var errback = arguments[1];

  var r = redis.createClient();

  r.stream.on( 'connect', _.bind( cb, { redis : r } ) );

  r.stream.on( "end", function(error) {
    if( error ) {
      process.stdio.writeError( "Error connecting to Redis database\n" );
      if( typeof(errback) === "function" )
        errback();
    }
  });
}

var opponent_selection = 
 [["random", "Random"],
  ["user", "By username"],
  ["mail", "By mail"]];

var genOpponentSelectionList = function() {
  return opponent_selection.map( function(option) {
    return '<option value="' + option[0] + '">' + option[1] + '</option>';
  } );
}

var formHtml = '<form action="/create" method="post">'
      +  '<label for="opponent">Select opponent</label>'
      +  '<select name="opponent">'
      +  genOpponentSelectionList()
      +  '</select>'
      +  '<input type="submit" value="Create!" /></form>';

var getPostParams = function(req, callback){ 
  var body = ''; 
  req.on('data', function(chunk){
     body += chunk;
   }) 
   .on('end', function() { 
     var obj = qs.parse(  body.replace( /\+/g, ' ' ) ) ;
     callback( obj );
   });
} 

var createGame = function( req, res ) {
  getPostParams( req, function( obj ) {
      var r = redis.createClient();

      r.stream.on( 'connect', function() {
        r.incr( 'nextid' , function( err, id ) {
          r.set( 'game:'+id, JSON.stringify( obj ), function() {
            var msg = 'The game has been saved at <a href="/'+id+'">'+req.headers.host+'/'+id+'</a>';
            res.respond( msg );
          } );
        } );
      } );
    });
};

var showGame = function( req, res, id ) {
    var r = redis.createClient();
    r.stream.on( 'connect', function() {
      r.get( 'game:'+id, function( err, data ) {
        if( !data ) {
          res.writeHead( 404 );
          res.write( "No such game" );
          res.end();
          return;
        }

        res.writeHead( 200, { "Content-Type" : "text/html" } );

        var obj = JSON.parse( data.toString() );
        var shortcode = opponent_selection.filter( function(el) { 
          return el[0] == obj.opponent;
        } ) [0][0];

	res.write( "<h1>Showing game #</h1>");

	res.end();

        r.close();
      });
  });
}

nerve.create( [
  [ /^\/([0-9]+)/, showGame ],
  [ nerve.post("/create"), createGame ],
  [ "/", function( req, res ) { res.respond( formHtml ); } ]
]).listen( 8000 );

