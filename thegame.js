var redis = require('redis-client')
	, nerve = require('nerve')
	, qs = require('querystring')
	, _ = require('underscore')._
	, fs = require('fs')
	, views = require('./src/views.js');

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

var showGame = function( req, res, id ) {
	res.respond( formHtml );
}

var loginHtml = fs.readFileSync('views/login.html').toString();

var login = function( req, res ) {
	res.respond( loginHtml );
}

login = views.create('./views/login.html');

nerve.create( [
	[ /^\/([0-9]+)/, showGame ],
	[ nerve.post("/create"), createGame ],
	[ "/login", login ],
	[ "/", login ]
]).listen( 8000 );
