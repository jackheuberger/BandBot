const { App } = require('@slack/bolt');
require('dotenv').config();
const fs = require('fs')
const util = require('util')

const appendFile = util.promisify(fs.appendFile)
const readFile = util.promisify(fs.readFile)

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true
});

(async () => {
  const port = 3333
  // Start your app
  await app.start(process.env.PORT || port);
  console.log(`⚡️ Slack Bolt app is running on port ${port}!`);
})();

app.command('/chazzadd', async ({ command, ack, say }) => {
    try {
        await ack();
        const quote = command.text
        await say({
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "Are you sure you want to add the quote \"" + quote + "\" to the list of Chazz quotes?"
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "emoji": true,
                                "text": "Yes"
                            },
                            "style": "primary",
                            "action_id": "add_chazz_quote",
                            "value": quote
                        },
                        {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "emoji": true,
                                "text": "No"
                            },
                            "style": "danger",
                            "value": "click_me_123"
                        }
                    ]
                }
            ]
        })
    } catch (error) {
        console.log('err')
        console.error(error);
    }
});

app.action('add_chazz_quote', async ({ body, action, ack, say }) => {
    await ack()
    try {
        let quote = body.actions[0].value
        await appendFile('lists/ChazzQuotes.txt', quote + '\n')
        await say('We Gucci! Quote added! (Or, as Chazz might say, \"' + quote + '\")')
        console.log('quote added successfully')
    } catch (err){
        console.error(err)
        say('There was an error! Uh oh!')
    }
})

app.event('message', async ({ event, say}) => {
    try {
        if (event.text.toLowerCase().includes('chazz')) {
            await say({ text: '\"' + await pullQuote() + '\"' })
        }
    } catch (err) {
        console.error(err)
    }
})

async function pullQuote() {
    let quotes = await readFile('lists/ChazzQuotes.txt')
    quotes = quotes.toString().split('\n')
    return quotes[Math.floor(Math.random()*quotes.length)]
}
