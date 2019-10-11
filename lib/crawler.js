const request = require('request');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const fse = require('fs-extra');
const path = require('path');
const { sleep } = require('./utils');

// request.debug = true;
// request.defaults({ proxy: 'http://127.0.0.1:1087' })
const referers = ['http://www.baidu.com', 'https://google.com', 'https://so.com', 'https://sogou.com'];
const tempFilePath = path.join(__dirname, '../temp');

fse.ensureFileSync(tempFilePath);

function crawler(url) {
    return new Promise((resolve, reject) => {
        request({
            baseUrl: 'http://www.nbaxiaoshuo.com',
            url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3865.90 Safari/537.36',
                Host: 'www.nbaxiaoshuo.com',
                'Upgrade-Insecure-Requests': 1,
                Referer: referers[Math.floor(Math.random() * referers.length)],
            },
            encoding: null,
            gzip: true,
            jar: true,
            timeout: 10000,
        }, (error, response, body) => {
            if (error) return reject(error);
            resolve(cheerio.load(iconv.decode(body, 'gbk')));
        });
    });
}

(async function boostrap() {
    try {
        const homeDom = await crawler('/info/51/51885/index.shtml');
        const arr = [];
        homeDom('#list-chapterAll').find('dd > a').each(function () {
            arr.push({ title: homeDom(this).text(), url: homeDom(this).attr('href') });
        });
        await fse.ensureDir(path.join(__dirname, '../download'));
        const lastTimeUrl = (await fse.readFile(tempFilePath, 'utf8')).trim();
        let lastTimeIndex = 0;
        if (lastTimeUrl) {
            lastTimeIndex = arr.findIndex(el => el.url === lastTimeUrl);
            lastTimeIndex = lastTimeIndex === -1 ? 0 : lastTimeIndex + 1;
        }

        await sleep(Math.random() * 5 + 2);
        for (let i = lastTimeIndex, len = arr.length; i < len; i++) {
            const item = arr[i];
            console.log(item.title);
            await sleep(Math.random() * 4);
            const detailDom = await crawler(item.url);
            const content = detailDom('div.aaa.readcotent.font-normal').text();
            await fse.writeFile(path.join(__dirname, `../download/${item.title}.txt`), content, 'utf8');
            await fse.writeFile(tempFilePath, item.url, 'utf8')
        }
    } catch (err) {
        console.log(err.message);
        await sleep(10);
        boostrap();
    }
})();
