/**
 * A Bot for Slack!
 */


/**
 * Define a function for initiating a conversation on installation
 * With custom integrations, we don't have a way to find out who installed us, so we can't message them :(
 */

function onInstallation(bot, installer) {
    if (installer) {
        bot.startPrivateConversation({user: installer}, function (err, convo) {
            if (err) {
                console.log(err);
            } else {
                convo.say('I am a bot that has just joined your team');
                convo.say('You must now /invite me to a channel so that I can be of use!');
            }
        });
    }
}


/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    };
} else {
    config = {
        json_file_store: ((process.env.TOKEN)?'./db_slack_bot_ci/':'./db_slack_bot_a/'), //use a different name if an app or CI
    };
}

/**
 * Are being run as an app or a custom integration? The initialization will differ, depending
 */

if (process.env.TOKEN || process.env.SLACK_TOKEN) {
    //Treat this as a custom integration
    var customIntegration = require('./lib/custom_integrations');
    var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
    var controller = customIntegration.configure(token, config, onInstallation);
} else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.PORT) {
    //Treat this as an app
    var app = require('./lib/apps');
    var controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, config, onInstallation);
} else {
    console.log('Error: If this is a custom integration, please specify TOKEN in the environment. If this is an app, please specify CLIENTID, CLIENTSECRET, and PORT in the environment');
    process.exit(1);
}


/**
 * A demonstration for how to handle websocket events. In this case, just log when we have and have not
 * been disconnected from the websocket. In the future, it would be super awesome to be able to specify
 * a reconnect policy, and do reconnections automatically. In the meantime, we aren't going to attempt reconnects,
 * WHICH IS A B0RKED WAY TO HANDLE BEING DISCONNECTED. So we need to fix this.
 *
 * TODO: fixed b0rked reconnect behavior
 */
// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
    console.log('** The RTM api just connected!');
});

controller.on('rtm_close', function (bot) {
    console.log('** The RTM api just closed');
    // you may want to attempt to re-open
});


/**
 * Core bot logic goes here!
 */
// BEGIN EDITING HERE!

controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "I'm here!")
});

controller.hears(
  ['hello', 'hi', 'yo', 'greetings', 'nihao'],
  ['direct_message', 'mention', 'direct_mention'],
  function (bot, message) {
    bot.reply(message, 'Yo!');
});

controller.hears('another_keyword','direct_message,direct_mention',function(bot,message) {
  var reply_with_attachments = {
    'username': 'My bot' ,
    'text': 'This is a pre-text',
    'attachments': [
      {
        'fallback': 'To be useful, I need you to invite me in a channel.',
        'title': 'How can I help you?',
        'text': 'To be useful, I need you to invite me in a channel ',
        'color': '#7CD197'
      }
    ],
    'icon_url': 'http://lorempixel.com/48/48'
    }

  bot.reply(message, reply_with_attachments);
});

controller.hears(['question me'], 'direct_message', function(bot,message) {

  // start a conversation to handle this response.
  bot.startConversation(message, function(err, convo) {
//Response is typed by user.
    convo.addQuestion('Shall we proceed Say YES, NO or DONE to quit.',[
      {
        pattern: 'done',
        callback: function(response,convo) {
          convo.say('OK you are done!');
          convo.next();
        }
      },
      {
        pattern: bot.utterances.yes,
        callback: function(response,convo) {
          convo.say('Great! I will continue...');
          convo.next();
        }
      },
      {
        pattern: bot.utterances.no,
        callback: function(response,convo) {
          convo.say('Perhaps later.');
          convo.next();
        }
      },
      {
        default: true,
        callback: function(response,convo) {
          // just repeat the question
          convo.repeat();
          convo.next();
        }
      }
    ],{},'default');
  })

//Not sure how to integrate this into convo...Where is convo.next() redirected to?
    // convo.addMessage({text: 'Hello let me ask you a question, then i will do something useful'},'default');
    // convo.addQuestion({text: 'What is your name?'}, function(res, convo) {
    // //name has been collected
    // convo.gotoThread('completed');
    // },{key: 'name'},'default');
    // //create completed thread
    // convo.addMessage({text: 'I saved your name in the database, {{vars.name}}'},'completed');
    // // create an error thread
    // convo.addMessage({text: 'Oh no I had an error! {{vars.error}}'},'error');
    //
    // // now, define a function that will be called AFTER the `default` thread ends and BEFORE the `completed` thread begins
    // convo.beforeThread('completed', function(convo, next) {
    //
    //   var name = convo.extractResponse('name');
    //
    //   //do something complex HERE
    //   myFakeFunction(name).then(function(results) {
    //     convo.setVar('results', results);
    //     //call next to continue to the secondary gotoThread
    //     next();
    //   }).catch(function(err) {
    //     convo.setVar('error',err);
    //     convo.gotoThread('error');
    //     next(err); pass an error because we changed threads again during transition
    //   });
    // });

});


