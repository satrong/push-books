const TeleBot = require('telebot');
const fse = require('fs-extra');
const path = require('path');
const { sleep } = require('./utils');

const token = process.env.BOT_TOKEN;
if (!token) {
    console.log('请设置环境变量 BOT_TOKEN');
    process.exit(0);
}

const bot = new TeleBot(token);
bot.start();

const downloadDir = path.join(__dirname, '../download');
const list = fse.readdirSync(downloadDir);
const files = [];
list.forEach(el => {
    const matched = el.match(/^(\d+)/);
    if (matched) {
        const index = Number(matched[1]);
        files[index] = el;
    }
});

function replyMarkup(index) {
    const btns = [];
    if (index - 2 > 0) {
        btns.push(bot.inlineButton(`⬅️${getTitle(index - 2)}`, { callback: String(index - 2) }));
    }
    if (files[index]) {
        btns.push(bot.inlineButton(`${getTitle(index)}➡️`, { callback: String(index) }));
    }
    return bot.inlineKeyboard([btns]);
}

function getTitle(index) {
    return files[index].replace(/\.txt$/i, '');
}

async function send(msg, index, answer = false) {
    if (!files[index]) {
        return bot.sendMessage(msg.from.id, '已完结');
    }
    const article = fse.readFileSync(path.join(downloadDir, files[index]), 'utf8');
    const pagesize = 1500;
    const maxPage = Math.ceil(article.length / pagesize);
    let options = {};
    const title = getTitle(index);
    answer && bot.answerCallbackQuery(msg.id, { text: `${title} - 分成${maxPage}条消息推送` });
    for (let i = 0; i < maxPage; i++) {
        if (i > 0) {
            await sleep(1);
        }
        const content = `${title}\n${article.substr(i * pagesize, pagesize)}`;
        if (i + 1 === maxPage) {
            options = { replyMarkup: replyMarkup(index + 1) };
        }
        await bot.sendMessage(msg.from.id, content, options);
    }
}

bot.on('/info', msg => {
    msg.reply.text(`共${files.length}章`);
});

bot.on('text', async (msg) => {
    if (/^\d+$/.test(msg.text)) {
        const index = msg.text - 0;
        if (index < 1) return;
        send(msg, index);
    }
});

bot.on('callbackQuery', msg => {
    send(msg, Number(msg.data), true);
});

// On commands
bot.on(['/', '/start'], msg => {
    return bot.sendMessage(msg.from.id, '欢迎来到小禾阅读！', { replyMarkup: 'hide' });
});