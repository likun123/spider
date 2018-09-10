const Koa = require('koa2')
const router = require('koa-router')()
const https = require("https")
const http = require("http")
const app = new Koa()
const cheerio = require('cheerio')
var md5 = require('md5-node')
const querystring = require('querystring')
var iconv = require('iconv-lite')
var fs = require('fs')
var path = require('path')
//响应内容
let htmlcon = ''
let reqCookies = ''
let flag = false
let loginToken=''
let loginedCookies=''
//转换buffer类
function transformBuffer(data) {
    var result = JSON.stringify(data)
    var content = new Buffer(JSON.parse(result))
    return content.toString();
}
//等待promise返回
let funPromise = function (time) {
    return new Promise(function (resolve, reject) {
        //Pending 进行中
        setTimeout(function () {
            resolve()
        }, time);
    })
};
//设置页面cookies
function setHtmlCookies(ctx, data) {
    for (item in data) {
        ctx.cookies.set(item, data[item], {
            domain: 'localhost',
            path: '/',   //cookie写入的路径
            maxAge: 1000 * 60 * 60 * 1,
            expires: new Date('2018-09-06'),
            httpOnly: false,
            overwrite: false
        })
    }
}

function wechatLogin() {
    //登录微信账号
    const account = {
        login: '466940702',
        pwd: 'lk.466940702'
    }
    //传输数据参数
    var data = querystring.stringify({
        username: '466940702@qq.com',
        pwd: md5(account.pwd),
        imgcode: '',
        f: 'json',
        userlang: 'zh_CN',
        token: '',
        lang: 'zh_CN',
        ajax: 1
    })
    //登录配置
    const loginOption = {
        host: 'mp.weixin.qq.com',
        path: '/cgi-bin/bizlogin?action=startlogin',
        method: 'POST',
        port: 443,
        headers: {
            'Host': 'mp.weixin.qq.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:61.0) Gecko/20100101 Firefox/61.0',
            'Accept': '*/*',
            'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://mp.weixin.qq.com/',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Length': '120',
            'Connection': 'keep-alive'
        }
    }
    //登录请求
    const login = https.request(loginOption, (req) => {
        req.on('data', (d) => {
            //获取账号登录状态
            let data = JSON.parse(d.toString());
            if (data.base_resp.err_msg == "ok") {
                //获取请求cookies并转换成字符串
                reqCookies = req.headers["set-cookie"].join(";");
                htmlcon = data.base_resp.err_msg
            } else {
                htmlcon = data.base_resp.err_msg
            }
        });
    });

    login.on('error', (e) => {
        ctx.body = {
            msg: e
        }
    });
    login.write(data);
    login.end();
}

