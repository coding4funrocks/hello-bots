// Instantiate the botbuilder
var builder = require('botbuilder');

// Instantiate the restify
var restify = require('restify');

// Instantiate the github client
var githubClient = require('./github-client.js');

// Create the connector
var connector = new builder.ChatConnector();

// Create the bot
var bot = new builder.UniversalBot(connector);

// Add in the dialog
var dialog = new builder.IntentDialog();
dialog.matches(/^search/i, [
    function (session, args, next) {
        if (session.message.text.toLowerCase() == 'search') {
            builder.Prompts.text(session, 'Who do you want to search for?');
        } else {
            var query = session.message.text.substring(7);
            next({ response: query });
        }
    },
    function (session, result, next) {
        var query = result.response;
        if (!query) {
            session.endDialog('Request cancelled');
        } else {
            githubClient.executeSearch(query, function (profiles) {
                var totalCount = profiles.total_count;
                if (totalCount == 0) {
                    session.endDialog('No results founds.');
                } else if (totalCount > 10) {
                    session.endDialog('More than 10 results were found. Please provide a more restrictive search.');
                } else {
                    session.dialogData.property = null;

                    // Convert the results into an array of cards
                    var cards = profiles.items.map(function (item) { 
                        return createCard(session, item);
                    });

                    var message = new builder.Message(session).attachments(cards).attachmentLayout('carousel');
                    session.send(message);
                }
            });
        }
    }
]);

bot.dialog('/', dialog);

// Setup restify server to listen
var server = restify.createServer();
server.listen(process.env.port || process.env.port || 3978, function() {
    console.log('%s listening to %s', server.name, server.url);
});
server.post('/api.messages', connector.listen());

// Helper function to create card for session and profile
function createCard(session, profile) {
    var card = new builder.ThumbnailCard(session);
    card.title(profile.login);
    card.images([builder.CardImage.create(session, profile.avatar_url)]);
    card.tap(new builder.CardAction.openUrl(session, profile.html_url));
}