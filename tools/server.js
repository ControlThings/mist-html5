var WebSocketServer = require('ws').Server;
var Mist = require('mist-api').Mist;
var MistCli = require('mist-cli').MistCli;
var Sandboxed = require('mist-api').Sandboxed;
var express = require('express');
var bson = require('bson-buffer');
var BSON = new bson();
var http = require('http');
var package = require('./package.json');

var sandboxId = new Buffer('deadbeef02000000000000000000000000000000000000000000000000000000', 'hex');

var mist = new Mist({ name: package.mist.name });

mist.node.addEndpoint('mist', { type: 'string' });

mist.node.addEndpoint('mist.name', {
    label: 'Name',
    type: 'string',
    read: function(args, peer, cb) { cb(null, package.mist.name); }
});

mist.node.addEndpoint('ep', {
    type: 'string',
    read: true
});

function Server(config) {
    var self = this;

    this.sandboxed = new Sandboxed(mist, sandboxId);

    this.reqs = {};
    this.app = express();

    //console.log("Publishing config.ui.public: ",config);
    this.app.use(express.static(config.public));
    
    var port = process.env.UI || config.port;
    
    this.http = http.createServer(this.app);

    this.http.on ('error', function(err) {
        console.log('Failed to listen to port '+ port, err);
        process.exit(0);
    });

    this.http.listen(port);
    
    // setup connection listening for ui
    var wss = new WebSocketServer({server: this.http});
    this.uiServer = wss;
    this.uiSocket = { send: function() {} };
    
    wss.on('connection', function(ws) {
        self.uiSocket = ws;

        self.sandboxed.request('login', [package.mist.name], function(err, data) {
            if (err) { console.log('login:', err, data); }
        });

        ws.on('message', function(msg) {
            var m;
            
            if ( Buffer.isBuffer(msg) ) {
                try { m = BSON.deserialize(msg); } catch(e) { console.log('WebSocket message could not be decoded!', e); return; }
            }
            
            console.log('message:', m);
            
            if (m.end) {
                self.sandboxed.requestCancel(m.end);
                return;
            }

            var id = self.sandboxed.requestBare(m.op, m.args, function(data) {
                if (data.ack) { data.ack = m.id; }
                if (data.sig) { data.sig = m.id; }
                if (data.err) { data.err = m.id; }
                self.uiSocket.send(BSON.serialize(data));
                if(!data.sig) { delete self.reqs[id]; }
            });

            self.reqs[id] = true;
        });
        ws.on('error', function(err) {
            console.log("Error ws: ", err);
        });
        ws.on('close', function() {
            console.log("WebSocket: Connection closed.");
            self.uiSocket = { send: function() {} };
            
            self.sandboxed.request('logout', [], function() {});
            
            for(var i in self.reqs) {
                console.log('Deleting outstandin request:', i);
                self.sandboxed.requestCancel(parseInt(i));
                delete self.reqs[i];
            }
        });
    });
}

var server = new Server({ public: './src', port: 7000 });

var Cli = new MistCli(mist);
