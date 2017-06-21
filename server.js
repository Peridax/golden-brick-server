const io = require('socket.io').listen(3000);
const cloudscraper = require('cloudscraper');
const version = "1.0.1";
const url = "https://www.brick-hill.com/API/crate?item=all&search=&page=0";

// Global Variables
var connected = [];
var running = true;
var start = new Object();
var cur = new Object();
var interval = 5000;
var data, globalInterval;

// Information
var info = {
	key: "JEREMYisGAY72",
	connected: {
		title: "Connected To Server"
	},
	success: {
		new: {
			title: "Connected To Server",
			message: "Version: " + version,
			type: "connected"
		}
	},
	error: {
		new: {
			title: "Error Connecting To Server",
			message: "Username is invalid"
		}
	}
};

// Item Notifier
var init = function() {
    globalInterval = setInterval(crawl, interval);
    console.info('Notifier has started');
};

var crawl = function() {
    cloudscraper.get(url, function(error, response, body) {
        if (error) {
        	console.log(error);
        	io.emit('dev', {title: 'Cloudscrape Error', message: error});
        };

        if (response.statusCode == 200) {
            data = JSON.parse(body);

            if (start.id) {
                cur.id = data[0].id;
                cur.name = data[0].name;
                cur.bucks = data[0].bucks;
                cur.bits = data[0].bits;
                cur.icon = data[0].icon;
                cur.url = data[0].url;
                cur.special = data[0].special

                if (cur.bits && cur.bucks < 0) {
                    cur.offsale = true;
                } else {
                    cur.offsale = false;
                };
            } else {
                start.id = data[0].id;
            };

            if (cur.id > start.id) {
                io.emit('new item', cur);
                start.id = cur.id;
            };
        };
    });
};

// Starting The Item Notifier
init();

// WebSocket
io.on('connection', function(socket) {
	socket.tries = 0;

	socket.on('new', function(data) {
		var repeat = false;

		if (data.username && typeof data.username == "string") {
			for (i in connected) {
				if (connected[i] === data.username) {
					var repeat = true;
				};
			};

			if (!repeat) {
				socket.username = data.username;
				connected.push(data.username);
				socket.emit('message', {title: info.success.new.title, message: info.success.new.message, type: info.success.new.type});
				console.log(data.username + ' connected');
			} else {
				socket.disconnect();
			};
		} else {
			socket.emit('message', {title: info.error.new.title, message: info.error.new.message});
		};
	});

	socket.on('check admin', function() {
		if (socket.admin) {
			socket.emit('admin check', true);
		} else {
			socket.emit('admin check', false);
		};
	})

	socket.on('login', function(data) {
		if (socket.username) {
			if (data.length > 0) {
				if (socket.tries < 5) {
					if (data === info.key) {
						socket.admin = true;
						socket.emit('admin check', true);
						console.log(socket.username + ' connected to the admin console');

						setTimeout(function() {
							socket.admin = false;
						}, 3600000);
					} else {
						socket.emit('console', {type: "log", int: "Wrong password"});
						socket.tries++;
					};
				} else {
					socket.emit('console', {type: "log", int: "You've run out of attempts, try again in 5 minutes"});

					if (!socket.trytimeout) {
						socket.trytimeout = setTimeout(function() {
							socket.tries = 0;
							socket.trytimeout = false;
						}, 300000);
					};
				};
			};
		};
	});

	socket.on('admin', function(data) {
		if (socket.username) {
			if (socket.admin) {
				if (data.type == "user count") {
					socket.emit('console', {type: "log", int: "Connected users: " + connected.length});
				} else if (data.type == "users") {
					socket.emit('console', {type: "log", int: connected.join('<br>')});
				} else if (data.type == "message") {
					if (data.message.split(' ').join('').length > 3) {
						io.emit('announcement', {title: 'Golden Brick Announcement', message: data.message});
						socket.emit('console', {type: "log", int: "Message delivered to " + connected.length + ' users'});
						console.log(socket.username + ' made an announcement "' + data.message + '"');
					} else {
						socket.emit('console', {type: "log", int: "Message must be longer than 3 characters"});
					};
				};
			};
		};
	});

	socket.on('disconnect', function() {
		if (socket.username) {
			connected.splice(connected.indexOf(socket.username), 1);
			console.log(socket.username + ' disconnected');
		};
	});
});