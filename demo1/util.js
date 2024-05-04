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