//send an interactive message. Creates interactive_message_callback event
controller.hears('interactive', 'direct_message', function(bot, message) {

    bot.reply(message, {
        attachments:[
            {
                title: 'Do you want to interact with my buttons?',
                callback_id: '123', //returned to Action URL
                attachment_type: 'default',
                actions: [
                    {
                        "name":"yes", //returned to Action URL when invoked
                        "text": "Yes", //user-facing label
                        "value": "yes", //returned with callback_id and name
                        "type": "button",
                        "style": "primary",
                    },
                    {
                        "name":"no",
                        "text": "No",
                        "value": "no",
                        "type": "button",
                        "style": "danger",
                    },
                    {
                        "name":"uh",
                        "text": "Uhhhh",
                        "value": "uh",
                        "type": "select", //creates a message menu
                        "options": [ //array of option fields
                          {
                            "text": "Option 1",
                            "value": "option_1"
                          },
                          {
                            "text": "Option 2",
                            "value": "option_2"
                          },
                          {
                            "text": "Option 3",
                            "value": "option_3"
                          }
                        ]
                    }
                ]
            }
        ]
    });
    console.log('end of interactive message');
});

// receive an interactive message (invocation), and reply with a message that will replace the original
controller.on('interactive_message_callback', function(bot, message) {
    console.log('recieved callback');
    // check message.actions and message.callback_id to see what action to take...
    if (message.callback_id == '123') {
      console.log('entered callback_id 123');

      //reply and replace
      if (message.actions[0].name == 'yes') {
        console.log('entered value: yes');
        bot.replyInteractive(message, {
            text: "This is the recieved message callback response w/ callback_id: " + message.callback_id + ".",
            attachments: [
                {
                    title: 'Some other things to do',
                    callback_id: '123',
                    attachment_type: 'default',
                    actions: [
                        {
                            "name":"yes",
                            "text": "YAS!",
                            "value": "yes",
                            "type": "button",
                        },
                        {
                           "text": "NAW!",
                            "name": "no",
                            "value": "delete",
                            "style": "danger",
                            "type": "button",
                            //creates pop up window
                            "confirm": {
                              "title": "Are you sure?",
                              "text": "This will do something!",
                              "ok_text": "Yes",
                              "dismiss_text": "No"
                            }
                        }
                    ]
                }
            ]
        });
      }

      //reply without replace
      if (message.actions[0].name.match(/^no/)) {
        console.log('entered value: no');
        bot.reply(message, {
          attachments:[
            {
              title: 'You said no... :(',
              fallback: 'Upgrade your Slack client to use messages like these. Don\'t fall out.', //displayed if user's interface sucks
              callback_id: '000'
            }
          ]
        });
      }

      //dialogs in response to interactive_message_callback (or slash_command)
      //using bot.replyWithDialog() and bot.createDialog() to build object
      if (message.actions[0].name == 'uh') {
        console.log('entered value: uh');

        var dialog = bot.createDialog(
         'Title of dialog', //dialogue.title()
         'callback_id_of_dialogue', //dialogue.callback_id()
         'SubmitLABELWOO' //label for the submit button d.submit_label()
       ).addText('Text','name','value (optional)')
        .addEmail('Email','Your Email', 'value (optional)')
        .addSelect('Select','name',null,[{label:'Foo',value:'foo'},{label:'Bar',value:'bar'}],{placeholder: 'Select One'})
        .addTextarea('Textarea','textarea','some longer text',{placeholder: 'Put words here'})
        .addUrl('addUrl','name','http://botkit.ai(value)');

        bot.replyWithDialog(message, dialog.asObject());
        // bot.replyWithDialog(message, dialog.asObject(), function(err, res) {
        //   //handle the error
        // });
      }

    }
});

controller.on('channel_join', function(bot, message) {
  bot.reply(message,
    "Welcome to AWE's Slack channel! \n Please take a moment to fill in this intro card:");
});

/**
 * AN example of what could be:
 * Any un-handled direct mention gets a reaction and a pat response!
 */
//controller.on('direct_message,mention,direct_mention', function (bot, message) {
//    bot.api.reactions.add({
//        timestamp: message.ts,
//        channel: message.channel,
//        name: 'robot_face',
//    }, function (err) {
//        if (err) {
//            console.log(err)
//        }
//        bot.reply(message, 'I heard you loud and clear boss.');
//    });
//});
