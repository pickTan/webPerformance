'use strict';

;(function(){
    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };
    
    function colle() {
    }
    
    function ajax(obj) {
        var xmlhttp, type, url, async, dataType, data;
        if ((typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) != 'object') return false;
        type = obj.type == undefined ? 'POST' : obj.type.toUpperCase();
        url = obj.url == undefined ? window.location.href : obj.url;
        async = obj.async == undefined ? true : obj.type;
        dataType = obj.dataType == undefined ? 'HTML' : obj.dataType.toUpperCase();
        data = obj.data == undefined ? {} : obj.data;
        var formatParams = function formatParams() {
            if ((typeof data === 'undefined' ? 'undefined' : _typeof(data)) == "object") {
                var str = "";
                for (var pro in data) {
                    str += pro + "=" + data[pro] + "&";
                }
                data = str.substr(0, str.length - 1);
            }
            if (type == 'GET' || dataType == 'JSONP') {
                if (url.lastIndexOf('?') == -1) {
                    url += '?' + data;
                } else {
                    url += '&' + data;
                }
            }
        };
        if (window.XMLHttpRequest) {
            xmlhttp = new XMLHttpRequest();
        } else {
            xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        }
        if (dataType == 'JSONP') {
            if (typeof obj.beforeSend == 'function') obj.beforeSend(xmlhttp);
            var callbackName = ('jsonp_' + Math.random()).replace(".", "");
            var oHead = document.getElementsByTagName('head')[0];
            data.callback = callbackName;
            var ele = document.createElement('script');
            ele.type = "text/javascript";
            ele.onerror = function () {
                // console.log('请求失败');
                obj.error && obj.error("请求失败");
            };
            oHead.appendChild(ele);
            window[callbackName] = function (json) {
                oHead.removeChild(ele);
                window[callbackName] = null;
                obj.success && obj.success(json);
            };
            formatParams();
            ele.src = url;
            return;
        }
        formatParams();
        xmlhttp.open(type, url, async);
        xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded; charset=utf-8");
        if (typeof obj.beforeSend == 'function') obj.beforeSend(xmlhttp);
        xmlhttp.send(data);
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.status != 200) {
                console.log(xmlhttp.status + '错误');
                obj.error && obj.error(xmlhttp.status + '错误');
                return;
            }
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                var res  = '';
                if (dataType == 'JSON') {
                    try {
                        res = JSON.parse(xmlhttp.responseText);
                    } catch (e) {
                        console.log('返回的json格式不正确');
                        obj.error('返回的json格式不正确');
                    }
                } else if (dataType == 'XML') {
                    res = xmlhttp.responseXML;
                } else {
                    res = xmlhttp.responseText;
                }
                obj.success && obj.success(res);
            }
        };
    }

    /* 在微信内加载 JSSDK的方法的封装*/
    if (/MicroMessenger/gi.test(navigator.userAgent)) {
        // 如果是微信分享
        if (window.wx) {
            getWxSign();
        } else {
            var wxScript = document.createElement('script');
            wxScript.src = 'https://res.wx.qq.com/open/js/jweixin-1.0.0.js';
            wxScript.onload = function () {
                if (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete') {
                    getWxSign();
                } else {
                    // alert('加载失败');
                }
            };
            document.body.appendChild(wxScript);
        }
    }

    function getWxSign() {
        ajax({
            type: 'get',
            url: 'https://mwechats.kugou.com/jssdk/getSignature?caller=kugou_web',
            async: true,
            dataType: 'JSONP',
            data: {
                'url': encodeURIComponent(location.href.split("#")[0])
            },
            success: function success(data) {
                if (data) {
                    try {
                        wx.config({
                            beta: true,
                            debug: false, //调试时改为true
                            appId: data.appId,
                            timestamp: data.timestamp,
                            nonceStr: data.nonceStr,
                            signature: data.signature,
                            jsApiList: ["onMenuShareTimeline", "onMenuShareAppMessage", "onMenuShareQQ", "onMenuShareWeibo", "onMenuShareQZone", "launchApplication"]
                        });
                    } catch (e) {
                        // log(e)
                    }
                }
            },
            error: function error(data) {
                // alert("获取签名失败，请重新获取");
            }
        });
    }
    /* 比较版本号*/
    var compareVersion = function compareVersion(ver1, ver2) {
        var version1pre = parseFloat(ver1);
        var version2pre = parseFloat(ver2);
        var version1next = ver1.replace(version1pre + ".", "");
        var version2next = ver2.replace(version2pre + ".", "");
        if (version1pre > version2pre) {
            return true;
        } else if (version1pre < version2pre) {
            return false;
        }
        if (version1next >= version2next) {
            return true;
        } else {
            return false;
        }
    };

    /* 蒙层*/
    var _div = document.createElement('div');
    _div.classList.add('pop_mask');
    _div.classList.add('hide');
    _div.setAttribute('id', 'pop_mask');
    document.body.appendChild(_div);
    if (/iPhone|iPod|iPad/gi.test(navigator.userAgent)) {
        _div.innerHTML = '<img src="http://imge.kugou.com/h5_pic/20180117200200954200.png" />';
    } else {
        _div.innerHTML = '<img src="http://imge.kugou.com/h5_pic/20180117200200574163.png" />';
    }
    _div.addEventListener('click', function () {
        this.style.display = 'none';
    }, false);

    function launchKugou(param, callback) {

        var url = 'https://a.app.qq.com/o/simple.jsp?pkgname=com.kugou.android&ckey=CK1350585625600';
        var ua = navigator.userAgent;
        var iosScheme = 'kugouurl://';
        var androidScheme = 'kugou://';
        // 兼容安卓拉起的json对象
        var json = {
            is_start_weixin: true,
            real_content: 'kugou://start.weixin?' + JSON.stringify(param)
        };

        var schema = /(iphone|ipod|ipad)/gi.test(ua) ? iosScheme : androidScheme;

		 setTimeout(function () {
			if (/iphone/i.test(navigator.userAgent)) {

				if (param.cmd == 303) {
					var params = {
						type: 12,
						url: param.jsonStr.url
					};
					location.href = 'https://mo.kugou.com/universal/?channel=199&Type=7&Action=0&Json=' + JSON.stringify(params);
				} else if (param.cmd == 301) {
					var params = param.jsonStr;
					location.href = 'https://mo.kugou.com/universal/?channel=199&Type=1&Action=1&Json=' + encodeURIComponent(JSON.stringify(params));
				}
			} else {
				var url = 'https://a.app.qq.com/o/simple.jsp?pkgname=com.kugou.android&ckey=CK1350585625600';
				location.href = url + '&android_schema=' + (schema + 'start.weixin?' + JSON.stringify(param)) + '&schema_version=7950';
			}
		}, 100);

		return;

        try {
            if (!/MicroMessenger/i.test(ua)) {
                if (/(weibo|QQ)/i.test(ua)) {
                    // 弹出蒙层,宋文靠你了
                    document.getElementById('pop_mask').style.display = 'block';
                    callback && callback({
                        err_msg: 'popMask'
                    });
                } else {
                    if (!document.hidden || !document.webkitHidden) if (/iphone/i.test(navigator.userAgent)) {
                        if (param.cmd == 303) {
                            var params = {
                                type: 12,
                                url: param.jsonStr.url
                            };
                            location.href = 'https://mo.kugou.com/universal/?Type=7&Action=0&Json=' + JSON.stringify(params);
                        } else if (param.cmd == 301) {
                            var params = param.jsonStr;
                            location.href = 'https://mo.kugou.com/universal/?Type=1&Action=1&Json=' + encodeURIComponent(JSON.stringify(params));
                        }
                    } else {
                        var url = 'https://a.app.qq.com/o/simple.jsp?pkgname=com.kugou.android&ckey=CK1350585625600';
                        location.href = url + '&android_schema=' + (schema + 'start.weixin?' + JSON.stringify(param)) + '&schema_version=7950';
                    }
                    setTimeout(function () {
                        window.location.href = schema + 'start.weixin?' + JSON.stringify(param);
                    }, 1000);
                    callback && callback({
                        err_msg: 'launchBySchemaUrl'
                    });
                }
            }
            else if (compareVersion(navigator.userAgent.match(/MicroMessenger\/([\d\.]+)/i)[1], '6.5.16')) {
                setTimeout(function () {
                    wx.invoke('launchApplication', {
                        "appID": 'wx79f2c4418704b4f8',
                        "parameter": 'kugouurl://start.weixin?' + encodeURIComponent(JSON.stringify(param)),
                        "extInfo": 'kugouURL://start.fanxing?' + encodeURIComponent(JSON.stringify(json))
                    }, function (res) {
                        if (res.err_msg === "launchApplication:ok") {
                            // colle({
                            //     a: /iphone/i.test(window.navigator.userAgent) ? 12945 : 13079,
                            //     b: '点击',
                            //     r: '\u521B\u9020101\u6295\u7968\u6D3B\u52A8-\u7AEF\u5916',
                            //     ft: '点击拉起',
                            //     channel: /iphone/i.test(window.navigator.userAgent) ? 4444 : 'CK1350585625600',
                            //     timestamp: new Date().getTime(),
                            //     fs: '成功',
                            //     appid: KgMobileCall.isAndroid ? 1005 : KgMobileCall.isIOS ? 1000 : 1058
                            // });
                            //统计,成功拉起
                        } else if (res.err_msg === "launchApplication:fail") {
                            // colle({
                            //     a: /iphone/i.test(window.navigator.userAgent) ? 12945 : 13079,
                            //     b: '点击',
                            //     r: '\u521B\u9020101\u6295\u7968\u6D3B\u52A8-\u7AEF\u5916',
                            //     ft: '点击拉起',
                            //     channel: /iphone/i.test(window.navigator.userAgent) ? 4444 : 'CK1350585625600',
                            //     timestamp: new Date().getTime(),
                            //     fs: '失败',
                            //     appid: KgMobileCall.isAndroid ? 1005 : KgMobileCall.isIOS ? 1000 : 1058
                            // });
                            setTimeout(function () {
                                window.location.href = "http://mo.kugou.com/download/app/index.php";
                            }, 50);
                            // //统计，未安装
                        } else {
                            // colle({
                            //     a: /iphone/i.test(window.navigator.userAgent) ? 12945 : 13079,
                            //     b: '点击',
                            //     r: '\u521B\u9020101\u6295\u7968\u6D3B\u52A8-\u7AEF\u5916',
                            //     ft: '点击拉起',
                            //     channel: /iphone/i.test(window.navigator.userAgent) ? 4444 : 'CK1350585625600',
                            //     timestamp: new Date().getTime(),
                            //     fs: '失败',
                            //     appid: KgMobileCall.isAndroid ? 1005 : KgMobileCall.isIOS ? 1000 : 1058
                            // });
                            setTimeout(function () {
                                if (/iphone/i.test(navigator.userAgent)) {

                                    if (param.cmd == 303) {
                                        var params = {
                                            type: 12,
                                            url: param.jsonStr.url
                                        };
                                        location.href = 'https://mo.kugou.com/universal/?channel=199&Type=7&Action=0&Json=' + JSON.stringify(params);
                                    } else if (param.cmd == 301) {
                                        var params = param.jsonStr;
                                        location.href = 'https://mo.kugou.com/universal/?channel=199&Type=1&Action=1&Json=' + encodeURIComponent(JSON.stringify(params));
                                    }
                                } else {
                                    var url = 'https://a.app.qq.com/o/simple.jsp?pkgname=com.kugou.android&ckey=CK1350585625600';
                                    location.href = url + '&android_schema=' + (schema + 'start.weixin?' + JSON.stringify(param)) + '&schema_version=7950';
                                }
                            }, 100);
                            //其他原因导致拉起失败，统计
                        }
                        callback && callback(res);
                    });
                }, 200);
            } else {
                // 弹出蒙层,宋文靠你了
                document.getElementById('pop_mask').style.display = 'block';
                callback && callback({
                    err_msg: 'popMask'
                });
            }
        } catch (e) {
            console.log(e);
        }
    }
    window.launchKugou = launchKugou;
})();