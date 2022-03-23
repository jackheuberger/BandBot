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
        if (command.text && command.channel_name == 'directmessage') {
            const quote = command.text
            await say({
                blocks: [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "_Are you sure you want to add the quote \"" + quote + "\" to the list of Chazz quotes?_ " +
                                "Make sure you didn't put quotes around it. That'll look super stupid when I already do that for you"
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
                                "action_id": "no_add_quote"
                            }
                        ]
                    }
                ]
            })
        }
    } catch (error) {
        console.log('err')
        console.error(error);
    }
});

app.command('/yossers', async ({ command, ack, say }) => {
    try {
        await ack()
        if (command.channel_name != 'directmessage') {
            const caller = command.user_id
            const channel = command.channel_id
            const mins = command.text.split(' ')[0]
            const loc = command.text.replace(mins + ' ', '')
            console.log(command)
            let msg = await say({
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "<@" + caller + "> asked to Yoss in " + mins + " minutes on " + loc + "! Click the :ferbalicious: to join in"
                        }
                    },
                    {
                        "type": "divider"
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "Yossers: <@" + caller + "> "
                        }
                    }
                ]
            })
            console.log(msg)
            app.client.reactions.add({
                "channel": channel,
                "name": "ferbalicious",
                "timestamp": msg.ts
            })
        }
    } catch (err) {
        console.error(err)
    }
})

app.action('no_add_quote', async ({ body, ack, say }) => {
    await ack()
    say('Cool. Thanks for wasting my time.')
    await app.client.chat.delete({
        channel: body.container.channel_id,
        ts: body.container.message_ts
    })
})

app.action('add_chazz_quote', async ({ body, action, ack, say }) => {
    await ack()
    try {
        let quote = body.actions[0].value
        await appendFile('lists/ChazzQuotes.txt', quote + '\n')
        await say('We Gucci! Quote added! (Or, as Chazz might say, \"' + quote + '\")')
        console.log('quote added successfully')
        await app.client.chat.delete({
            channel: body.container.channel_id,
            ts: body.container.message_ts
        })
    } catch (err) {
        console.error(err)
        say('There was an error! Uh oh!')
    }
})

app.event('message', async ({ event, say }) => {
    try {
        if (event.channel_type != 'im' && event.text && event.text.toLowerCase().includes('chazz')) {
            await say({ text: '\"' + await pullQuote() + '\"' })
        }
    } catch (err) {
        console.error(err)
    }
})

app.event('reaction_added', async ({ event, say }) => {
    try {
        const message = await app.client.conversations.history({
            "channel": event.item.channel,
            "latest": event.item.ts,
            "oldest": event.item.ts,
            "inclusive": true,
            "limit": 1
        })
        if (message.messages[0].bot_id) {
            let blocks = message.messages[0].blocks
            if (!blocks[2].text.text.includes(event.user)) {
                blocks[2].text.text += '<@' + event.user + '> '
                app.client.chat.update({
                    "channel": event.item.channel,
                    "ts": event.item.ts,
                    "blocks": blocks
                })
            } else {
                console.log('already includes')
            }
        }
    } catch (err) {
        console.error(err)
    }
})

app.event('reaction_removed', async ({ event, say }) => {
    try {
        const message = await app.client.conversations.history({
            "channel": event.item.channel,
            "latest": event.item.ts,
            "oldest": event.item.ts,
            "inclusive": true,
            "limit": 1
        })
        if (message.messages[0].bot_id) {
            let blocks = message.messages[0].blocks
            if (blocks[2].text.text.includes(event.user)) {
                blocks[2].text.text = blocks[2].text.text.replace('<@' + event.user + '> ', '')
                app.client.chat.update({
                    "channel": event.item.channel,
                    "ts": event.item.ts,
                    "blocks": blocks
                })
            } else {
                console.log('not included')
            }
        }
    } catch (err) {
        console.error(err)
    }
})

async function pullQuote() {
    let quotes = await readFile('lists/ChazzQuotes.txt')
    quotes = quotes.toString().split('\n')
    return quotes[Math.floor(Math.random() * quotes.length)]
}
