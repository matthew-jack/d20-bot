// d20
// Simulate physical DnD dice using cryptographically strong random values.
// Matthew Jack <matthew-jack@uiowa.edu>

// Include required libraries / default variables
var Twitter = require('twitter');
var Random = require('random-js');
require('dotenv').config();
// regexp to extract commands from DM input

// Set PRNG engine
var engine = Random.engines.mt19937().autoSeed();

// Watch for errors and exit somewhat gracefully
process.on('uncaughtException', function(err) {
  return console.error('ERR: uncaughtException: ' + err.message);
});

// Initalize clients
var botClient = new Twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
})
console.log('DEV: connected to Twitter API');

// Open stream
var stream = botClient.stream('user');

// Handle stream / errors
stream.on('data', function(data) {
  if(data.direct_message && data.direct_message.sender.id != process.env.BOT_ID) {
    console.log('DEV: RECV from ' + data.direct_message.sender.id + ' (@' + data.direct_message.sender.screen_name + '): ' + data.direct_message.text);
    var msg = data.direct_message;
    handleDM(msg);
  }
});

stream.on('error', function(err) {
  console.error('ERR: stream error: ' + err.message);
  process.exit(2);
});

// Handle user input
function handleDM(msg) {
  var sender_id = msg.sender_id;
  var text = msg.text;
  var string = "";

  // Extract number of rolls/sides of die from DM text:
  //   Expecting "{times}d{sides}"
  //   times: command[0]
  //   sides: command[1]
  //   modified: command[2]
  var command = text.match(/(\d+)/gi);

  // Handle malformed input
  if(command == null || command == "") {
    console.error('ERR: bad command entered: ' + text);
    botClient.post('direct_messages/new', { user_id: sender_id, text: 'Please enter a command in the format {times}d{sides}+{modifier} (e.g. \'2d6+5\' to roll a 6-die 2 times and add 5)' });
    return;
  }

  // if dice count not specified, default to 1
  if(command.length < 2) {
    command.unshift(1);
  }

  for(var i = 0; i < parseInt(command[0]); i++) {
    var roll = Random.integer(1, command[1])(engine);
    // Add modifier, if present
    if(command[2]) {
      roll = String(parseInt(roll) + parseInt(command[2]));
    }
    string += roll + " ";
  }
  string.trim();

  botClient.post('direct_messages/new', { user_id: sender_id, text: string });
  console.log('DEV: SENT to ' + sender_id + ' (@' + msg.sender.screen_name + '): ' + string);
  return;
}