function getQrcode() {
    //二维码配置
    let qrcodeOption = {
        host: 'mp.weixin.qq.com',
        path: '/cgi-bin/loginqrcode?action=getqrcode&param=4300&rd=917',
        method: 'GET',
        port: 443,
        headers: {
            'Host': 'mp.weixin.qq.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:61.0) Gecko/20100101 Firefox/61.0',
            'Accept': '*/*',
            'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://mp.weixin.qq.com/cgi-bin/bizlogin?action=validate&lang=zh_CN&account=466940702%40qq.com',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': reqCookies,
            'X-Requested-With': 'XMLHttpRequest'
        }
    }
    //获取保存图片请求
    const qrcode = https.get(qrcodeOption, (req) => {
        //获取内容为二进制图片内容
        req.on('data', (d) => {
            //将二进制内容转换成base64
            htmlcon = d.toString("base64")
            var imgData = new Buffer(htmlcon, 'base64');
            fs.writeFile(path.resolve('./logo.png'), imgData, function (err) {
                if (err) {
                    return console.error(err);
                } else {
                    console.log('保存文件成功');
                }
            });
        });
    });
    console.log(qrcode)
    qrcode.on('error', (e) => {
        ctx.body = {
            msg: e
        }
    });
    qrcode.end();
}
function scanQrcode() {
    //扫描二维码配置
    let scanQrcodeOption = {
        host: 'mp.weixin.qq.com',
        path: '/cgi-bin/loginqrcode?action=ask&token=&lang=zh_CN&f=json&ajax=1',
        method: 'GET',
        port: 443,
        headers: {
            'Host': 'mp.weixin.qq.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:61.0) Gecko/20100101 Firefox/61.0',
            'Accept': '*/*',
            'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://mp.weixin.qq.com/cgi-bin/bizlogin?action=validate&lang=zh_CN&account=466940702%40qq.com',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': reqCookies,
            'X-Requested-With': 'XMLHttpRequest'
        }
    }
    //获取保存图片请求
    const scanQrcodeRes = https.get(scanQrcodeOption, (req) => {
        //获取内容为json串
        req.on('data', (d) => {
            let data = JSON.parse(d);
            console.log("data:", data)
            //data.base_resp.status 
            //0 为未扫码 1 为微信端已确认 4 则是客户端已扫码 
            if (data.status == '1') {
                console.log("client confirmed . ")
                flag = true
            } else if (data.status == '0') {
                console.log("wait scan qrcoed .")
            } else if (data.status == '4') {
                console.log("scan qrcoed .")
            } else {
                console.log("other info.")
            }
        });
    });
    console.log(scanQrcodeRes)
    scanQrcodeRes.on('error', (e) => {
        ctx.body = {
            msg: e
        }
    });
    scanQrcodeRes.end();
}
function getLoginToken() {
    //获取登录token配置
    let loginTokenOption = {
        host: 'mp.weixin.qq.com',
        path: '/cgi-bin/bizlogin?action=login&lang=zh_CN',
        method: 'POST',
        port: 443,
        headers: {
            'Host': 'mp.weixin.qq.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:61.0) Gecko/20100101 Firefox/61.0',
            'Accept': '*/*',
            'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://mp.weixin.qq.com/cgi-bin/bizlogin?action=validate&lang=zh_CN&account=466940702%40qq.com',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': reqCookies,
            'X-Requested-With': 'XMLHttpRequest'
        }
    }
    //获取token响应
    const loginTokenRes = https.get(loginTokenOption, (req) => {
        req.on('data', (d) => {
            let data = transformBuffer(d);
            console.log("DATA:",data)
            if(JSON.parse(data).redirect_url){
                let url = JSON.parse(data).redirect_url;
                loginToken = url.slice(30,40);
                //获取浏览器cookie
                reqCookies = req.headers["set-cookie"];
                console.log("loginedCookies:",reqCookies)
            }
            // let data = JSON.parse(d);
            // console.log("data:",data)
        });
    });
    loginTokenRes.on('error', (e) => {
        ctx.body = {
            msg: e
        }
    });
    loginTokenRes.end();
}
function getLoginedData(){
    //登陆后数据获取配置
    let loginedDataOption = {
        host: 'mp.weixin.qq.com',
        path: '/wxopen/home?lang=zh_CN&token='+loginToken,
        method: 'GET',
        port: 443,
        headers: {
            'Host': 'mp.weixin.qq.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:61.0) Gecko/20100101 Firefox/61.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://mp.weixin.qq.com/cgi-bin/bizlogin?action=validate&lang=zh_CN&account=466940702%40qq.com',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': reqCookies,
            'X-Requested-With': 'XMLHttpRequest',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests':1
        }
    }
    const loginedDataRes = https.get(loginedDataOption, (req) => {
        //获取内容为json串
        req.on('data', (d) => {
            console.log(d)
            console.log(d.toString())
            htmlcon = transformBuffer(d);
            console.log(htmlcon)
        });
    });
    loginedDataRes.on('error', (e) => {
        ctx.body = {
            msg: e
        }
    });
    loginedDataRes.end();
}
router.get('/', async (ctx, next) => {
    //微信登录
    wechatLogin();
    await funPromise(2000);
    //获取扫描二维码
    getQrcode();
    //确认是否扫描二维码
    var scanTime = setInterval(async () => {
        console.log(flag)
        if (!flag) {
            scanQrcode();
        } else {
            clearInterval(scanTime);
            //获取确认通过的token
            getLoginToken();
            //给浏览器设置cookie
            // setHtmlCookies(ctx,loginedCookies);
            await funPromise(2000);
            //正式访问登录后页面内容
            getLoginedData();
            ctx.body = {
                data:htmlcon
            }
        }
    }, 1000);
})
app.use(router.routes())

app.listen(8080)