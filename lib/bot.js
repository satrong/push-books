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

const recordPath = path.join(__dirname, '../record.json');
fse.ensureFileSync(recordPath);

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

function getRecord(id) {
    const content = fse.readFileSync(recordPath, 'utf8');
    const recordData = content ? JSON.parse(content) : {};
    return id ? recordData[id] : recordData;
}

async function send(msg, index) {
    const article = fse.readFileSync(path.join(downloadDir, files[index]), 'utf8');
    const pagesize = 3000;
    const maxPage = Math.ceil(article.length / pagesize);
    for (let i = 0; i < maxPage; i++) {
        if (i > 0) {
            await sleep(1);
        }
        msg.reply.text(`${files[index].replace(/\.txt$/i, '')}(${i + 1})\n${article.substr(i * pagesize, pagesize)}`);
    }
    const recordData = getRecord();
    recordData[msg.from.id] = index;
    fse.writeJSONSync(recordPath, recordData);
}

function page(msg, offset) {
    const recordData = getRecord();
    const index = recordData[msg.from.id] + offset;
    if (offset === -1 && index < 1) return;
    if (offset === 1 && files.length < index) return;
    send(msg, index);
}

bot.on('/info', msg => {
    msg.reply.text(`共${files.length}章`);
});

bot.on('/next', msg => {
    const recordData = getRecord();
    const index = recordData[msg.from.id] + 1;
    const article = fse.readFileSync(path.join(downloadDir, files[index]), 'utf8');
    msg.reply.text(`${files[index]}\n${article}`);

    recordData[msg.from.id] = index;
    fse.writeJSONSync(recordPath, recordData);
});

bot.on('text', async (msg) => {
    switch (msg.text) {
        case '上一章':
            page(msg, -1); break;
        case '下一章':
            page(msg, 1); break;
        default:
            if (/^\d+$/.test(msg.text)) {
                const index = msg.text - 0;
                send(msg, index);
            }
    }
});
// On commands
bot.on(['/', '/start'], msg => {
    let replyMarkup = bot.keyboard([
        ['上一章', '下一章'],
    ], { resize: true });

    return bot.sendMessage(msg.from.id, '欢迎来到小禾阅读！', { replyMarkup });

});