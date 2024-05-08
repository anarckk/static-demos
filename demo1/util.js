//创建XMLHttpRequest 对象
//参数：无
//返回值：XMLHttpRequest 对象
function createXHR() {
    var XHR = [  //兼容不同浏览器和版本得创建函数数组
        function () { return new XMLHttpRequest() },
        function () { return new ActiveXObject("Msxml2.XMLHTTP") },
        function () { return new ActiveXObject("Msxml3.XMLHTTP") },
        function () { return new ActiveXObject("Microsoft.XMLHTTP") }
    ];
    var xhr = null;
    //尝试调用函数，如果成功则返回XMLHttpRequest对象，否则继续尝试
    for (var i = 0; i < XHR.length; i++) {
        try {
            xhr = XHR[i]();
        } catch (e) {
            continue  //如果发生异常，则继续下一个函数调用
        }
        break;  //如果成功，则中止循环
    }
    return xhr;  //返回对象实例
}

function getConfig() {
    return rxjs.Observable.create(ob => {
        var xhr = createXHR();
        xhr.open("GET", "config.json");
        xhr.send(null);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    ob.next(JSON.parse(xhr.responseText));
                } else {
                    ob.error(xhr.status + " " + xhr.statusText);
                }
            }
        }
        return () => xhr.abort();
    });
}
/**
 * 日期对象转为日期字符串
 * @param date 需要格式化的日期对象
 * @param sFormat 输出格式,默认为yyyy-MM-dd                         年：y，月：M，日：d，时：h，分：m，秒：s，周：w，毫秒：fff
 * @example  dateFormat(new Date())                                "2017-02-28"
 * @example  dateFormat(new Date(),'yyyy-MM-dd')                   "2017-02-28"
 * @example  dateFormat(new Date(),'yyyy-MM-dd hh:mm:ss')         "2017-02-28 09:24:00"
 * @example  dateFormat(new Date(),'hh:mm')                       "09:24"
 * @example  dateFormat(new Date(),'yyyy-MM-ddThh:mm:ss+08:00')   "2017-02-28T09:24:00+08:00"
 */
function dateFormat(date, sFormat = 'yyyy-MM-dd') {
    const week = ['天', '一', '二', '三', '四', '五', '六'];
    const time = {
        Year: 0, // 2018
        TYear: '0', // 18
        Month: 0,
        TMonth: '0',
        Day: 0,
        TDay: '0',
        Hour: 0,
        THour: '0',
        hour: 0,
        Thour: '0',
        Minute: 0,
        TMinute: '0',
        Second: 0,
        TSecond: '0',
        Millisecond: 0,
        week: 0
    };
    time.Year = date.getFullYear();
    time.TYear = String(time.Year).substr(2);
    time.Month = date.getMonth() + 1;
    time.TMonth = time.Month < 10 ? '0' + time.Month : String(time.Month);
    time.Day = date.getDate();
    time.TDay = time.Day < 10 ? '0' + time.Day : String(time.Day);
    time.Hour = date.getHours();
    time.THour = time.Hour < 10 ? '0' + time.Hour : String(time.Hour);
    time.hour = time.Hour < 13 ? time.Hour : time.Hour - 12;
    time.Thour = time.hour < 10 ? '0' + time.hour : String(time.hour);
    time.Minute = date.getMinutes();
    time.TMinute = time.Minute < 10 ? '0' + time.Minute : String(time.Minute);
    time.Second = date.getSeconds();
    time.TSecond = time.Second < 10 ? '0' + time.Second : String(time.Second);
    time.Millisecond = date.getMilliseconds();
    time.week = date.getDay();

    return sFormat.replace(/yyyy/ig, String(time.Year))
        .replace(/yyy/ig, String(time.Year))
        .replace(/yy/ig, time.TYear)
        .replace(/y/ig, time.TYear)
        .replace(/MM/g, time.TMonth)
        .replace(/M/g, String(time.Month))
        .replace(/dd/ig, time.TDay)
        .replace(/d/ig, String(time.Day))
        .replace(/HH/g, time.THour)
        .replace(/H/g, String(time.Hour))
        .replace(/hh/g, time.Thour)
        .replace(/h/g, String(time.hour))
        .replace(/mm/g, time.TMinute)
        .replace(/m/g, String(time.Minute))
        .replace(/ss/ig, time.TSecond)
        .replace(/s/ig, String(time.Second))
        .replace(/fff/ig, String(time.Millisecond))
        .replace(/w/g, String(time.week))
        .replace(/W/g, week[time.week]);
}

function currentTimetamp() {
    return dateFormat(new Date(), "yyyy-MM-dd HH:mm:ss");
}

function runConfigServer(TOTAL_CONFIG) {
    console.log('连接配置中心', TOTAL_CONFIG.config_id);
    var connList = [];

    function connUpdate() {
        connList.forEach(li => {
            li.conn.send({
                type: TOTAL_CONFIG.MSG_TYPE.USER_LIST,
                value: connList
                    .filter(f => f.id != li.id)
                    .map(f => Object.assign({}, { id: f.id }))
            });
        });
    }

    var configPeerMyself = new Peer(TOTAL_CONFIG.config_id);
    configPeerMyself.on('open', function (id) {
        console.log('configPeerMyself open', id);
    });
    configPeerMyself.on('connection', function (dataConnection) {
        let ask = 0;
        let timer;
        console.log('configPeerMyself connection', dataConnection);
        dataConnection.on('data', function (data) {
            if (data.type == TOTAL_CONFIG.MSG_TYPE.ASK_ALIVE) {
                dataConnection.send({ type: TOTAL_CONFIG.MSG_TYPE.REPLAY_ALIVE });
                return;
            }
            if (data.type == TOTAL_CONFIG.MSG_TYPE.REPLAY_ALIVE) {
                ask--;
                return;
            }
            console.log('configPeer dataConnection data', dataConnection.peer, data);
        });
        dataConnection.on('open', function (e) {
            console.log('configPeer dataConnection open', e);
            connList.push({ id: dataConnection.peer, conn: dataConnection });
            console.log(connList);
            timer = setInterval(() => {
                if (ask > 1) {
                    console.log('判断该连接失活');
                    dataConnection.close();
                } else {
                    dataConnection.send({ type: TOTAL_CONFIG.MSG_TYPE.ASK_ALIVE });
                    ask++;
                }
            }, 1000);
            connUpdate();
        });
        dataConnection.on('close', function (e) {
            console.log('configPeer dataConnection close', e);
            connList = connList.filter(f => f.id != dataConnection.peer);
            connUpdate();
            if (timer) clearInterval(timer);
            ask = 0;
        });
        dataConnection.on('error', function (err) {
            console.log('configPeer dataConnection error', err);
        });
    });
    configPeerMyself.on('call', function (mediaConnection) {
        console.log('configPeerMyself call', mediaConnection);
    });
    configPeerMyself.on('close', function (e) {
        console.log('configPeerMyself close', e);
    });
    configPeerMyself.on('disconnected', function (e) {
        console.log('configPeerMyself disconnected', e);
        configPeerMyself.reconnect();
    });
    configPeerMyself.on('error', function (err) {
        console.error('configPeerMyself error', err);
    });
}