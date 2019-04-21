var apmCollectData = apmCollectData || [];

(function () {
    FastClick.attach(document.body);
    var cli, rout, utils, source, template,
        sidToView = true,
        clientHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight,
        tenUrlPath = 'https://yobang.tencentmusic.com',//腾讯接口文档
        //tenUrlPath = 'http://tmesit.tencent.com',//腾讯测试接口
        //tenUrlPath = 'https://proxy_pass.kugou.com/tmesit.tencent.com',//腾讯测试接口
        // activityUrlPath = 'https://activity.mobile.kugou.com',//票接口
        activityUrlPath = 'https://mactivitys.kugou.com',//票接口
        // mkugouUiUrlPath = 'https://m3ws.kugou.com',//票接口
        mkugouUrlPath = 'https://m3ws.kugou.com',//票接口
        // mkugouUrlPath = 'http://m.kugou.com',//票接口
        firstYear = '2018',
        songCoverBase64 = { //歌曲的base64封面缓存

        },
        outPlay = audioPlay(),
        nowPlay = false,
        PeriodList = {   //期数
            '2018': null
        },
        currentUrl = '', //当前的hash
        preHash = '/', //上一次的hash
        songHashData = {    //歌曲hash缓存

        },
        songMVHashData = {},
        listData = {
            issue: 'now', //当前展示的期数，默认为最新期数
            now: null, //最新榜档数据
            banner: null, //banner信息
            notes: null, //公告
            isBindMobile: false, //是否绑定手机好
            isYearVip: false, //是否年费
            choiceItem: {   //点赞选中的对象
                "spare_vote": 0, //可投票数
                "rank": 0,
                "songId": "",//歌曲id
                "platformSongId": "", //客户端songid
                "uniIndex": "", //指数
                "coverImages": "", //封面
                "songName": "", //歌名
                "singerId": "", //歌曲id
                "singerName": "", //歌曲名
                "mvId": null,
                "rankChange": 0,
                "base64": null  //base64分享卡片
            }
        },
        actions = asks(),
        routers = {
            root: '/',
            rule: '/rule',
            praise: '/praise',
            shareImg: '/praise/shareImg',
            exponent: '/exponent'
        },
        pSIdToHash = {},
        initInfo = {};

    function checkLogCount(data) {


        var json = {
            source_id: 2087,
            page_id: 3067,
            mid: initInfo.mid,
            user_id: initInfo.kugouID,
            tv: initInfo.version,
            plat_id: KgMobileCall.isIOS ? 1000 : 1005
        };


        $.extend(json, data);

        apmCollectData.push([001, json, null, false]);
        try {
            newLogCount();
        } catch (ex) {
        }

    }

    /*************************************************注入参数***********************************************************************************************/
    //router
    //工具类
    utils = (function () {
        return {
            copyJson: function (json1, json2) {
                function concant(j1, j2) {
                    for (var key in j2) {
                        if (typeof j2[key] == 'object') {
                            (typeof j1[key] == 'object') || (j1[key] = {});
                            concant(j1[key], j2[key]);
                        } else {
                            j1[key] = j2[key];
                        }
                    }
                };
                concant(json1, json2);
            },
            /**
             * es6 的 array.find()
             * @param list
             * @param callback
             */
            findObj: function (list, callback) {
                var obj = null;
                list.forEach(function (item) {
                    if (callback(item) && !obj) obj = item;
                })
                return obj;
            },
            params: function (data) {
                var arr = [];
                for (var i in data) {
                    arr.push(encodeURIComponent(i) + '=' + encodeURIComponent(data[i]));
                }
                return arr.join('&');
            },
            localCache: function (key, value, localtype) {
                if (localtype) {
                    return localStorage[localtype](key, JSON.stringify(value));
                }
                if (value === undefined) {
                    var thisVal = localStorage.getItem(key);
                    var obj = JSON.parse(thisVal);
                    return thisVal ? (obj.type === 'string' ? obj.value : JSON.parse(obj.value)) : !!thisVal;
                }

                var type = {value: value, type: 'string'};
//                    Array.isArray(value) && (type = {value: JSON.stringify(value), type: 'array'} );
                (typeof value == 'object') && (type = {value: JSON.stringify(value), type: 'obj'});
                localStorage.setItem(key, JSON.stringify(type));
            },
            getQueryString: function (name) {
                var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
                var r = window.location.search.substr(1).match(reg);
                if (r != null) return unescape(r[2]);
                return null;
            }
        };
    })();
    //ajax请求
    source = (function () {
        var sourceNum = 1;

        function moPost(url, data, backFun) {
//                var param = utils.params(data);
            KgMobileCall.getData({
                url: url,
                method: 'post',
                timeout: 10000,
                param: JSON.stringify(data)
            }, function (result) {
                if (result.status == 1) {
                    backFun(JSON.parse(decodeURIComponent(JSON.stringify(result.data))));
                } else {
                    actions.waitAndMsg('网络错误，请检查网络');
                }
            });
        }

        function ajax() {
            var ajaxData = {
                type: arguments[0].type || "GET",
                url: arguments[0].url || "",
                async: arguments[0].async || "true",
                data: arguments[0].data || null,
                dataType: arguments[0].dataType || "text",
                contentType: arguments[0].contentType || "application/x-www-form-urlencoded; charset=UTF-8",
//                    contentType: arguments[0].contentType || "application/json",
                beforeSend: arguments[0].beforeSend || function () {
                },
                success: arguments[0].success || function () {
                },
                error: arguments[0].error || function () {
                    actions.waitAndMsg('请检查网络');
                }
            };
            ajaxData.beforeSend();
            var timedout = false;
            try {
                var xhr = createxmlHttpRequest();
                var f1 = setTimeout(function () {
                    timedout = true;
                    xhr.abort();
                    actions.waitAndMsg('网络繁忙请重试');
                }, 10000);
                xhr.responseType = ajaxData.dataType;
            } catch (e) {
                xhr.overrideMimeType('text/xml; charset = utf-8')
            }
            ajaxData.type.toLocaleLowerCase() == 'get' &&
            (ajaxData.url = ~ajaxData.url.indexOf('?') ? ajaxData.url + '&' + convertData(ajaxData.data) : ajaxData.url + '?' + convertData(ajaxData.data))

            xhr.open(ajaxData.type, ajaxData.url, ajaxData.async);
            xhr.setRequestHeader("Content-Type", ajaxData.contentType);
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
            xhr.setRequestHeader("Accept", "application/json, text/javascript, */*; q=0.01");
            xhr.send(convertData(ajaxData.data));
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    if (timedout) return;
                    clearTimeout(f1);

                    if (xhr.status == 200 || xhr.status == 0) {
                        var reslut = xhr.response;
                        if (typeof reslut == 'string') reslut = JSON.parse(reslut);
                        ajaxData.success(reslut)
                    } else {
                        ajaxData.error({message: '超时'})
                    }
                }
            }
        }

        function createxmlHttpRequest() {
            if (window.ActiveXObject) {
                return new ActiveXObject("Microsoft.XMLHTTP");
            } else if (window.XMLHttpRequest) {
                return new XMLHttpRequest();
            }
        }

        function convertData(data) {
            if (typeof data === 'object' && !(data instanceof FormData) && !(data instanceof Blob)) {
                var convertResult = "";
                for (var c in data) {
                    convertResult += c + "=" + data[c] + "&";
                }
                convertResult = convertResult.substring(0, convertResult.length - 1);
                return convertResult;
            } else {
                return data;
            }
        }


        function jsonpSource(params) {
            //创建script标签并加入到页面中
            var callbackName = 'jsonp_' + (++sourceNum) + '_' + ~~(Math.random() * 100);
            var head = document.getElementsByTagName('head')[0];
            // 设置传递给后台的调参数名
            params.data['callback'] = callbackName;
            var data = utils.params(params.data);
            var script = document.createElement('script');
            head.appendChild(script);
            //创建jsonp回调函数
            window[callbackName] = function (json) {
                head.removeChild(script);
                clearTimeout(script.timer);
                window[callbackName] = null;
                params.success && params.success(json);
            };
            //发送请求
            var flag = params.url.indexOf('?') > -1;
            script.src = params.url + (flag ? '&' : '?') + data;
            //为了得知此次请求是否成功，设置超时处理
            if (params.time) {
                script.timer = setTimeout(function () {
                    window[callbackName] = null;
                    head.removeChild(script);
                    params.error && params.error({
                        message: '超时'
                    });
                }, params.time);
            }
        };

        function errorFun(res) {
            actions.waitAndMsg(res.message)
        }

        function post(url, data, success) {
            return ajax({url: url, type: 'post', dataType: 'json', data: data, success: success, error: errorFun})
        }

        function get(url, data, success) {
            return ajax({url: url, type: 'get', dataType: 'json', data: data, success: success, error: errorFun})
        }

        function jsonp(url, data, success) {
            return jsonpSource({url: url, type: 'get', dataType: 'json', data: data, success: success, error: errorFun, time: 10000})
        }

        return {
            get: get,
            post: post,
            jsonp: jsonp,
            moPost: moPost
        }
    })();
    //模版拼接
    template = (function () {
        var tems = {
            mindWar: function (obj) {
                obj.css = obj.css ? '<style scoped>' + obj.css + '</style>' : '';
                return (obj.css + '<section class="pub-show-msg opacity3"><span>' + obj.msg + '</span></section>');
            },
            waitingNext: function (obj) {
                var content = obj.content || '等待中...';
                return ('<li class="waiting-next"><em class="waiting-flos" data-content="' + content + '"></em></li>');
            },
            selectHtl: function (obj) {
                var htl = '';
                for (var key in obj) {
                    htl += obj[key].map(function (item) {
                        return '<option  value ="' + item.issue + '">' + item.title + '</option>'
                    }).join('');
                }
                return ' <select >\n' +
                    '<option value ="now" >' + listData.now.issueTitle + '</option>' +
                    htl +
                    '                </select>';
            },
            /**
             *
             * @returns {string}
             */
            index: function (obj) {
                var issueTitle = obj.issueTitle.split('（')[0],
                    notes = listData.notes,
                    noteHtml = notes ? '<div class="affiche  one-px-bottom">\n' +
                        '        <p class="affiche-info">' + notes[0].content + '</p>\n' +
                        '        <div class="affiche-btn"></div>\n' +
                        '    </div>\n' : '';
                var issueStart = obj.issueStart.substring(5, 16);
                return '<div class="banner">\n' +
                    '        <img  src="https://webimg.kgimg.com/76348db18e2e00abbe01d6fc76ced0b8.png">\n' +
                    '        <div class="banner-info-periods-btn now"> <span>' + issueTitle + '</span></div>\n' +
                    '        <ul class="banner-info">\n' +
                    '            <li class="banner-info-update-time "><span> ' + issueStart + ' 更新</span></li>\n' +
                    '            <li><span class="one-px-right"> </span></li>\n' +
                    '            <li class="go-tofficial-website-btn">官网 ></li>\n' +
                    '            <li class="banner-info-go-off-btn"></li>\n' +
                    '        </ul>\n' +
                    '    </div>\n' +
                    noteHtml +
                    '\n' +
                    '    <div class="list">\n' +
                    '        <ul class="list-options one-px-bottom">\n' +
                    '            <li class="list-option-week list-option-choice">本周实时榜</li>\n' +
                    '            <li class="list-option-periodList">往期榜单</li>\n' +
                    '        </ul>\n' +
                    '        <div class="list-container">\n' +
                    '    </div>'
                '    </div>'
            },
            nowList: function (obj) {
                var lisHtl = obj && obj[0] ? obj.map(function (item, i) {
                    item.diffUniIndex = item.rank == 1 ? -1 : obj[i - 1].uniIndex - item.uniIndex;
                    var rankChange = item.rankChange;
                    //判断上升下降

                    if (rankChange == 999999) {
                        rankChange = '<em class="list-data-item-trends new">new</em>'
                    } else if (rankChange == 0) {
                        rankChange = '<em class="list-data-item-trends flat">—</em>'
                    } else if (rankChange > 0) {
                        rankChange = '<em class="list-data-item-trends rise">' + rankChange + '</em>'
                    } else if (rankChange < 0) {
                        rankChange = '<em class="list-data-item-trends fall">' + Math.abs(rankChange) + '</em>'
                    }
                    return '  <li id="now_' + item.songId + '" class="sid_' + item.platformSongId + ' ' + (pSIdToHash[item.platformSongId] ? 'sh_' + pSIdToHash[item.platformSongId] : '') + '" >\n' +
                        '                <ul class="list-data-item" data-item="' + encodeURIComponent(JSON.stringify(item)) + '" >\n' +
                        '                    <li class="list-data-item-rank"><div><span>' + item.rank + '</span>' + rankChange + '</div></li>\n' +
                        // '                    <li class="list-data-item-img" style="background-image: url(' + item.coverImages + ');"></li>\n' +
                        '                    <li class="list-data-item-img" data-img="' + item.coverImages + '"></li>\n' +
                        '                    <li class="list-data-item-info">\n' +
                        '                        <ul>\n' +
                        '                            <li class="list-data-item-songname ' + (item.mvId ? 'has-mv' : '') + ' "><span>' + item.songName + '</span></li>\n' +
                        '                            <li class="list-data-item-singer">' + item.singerName + '</li>\n' +
                        '                            <li class="list-data-item-exponent">由你指数:' + item.uniIndex + '</li>\n' +
                        '                        </ul>\n' +
                        '                    </li>\n' +
                        //rankChange +
                        '                    <li  class="list-data-item-btn">\n' +
                        '                        <div >点赞</div>\n' +
                        '                    </li>\n' +
                        '\n' +
                        '                </ul>\n' +
                        '            </li>\n'
                }).join('') : '';
                return ' <ul class="list-data now-data">\n' +
                    (listData.banner ? '<img class="now-data-banner" src="' + listData.banner.mobileImage + '" />' : '') +
                    lisHtl + '</ul>'
            },
            oldList: function (obj) {
                var lisHtl = obj && obj[0] ? obj.map(function (item, i) {
                    item.diffUniIndex = item.rank == 1 ? -1 : obj[i - 1].uniIndex - item.uniIndex;
                    var firstMoreHtl = item.rank == '1' ? '  <li class="list-data-item-on-list-info  one-px-bottom">\n' +
                        '                                <ul>\n' +
                        '                                    <li class="on-list-info-times">\n' +
                        '                                        <label>上榜周数:</label>\n' +
                        '                                        <span>' + item.weeks + '</span>\n' +
                        '                                    </li>\n' +
                        '                                    <li class="on-list-info-best-rank">\n' +
                        '                                        <label>最高排名</label>\n' +
                        '                                        <span>' + item.highestRank + '</span>\n' +
                        '                                    </li>\n' +
                        '                                    <li class="on-list-info-static-btn">\n' +
                        '                                        <img >\n' +
                        '                                    </li>\n' +
                        '                                </ul>\n' +
                        '                            </li>\n' : '';
                    return '  <li class="sid_' + item.platformSongId + ' ' + (pSIdToHash[item.platformSongId] ? 'sh_' + pSIdToHash[item.platformSongId] : '') + '" >\n' +
                        '                <ul class="list-data-item" data-item="' + encodeURIComponent(JSON.stringify(item)) + '">\n' +
                        '                    <li class="list-data-item-rank"><span>' + item.rank + '</span></li>\n' +
                        // '                    <li class="list-data-item-img" data-img="' + item.coverImages + '" style="background-image: url(' + item.coverImages + ');"></li>\n' +
                        '                    <li class="list-data-item-img" data-img="' + item.coverImages + '" ></li>\n' +
                        '                    <li class="list-data-item-info">\n' +
                        '                        <ul>\n' +
                        '                            <li class="list-data-item-songname ' + (item.mvId ? 'has-mv' : '') + '"><span>' + item.songName + '</span></li>\n' +
                        '                            <li class="list-data-item-singer">' + item.singerName + '</li>\n' +
                        '                            <li class="list-data-item-exponent">由你指数:' + item.uniIndex + '</li>\n' +
                        firstMoreHtl +
                        '                        </ul>\n' +
                        '                    </li>\n' +
                        '                    <li ' + (firstMoreHtl ? 'style="display: none;"' : '') + '  class="list-data-item-btn">\n' +
                        '                        <a></a>\n' +
                        '                    </li>\n' +
                        '                </ul>\n' +
                        '            </li>';
                }).join('') : '';
                return '<ul class="list-data now-data old-data">\n' + lisHtl + '</ul>'
            },
        };

        function createStrHtl(data, temName, attrs, type) {
            var htmlList = [];
            // if (data instanceof Array && Object.prototype.toString.call(data) === '[object Array]') {
            //     data.forEach(function (item) {
            //         htmlList.push(tems[temName](item));
            //     });
            // } else {
            //     htmlList.push(tems[temName](data));
            // }
            htmlList.push(tems[temName](data));
            return htmlList.join('');


        }

        /**
         * 模版
         **/
        function createTem(data, temName, attrs, type) {
            var htmlList = [];
            htmlList.push(tems[temName](data));
            // if (data instanceof Array && Object.prototype.toString.call(data) === '[object Array]') {
            //     // 修改为 for  以便支持 continue  之前 foreach  不支持 by blairwu 20180329
            //     for (var i = 0, len = data.length; i < len; i++) {
            //         if (temName == "searchRes" && data[i].Bitrate < 114) {
            //             data[i].addNoClass = 'noClick'
            //         }
            //         htmlList.push(tems[temName](data[i]));
            //     }
            // } else {
            //     htmlList.push(tems[temName](data));
            // }
            var el = document.createElement('div');
            if (attrs) {
                for (var key in attrs) {
                    el.setAttribute(key, attrs[key]);
                }
            }
            var htl = htmlList.join('');
            if (type == 2) {
                el = htl;
            } else {
                el.innerHTML = htl;
            }
            return el;
        };

        function createFragment(data, temName, attrs) {
            var htl = createTem(data, temName, attrs);
            return document.createDocumentFragment().appendChild(htl)
        }

        return {
            createHtml: createTem,
            createStrHtl: createStrHtl,
            createFragment: createFragment
        }
    })();
    /*************************************************执行初始化方法***********************************************************************************************/
    window.onload = function () { //查询客户端信息 ，由于ios无法与加载并行,所以onload;

        // initWxShare()
        if (KgMobileCall.isInClient()) {
            actions.queryInitData(actions.init.bind(actions));
        } else {
            actions.init();
            window.navigator.userAgent.toLocaleLowerCase().match(/micromessenger/gi) && actions.initWxShare({
                "linkUrl": window.location.href,
                "picUrl": 'https://webimg.kgimg.com/82b66f7f29c428722e4d1e630fad310c.jpg',
                "content": '糟糕，是心动的感觉！这首歌太好听了，忍不住分享给你，喜欢的话就点个赞吧^_^',
                "title": '你的小伙伴请你定义流行'
            })
            $('.go-app-layer').removeClass('visibility');
            $('.content').css('padding-bottom', '1.2rem');

        }
    };

    /*************************************************自写插件***********************************************************************************************/
    /**
     *  所有方法
     * @returns {{}}
     */
    function asks() {
        var toYear = new Date().getFullYear(), //今年
            scrollHeight = 0,
            isKugouApp = KgMobileCall.isInClient();
        return {

            /**
             * 显示信息
             * @param msg
             */
            waitAndMsg: function (msg) {
                var el = $('.loading-wrap'),
                    flag = el.hasClass('visibility');
                if (msg === undefined) {
                    flag && el.removeClass('visibility');
                } else if (msg === 0) {

                    setTimeout(function () {
                        flag || el.addClass('visibility');
                    }, 500);
                } else {
                    flag || el.addClass('visibility');
                    $('.pub-show-msg').hide();
                    var htl = template.createFragment({msg: msg}, 'mindWar', {});
                    $("body").append(htl)
                    setTimeout(function () {
                        'remove' in htl ? htl.remove() : htl.parentNode.removeChild(htl);
                    }, 2000);
                }
                return this;
            },
            praiseLayerUi: function () {
                var item = listData.choiceItem;
                // $('.praise-layer-content h3 span').text('为《' + item.songName + '》点赞')
                $('.praise-layer-img').css('background-image', 'url(' + item.coverImages + ')')
                $('.praise-layer-song-name').text(item.songName)
                $('.praise-layer-singer-name').text(item.singerName)
                if (listData.isYearVip) { //如果年费VIP，不增加开通标志
                    $('.praise-layer-vip-btn').hide()
                    $('.praise-layer-mark span').html('<font style="color:#ff00ff">年费豪华VIP专享</font>，今日剩余' + (item.spare_vote || 0) + '次');
                } else {
                    $('.praise-layer-mark span').text('(今日剩余' + (item.spare_vote || 0) + '次)')
                }

                if (listData.isYearVip && listData.choiceItem.spare_vote == 0) { //vip未有赞
                    $('.praise-layer-ok-btn').text('拉好友点赞')
                } else {
                    $('.praise-layer-ok-btn').text('立即点赞');
                }
                $('.praise-layer-give input').val(1)
                if (item.songName && item.songName != "") {
                    $('.praise-layer').removeClass('visibility');
                    actions.scrollPointThrough(1);
                }

            },
            exponentLayerUi: function (data) {
                $('.exponent-layer-content h3 ').html(data.songName + '<span>' + data.singerName + '</span>');
                $('.exponent-layer-content>ul span').forEach(function (item) {
                    var el = $(item),
                        name = el.attr('class').trim();
                    el.text(data[name])
                })
                $('.exponent-layer').removeClass('visibility');
                actions.scrollPointThrough(1)

            },
            /**
             *  初始化UI
             */
            initUi: function () {
                var _this = this,
                    el = $('.list-container'),
                    htl = template.createFragment(listData.now, 'index', {});
                $('.content').html(htl)
                listData.notes || $('.go-live-home-layer').addClass('not-notes') //如果note不存在，修正直播间的位置
                _this.nowUi().initEvent().lazyListImg();
                // document.getElementById(id).scrollIntoView(true)
                return this;
            },
            /**
             * 往期UI
             */
            oldUi: function (issue) {
                //console.log(issue)
                listData.issue = issue; //保存展示的荡气当期
                var _this = this,
                    htl = template.createFragment(listData[issue], 'oldList', {}),
                    year = issue.substr(0, 4),
                    info = utils.findObj(PeriodList[year], function (item) {
                        return item.issue == issue
                    }),
                    listoptionel = $('.list-options li').eq(1),
                    period = info.title.split('（')[0];
                $('.list-container').html(htl)
                $('.banner-info-periods-btn').removeClass('now');
                $('.banner-info-update-time span').text(info.startTime.substring(5, 11) + ' 更新')
                $('.banner-info-periods-btn span').text(period)
                if (!listoptionel.hasClass('list-option-choice')) {
                    $('.list-option-choice').removeClass('list-option-choice');
                    listoptionel.addClass('list-option-choice')
                }
                _this.oldEvent().lazyListImg();
            },
            /**
             * 之前UI
             */
            nowUi: function () {
                listData.issue = 'now'; //保存展示的荡气当期
                var _this = this,
                    listoptionel = $('.list-options li').eq(0),
                    nowData = listData.now,
                    period = nowData.issueTitle.split('（')[0],
                    htl = template.createFragment(nowData.chartsList, 'nowList', {});
                $('.list-container').html(htl)
                $('.banner-info-periods-btn').addClass('now');
                $('.banner-info-update-time span').text(nowData.updateTime.substring(5, 16).replace('.', '-') + ' 更新')
                $('.banner-info-periods-btn span').text(period)
                if (!listoptionel.hasClass('list-option-choice')) {
                    $('.list-option-choice').removeClass('list-option-choice');
                    listoptionel.addClass('list-option-choice')
                }
                _this.nowEvent().lazyListImg();
                return this;
            },
            selectUi: function () {
                var _this = this,
                    htl = template.createStrHtl(PeriodList, 'selectHtl', {});
                $('.banner-info-periods-btn select').remove();
                $('.banner-info-periods-btn ').append(htl);
                _this.selectEvent()

            },
            shareImgUi: function (src) {
                var _this = this;
                KgMobileCall.changeTitleColor({"color": '#686869', "alpha": 1})
                listData.choiceItem.base64 = src;
                $('.share-img-layer-content img').attr('src', src);
                $('.share-img-layer').removeClass('visibility');
                _this.scrollPointThrough(1)
                setTimeout(function () {
                    KgMobileCall.showHideBar({state: 0});
                }, 300)
            },
            /**
             * 查询现在
             * @param target
             */
            queryNowList: function (callback) {
                var _this = this,
                    data = {
                        limit: 100,
                        offset: 0,
                        platform: 'kugou',
                        format: 'jsonp'

                    }

                const dynamic =  window.dataCache.dynamic;
                if(dynamic) {
                    callback && callback()
                    return this
                }

                _this.waitAndMsg();
                source.get(tenUrlPath + '/unichartsapi/v1/songs/charts/dynamic', data, function (res) {
                    _this.waitAndMsg(0);
                    resCallback(res);
                });
                function resCallback(res) {
                    if (res.code == 0 || res.code == '010004') {
                        listData.now = res.data;
                        callback();
                        if (res.code == '010004') {
                            $('.content').addClass('live');
                            $('.go-live-home-layer').removeClass('visibility');
                            actions.scrollPointThrough(1)
                        }
                    } else {

                    }
                }
                return this;
            },
            /**
             * 查询公告
             * @param target
             */
            queryNote: function (callBack) {
                var _this = this,
                    data = {
                        platform: 'kugou'
                    }

                const notices =  window.dataCache.notices;
                if(notices) {
                    callBack && callBack()
                    return this
                }
                source.get(tenUrlPath + '/unichartsapi/v1/displays/notices', data, function (res) {
                    resCallback(res)
                });

                function resCallback(res) {
                    if (res.code == 0) {
                        listData.notes = res.data;
                    }
                    callBack()
                }
                return this;
            },
            /**
             * 查询banner
             * @param target
             */
            queryBanner: function (callback) {
                var _this = this,
                    data = {
                        platform: 'kugou'
                    }

                const banner =  window.dataCache.banner;
                if(banner) {
                    callback && callback()
                    return this
                }
                source.get(tenUrlPath + '/unichartsapi/v1/displays/banner', data, function (res) {
                // 测试接口
                // source.get('http://tmesit.tencent.com/unichartsapi/v1/displays/banner', data, function (res) {
                    resCallback(res)
                });

                function resCallback(res) {
                    if (res.code == 0 ||res.code == '010009') {
                        // 010009 无banner数据
                        res.data && (listData.banner = res.data);
                        callback && callback()
                    } else {
                        _this.waitAndMsg(res.msg)
                        callback && callback()
                    }
                }
                return this;
            },
            /**
             * 查询票数
             */
            queryPraise: function () {
                var _this = this,
                    item = listData.choiceItem,
                    data = {
                        appid: initInfo.appid,
                        uid: initInfo.kugouID,
                        token: initInfo.token,
                        format: 'jsonp'
                    };
                if (!initInfo.userName) return _this.praiseLayerUi();
                _this.waitAndMsg();
                source.jsonp(activityUrlPath + '/api/v1/uni/get_spare_vote', data, function (res) {
                    _this.waitAndMsg(0);
                    if (res.status == 1) {
                        item.spare_vote = res.data.spare_vote;
                        listData.isBindMobile = ~~res.data.bind_mobile;
                        listData.isYearVip = ~~res.data.y_type_vip;
                        _this.praiseLayerUi();
                    } else {
                        _this.waitAndMsg(res.error)
                    }
                });
                return this;
            },
            /**
             *
             * @param ids
             * @returns {idConversionHash}
             */
            idConversionHash: function (ids, el, funName, single) {

                var _this = this;

                var  data = {
                        album_audio_id: (KgMobileCall.isInClient() && single) ? single : ids,
                        mid: initInfo.mid || 'unirank',
                        appid: initInfo.appid,
                        uid: initInfo.kugouID,
                        token: initInfo.token,
                        format: 'jsonp'
                    },
                    doFun = function () {
                        _this[funName](ids, el, single)
                    };


                if (songHashData[data.album_audio_id]) return doFun();
                _this.waitAndMsg();
                /*
                source.jsonp(mkugouUrlPath + '/api/v1/song/album_audio_id_info', data, function (res) {
                    _this.waitAndMsg(0);
                    if (res.status == 1) {
                        songHashData[ids] = res.data.list;
                        doFun()

                    } else {
                        _this.waitAndMsg(res.error)
                    }
                });
                */


				$.ajax({
					type: 'GET',
					url: mkugouUrlPath + '/api/v1/song/album_audio_id_info',
					data: data,
					dataType: 'json',
					async:KgMobileCall.isInClient()?true:false,
					timeout: 5000,
					success: function (res) {
					    _this.waitAndMsg(0);
						if (res.status == 1) {
							songHashData[data.album_audio_id] = res.data.list;

							if (KgMobileCall.isInClient() || true) {


								for (var i = 0; i < res.data.list.length; i++) {

									if(res.data.list[i] == null){
										continue;
									}

									pSIdToHash[res.data.list[i].album_audio_id] = res.data.list[i].hash;

									$('.sid_' + res.data.list[i].album_audio_id).each(function () {
										var $this = $(this);
										if (!$this.hasClass('sh_' + res.data.list[i].hash)) {
											$this.addClass('sh_' + res.data.list[i].hash);
										}
									});

								}

							}

							doFun();

						} else {
							_this.waitAndMsg(res.error);
						}
					},
					error: function (xhr, type) {
						_this.waitAndMsg(0);
						_this.waitAndMsg('网络繁忙，请稍后再试');
					}
				});



                return this;
            },
            /**
             * 在端外播放歌曲
             */
            outClientPlaySong: function (ids) {
                var songList = songHashData[ids],
                    item = songList[0];
                outPlay.play(item.url)
            },
            /**
             *
             * @param ids
             * @param el
             */
            playSong: function (ids, el, single) {
                var _this = this,
                    songList = songHashData[(KgMobileCall.isInClient() && single) ? single : ids];
                /*
                dataInfo = songList.map(function (item) {
                    if (!item) return null;
                    return {
                        "filename": decodeURIComponent(item['fileName']),
                        "filesize": item['fileSize'],
                        "hash": item['hash'],
                        "bitrate": item['bitRate'],
                        "extname": item['extName'],
                        "duration": item['timeLength'] || '',
                        "mvhash": "",
                        "m4afilesize" : 0,
                        "320hash" : item['extra']['320hash'],
                        "320filesize" : item['extra']['320filesize'],
                        "sqhash" : item['extra']['sqhash'],
                        "sqfilesize" :item['extra']['sqfilesize'],
                        "feetype" : 0,
                        "isfirst" : 0,
                        "privilege" : item['privilege']
                    }
                }),
                data = {
                    "total":dataInfo.length,
                    "info": dataInfo
                };
                */
                var data = {
                    "total": 1,
                    "info": []
                };

                var start = false;

                for (var j = 0; j < songList.length; j++) {
                    if (songList[j]) {


                        if (single && (ids == songList[j].album_audio_id || start)) {


                            start = true;


                        } else if (single) {
                            continue;
                        }

                        var info = {
                            "filename": songList[j]['fileName'],
                            "filesize": songList[j]['fileSize'],
                            "hash": songList[j]['hash'],
                            "bitrate": songList[j]['bitRate'],
                            "extname": songList[j]['extName'],
                            "duration": songList[j]['timeLength'],
                            "mvhash": "",
                            "m4afilesize": 0,
                            "320hash": songList[j]['extra']['320hash'],
                            "320filesize": songList[j]['extra']['320filesize'],
                            "sqhash": songList[j]['extra']['sqhash'],
                            "sqfilesize": songList[j]['extra']['sqfilesize'],
                            "feetype": 0,
                            "isfirst": 0,
                            "privilege": songList[j]['privilege'],
							"mixId": songList[j]['album_audio_id']
                        };


                        if (KgMobileCall.isIOS && info.privilege == 10) {
                            info.privilege = 128;
                        }

                        data.info.push(info);

                    }
                }

                if (data.info.length === 0) {
                    _this.waitAndMsg('暂时无法播放');
                    return;
                }

                data.total = data.info.length;

                if (KgMobileCall.isInClient()) {
                    KgMobileCall.listen(data);
                } else {
                    if (data.info.length == 1 && songList[0].ctype == 1003) {
                        $('.play').removeClass('play');
                        _this.waitAndMsg('应版权方要求，此歌曲仅酷狗会员可试听，</br>请在酷狗客户端收听');
                        return;
                    }
                    $('.play').removeClass('play');
                    $(el).addClass('play');
                    _this.outClientPlaySong(ids)
                }
            },
            /**
             *
             * @param el
             */
            pauseSong: function (el) {
                if (KgMobileCall.isInClient()) {
                    KgMobileCall.playOrPause({type: 3})
                } else {
                    outPlay.pause()
                }
                $(el).removeClass('play')
            },
            /**
             *
             * @param mvId
             * @returns {*}
             */
            queryMvHash: function (mvId) {
                var item = songMVHashData[mvId],
                    _this = this,
                    data = {
                        cmd: 100,
                        id: mvId,
                        ismp3: 0,
                        format: 'jsonp'
                    };
                if (item) return _this.goMv(mvId);
                _this.waitAndMsg();
                source.jsonp(mkugouUrlPath + '/api/v1/mv/info', data, function (res) {
                    _this.waitAndMsg(0);
                    if (res.status == 1) {
                        songMVHashData[mvId] = res;
                        _this.goMv(mvId);
                    } else {
                        _this.waitAndMsg(res.error)
                    }
                });
            },
            /**
             *
             * @param mvId
             * @returns {goMv}
             */
            goMv: function (mvId) {
                var item = songMVHashData[mvId],
                    data = {
                        mvHash: item.hash,
                        // mvFilename: item.singer + ' - ' + item.songname,
                        mvImgUrl: item.mvicon.replace('{size}', 600)
                    }
                KgMobileCall.categoryPlayMV(data);
                return this;

            },
            /**
             *
             * @param options
             */
            initWxShare: function (options) {
                // for (let key in  depShareParams) {
                //     options[key] = getAspect(global, depShareParams[key])
                // }

                if (!options) return;

                var wxInitialize = function wxInitialize(data) {
                    if (data) {
                        wx.config({
                            beta: true,
                            debug: false, //调试时改为true
                            appId: data.appId,
                            timestamp: data.timestamp,
                            nonceStr: data.nonceStr,
                            signature: data.signature,
                            jsApiList: ["onMenuShareTimeline", //分享朋友圈
                                "onMenuShareAppMessage", //分享给朋友
                                "onMenuShareQQ", //分享到QQ
                                "onMenuShareWeibo", //分享到腾讯微博
                                "onMenuShareQZone", //分享到QQ空间
                                "launchApplication" // 跳转路径
                                // "getNetworkType" //获取手机网络状态
                            ]
                        });
                        // 微信分享参数传递
                        wx.ready(function () {
                            document.getElementById('audio').play();
                            // 获取手机网络状态 仅用于测试！
                            // wx.getNetworkType({
                            // 	success: function(res) {
                            // 		var networkType = res.networkType; // 返回网络类型2g，3g，4g，wifi
                            // 		alert("这是获取网络状态接口，接口已调通; 网络类型为:" + networkType);
                            // 	}
                            // });
                            // 分享到微信朋友
                            wx.onMenuShareAppMessage({
                                title: options.title,
                                desc: options.content,
                                link: options.linkUrl,
                                imgUrl: options.picUrl
                            });
                            // 分享到朋友圈
                            wx.onMenuShareTimeline({
                                title: options.title,
                                link: options.linkUrl,
                                imgUrl: options.picUrl
                            });
                            // 分享到QQ
                            wx.onMenuShareQQ({
                                title: options.title, // 分享标题
                                desc: options.content, // 分享描述
                                link: options.linkUrl, // 分享链接
                                imgUrl: options.picUrl // 分享图标
                            });
                            // 分享到腾讯微博
                            wx.onMenuShareWeibo({
                                title: options.title, // 分享标题
                                desc: options.content, // 分享描述
                                link: options.linkUrl, // 分享链接
                                imgUrl: options.picUrl // 分享图标
                            });
                            // 分享到QQ空间
                            wx.onMenuShareQZone({
                                title: options.title, // 分享标题
                                desc: options.content, // 分享描述
                                link: options.linkUrl, // 分享链接
                                imgUrl: options.picUrl // 分享图标
                            });
                        });
                    }
                };
                var shareToWx = function shareToWx() {
                    return source.jsonp('https://mwechats.kugou.com/jssdk/getSignature?caller=kugou_web', {"url": encodeURIComponent(location.href)}, function (obj) {
                        return wxInitialize(obj);
                    }, function (err) {
                        return console.log("获取签名失败，请重新获取");
                    });
                };
                var wxShare = function wxShare() {
                    // 如果是微信分享
                    if (window.wx) {
                        shareToWx();
                    } else {
                        var wxScript = document.createElement('script');
                        wxScript.src = 'https://res.wx.qq.com/open/js/jweixin-1.0.0.js';
                        wxScript.onload = function () {
                            if (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete') {
                                shareToWx();
                            } else {
                                //alert('加载失败');
                            }
                        };
                        document.body.appendChild(wxScript);
                    }
                };
                wxShare();
            },
            /**
             *
             * @returns {backApp}
             */
            backApp: function () {

                //var sid = utils.getQueryString('sid');

                if (nowPlay) {
                    var url = 'https://h5.kugou.com/apps/uni-list/index.html?sid=' + nowPlay;
                } else {
                    var url = 'https://h5.kugou.com/apps/uni-list/index.html';
                }

                launchKugou({
                    cmd: 303,
                    jsonStr: {
                        url: url,
                        title: '由你音乐榜'
                    }
                }, function (res) {
                });
                return this;
            },

            /**
             * 点赞
             */
            givePraise: function () {
                if (!initInfo.userName) return KgMobileCall.callSoftUserLogin({'topicName': '', 'loginType': ''});
                if (listData.isBindMobile != 1) return $('.bind-phone-layer').removeClass('visibility');
                var _this = this,
                    count = $('.praise-layer-give input').val(),
                    data = {
                        appid: initInfo.appid,
                        uid: initInfo.kugouID,
                        token: initInfo.token,
                        songid: listData.choiceItem.songId,
                        count: count,
                        format: 'jsonp'
                    };


                if (~~listData.choiceItem.spare_vote == 0) {
                    _this.praiseLayerUi()
                    if (listData.isYearVip) {
                        actions.sendMobileBILogStat(107);
                        $('.invite-layer-header-img').attr('src', listData.choiceItem.coverImages);
                        $('.invite-layer').removeClass('visibility');
                    } else {
                        $('.vip-layer').removeClass('visibility');
                    }

                    return;
                }

                if (count < 1) return actions.waitAndMsg('点赞次数必须为正整数');

                _this.waitAndMsg();
                source.jsonp(activityUrlPath + '/api/v1/uni/vote', data, function (res) {
                    _this.waitAndMsg(0);
                    if (res.status == 1) {
                        listData.choiceItem.spare_vote = res.data.spare_num;
                        _this.praiseLayerUi()
                        if (listData.choiceItem.spare_vote == 0) {
                            if (listData.isYearVip) {
                                actions.sendMobileBILogStat(107);
                                $('.invite-layer-header-img').attr('src', listData.choiceItem.coverImages)
                                $('.invite-layer').removeClass('visibility')
                            } else {
                                $('.vip-layer').removeClass('visibility');
                            }

                        } else if (res.data.first_vote == 1) {
                            actions.sendMobileBILogStat(107);
                            $('.invite-layer-header-img').attr('src', listData.choiceItem.coverImages)
                            $('.invite-layer').removeClass('visibility')
                        }
                        else _this.waitAndMsg('今日剩余点赞数为' + listData.choiceItem.spare_vote + '次')
                    } else {
                        _this.waitAndMsg(res.error)
                    }
                });
                return this;
            },


            /**
             *  查询历史list
             * @returns {queryOldList}
             */
            queryOldList: function (issue) {

                var _this = this,
                    data = {
                        limit: 100,
                        offset: 0,
                        platform: 'kugou'
                    };
                issue = issue || PeriodList[toYear][1].issue
                if (listData[issue]) return _this.oldUi(issue);
                _this.waitAndMsg();
                source.get(tenUrlPath + '/unichartsapi/v1/songs/charts/history/' + issue, data, function (res) {
                    _this.waitAndMsg(0)
                    if (res.code == 0) {
                        listData[issue] = res.data;
                        _this.oldUi(issue);
                    } else {
                        _this.waitAndMsg(res.msg)
                    }
                });
                return this;
            },
            /**
             * 查询期数
             * @param year
             * @returns {queryPeriods}
             */
            queryPeriods: function (year, callback) {
                year = year || toYear;
                if (PeriodList[year]) return callback && callback(PeriodList[year]); //如果期数存在，则不查询
                var _this = this,
                    data = {
                        sort: 'DESC'
                    }
                source.get(tenUrlPath + '/unichartsapi/v1/songs/charts/' + year, data, function (res) {
                    if (res.code == 0) {
                        if (res.data && res.data.length > 1) {
                            PeriodList[year] = res.data;
                            res.data && res.data.map(function (item, i) {
                                if (i == 0 && year == toYear) {
                                    item.id = 'now';
                                } else {
                                    item.id = item.issue;
                                }
                                item.value = item.title;
                            })
                            console.log(res.data)
                            callback && callback(res.data);
                            // _this.selectUi();
                        } else {
                            $('.list-options').addClass("no-periodList");
                            //
                            //(year == firstYear) && $('.list-options').addClass("no-periodList");;
                        }
                    } else {
                        $('.list-options').addClass("no-periodList");
                        //this.waitAndMsg(res.msg)
                    }
                });
                return this;
            },
            /**
             *
             */
            shareImg: function () {
                var base64 = listData.choiceItem.base64,
                    shareType = 3;
                if (KgMobileCall.isIOS) {
                    if (initInfo.version >= 8990) {
                        shareType = 4
                    }
                } else {
                    if (initInfo.version >= 8983) {
                        shareType = 4
                    }
                }
                KgMobileCall.share({
                    "shareName": "酷狗音乐",
                    "topicName": "酷狗音乐",
                    "hash": "",
                    "listID": "",
                    "type": shareType, //专题type=3
                    "suid": "",
                    "slid": "",
                    "imgUrl": "",
                    "filename": "",
                    "duration": "",
                    "shareData": {
                        "linkUrl": window.location.href,
                        "picUrl": base64,
                        "imageData": base64,
                        "content": '糟糕，是心动的感觉！这首歌太好听了，忍不住分享给你，喜欢的话就点个赞吧^_^',
                        "title": initInfo.nickName ? initInfo.nickName + '请你定义流行' : '你的小伙伴请你定义流行'
                    }
                });
            },
            /**
             *
             * @param flag 0,弹层 1  取消弹层
             */
            scrollPointThrough: function (flag) {
                var winEl = $(window), contentEl = $('.content');
                if (flag) {
                    scrollHeight = winEl.scrollTop();
                    var contentStyle = 'position: fixed;width: 100%;top: -' + scrollHeight + 'px;pointer-events: none;';
                    contentEl.attr('style', contentStyle);
                } else {
                    contentEl.attr('style', '');
                    if (!scrollHeight) return;
                    winEl.scrollTop(scrollHeight);
                    scrollHeight = 0;
                }
                return this;
            },
            /**
             *
             * @returns {lazyListImg}
             */
            lazyListImg: function () {
                var scrollTop = $(window).scrollTop();
                $('.list-data-item').forEach(function (item) {
                    var el = $(item),
                        top = el.offset().top,
                        topnums = top - scrollTop,
                        inClientView = topnums ? clientHeight > topnums : 0,
                        imgEl = el.find('.list-data-item-img'),
                        isImg = imgEl.attr('is-img'),
                        imgUrl = imgEl.attr('data-img');
                    if (!isImg && inClientView) {
                        imgEl.css('background-image', 'url(' + imgUrl + ')').attr('is-img', '1');
                    }
                })
                return this;
            },
            /**
             *
             * @returns {*|void}
             */
            showShareImg: function () {

                $('#qrcode').html('');
                var qrcode = new QRCode(document.getElementById("qrcode"), {
                    text: "https://h5.kugou.com/apps/uni-list/index.html?sid=" + listData.choiceItem.songId,
                    width: 80,
                    height: 80,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });


                var _this = this,
                    item = listData.choiceItem,
                    songId = item.platformSongId,
                    txSongId = item.songId,
                    srcCache = songCoverBase64[songId],
                    text3List = ['你的分享将助力歌曲排名上升，让我们一起来帮助爱豆实现音乐梦想吧！', '亲爱的小伙伴，快来支持我的爱豆吧！', '老铁，打榜应援了解一下？', '你出力，我出力，爱豆登顶不是奇迹！', '糟糕，是心动的感觉！', '这首歌用音波击中了我的心！小伙伴你要不要考虑听一下？感受心动，就现在！'],
                    indexI = Math.floor(Math.random() * text3List.length),
                    data = {songid: txSongId, format: 'jsonp'},
                    text3 = text3List[indexI],
                    op = {
                        //海报图 不需要预加载
                        postImgSrc: '',
                        //海报图 需要预加载或者直接base64
                        QRImgSrc: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARgAAAEYCAIAAAAI7H7bAAAHY0lEQVR4nO3dQW7kMBJFQXsw979yzwHMBYd6FFmFiGXDJdHV+iCQTiV///379wM885/TC4BvIEgQECQICBIEBAkC//37T7+/v++vY2iyovh3wcMPTv7YpOVvafmXyv1dyfCm7YKXv/PLH0s7EgQECQKCBAFBgoAgQUCQIDAofw/t7m2dLG5O1mfvKZX+9aTE3Fai22/pSPfzJY/ljx0JEoIEAUGCgCBBQJAgMFu1++tJzWd3sWWyaTW/xYzhMpbrbMNlLHejTq7tSU9w2zo8c/15T1ZiR4KAIEFAkCAgSBAQJAgIEgTWy98fpy0Kt0Xb3Wt7stq2ofbI1/sCOxIEBAkCggQBQYKAIEHgG6p2u18sf/KC9+5hsU9c8kL+xxXohuxIEBAkCAgSBAQJAoIEAUGCwHr5+56q5fKk1bbE3E4y2H1u1/CzlxTEnzj1WNqRICBIEBAkCAgSBAQJArNVu6+s57Svc3/Bj026Z233PJZ2JAgIEgQECQKCBAFBgoAgQeD3nt7TZW1/Zzs+4UhD7ZHa8Rc8SE/YkSAgSBAQJAgIEgQECQLrr5rf02vY3rQ9DmjZPcW95eu/8L98yZDdHzsSJAQJAoIEAUGCgCBBQJAgEM9seGE+6PJNdy9jaPcJYm2V/EiJeeiSsRPz7EgQECQICBIEBAkCggSBQdXuSJXmSfWpPednuZb1pHf2SBlz+aZHzpUaap/VJ9+bHQkCggQBQYKAIEFAkCAgSBCYnbR6pNq7u6L6wrCHI128y24+Gqztu82/cDsSBAQJAoIEAUGCgCBBYFC1u+fI9XZtR85HCpcxf7W2SLW75PUdxzTZkSAgSBAQJAgIEgQECQKCBIH1g8buKeMeaahdLs3fM4z2s6aZtqMd8ifEjgQBQYKAIEFAkCAgSBBYr9q15bh7Rma2V7vkcKGhtuR1pLe1LbE6HwkOEyQICBIEBAkCggQBQYLAbPl7uaL6cbXjSctNq+34hMlbvNC0emT4x/IXklfw7UgQECQICBIEBAkCggSB9Umr7cvh87dYdsna2sOF7nnhf9k903OfsCNBQJAgIEgQECQICBIEBAkCg6bVI1MWbi6m7z74Ptf2ti5f/wW7/x4wZNIq7CJIEBAkCAgSBAQJArNNq5dUro4cc//kPe1l95wEdc/Y2uWrTXqSBTsSBAQJAoIEAUGCgCBBQJAgEM9sGNygPtFp8hbXavtuXyjNt3MRllfywl8+njz5diQICBIEBAkCggQBQYLAoGr36HKbyyMvnLb0ce2Sf10yG/WFk6CWmbQKNxIkCAgSBAQJAoIEAUGCwGDS6hFtg+PkLZ4MFm0L1pMfbOvaLwyZWL7p7pEY+f+pHQkCggQBQYKAIEFAkCAwW7Xb3af4whvpT1ay+/rtbzp5td09wcvLyG+6u4v3x44ECUGCgCBBQJAgIEgQECQIrE9aHToye+BIK+dnzbpYXsbwai908V4yPXf+m7QjQUCQICBIEBAkCAgSBLZX7WbXcaJp9Z5Tg2Y+OPzsC6NnJ68WXn94ixdqgE+eNzsSBAQJAoIEAUGCgCBBQJAgMDuzYffkyxfGM+xugW3ntrbaKvnkr3Ckw7gdFGHSKrxKkCAgSBAQJAgIEgTi85E+rpQXeuH99ksKj0deF9/9bv/DW9iRICBIEBAkCAgSBAQJAoIEgUH5+1Tb37LJam87MXRZe67Wk7VdMs30hbmtkx980lBrR4KAIEFAkCAgSBAQJAgMJq2Of261nfHmytiRs5uGXujIDG96pM42uZJTjc52JAgIEgQECQKCBAFBgoAgQSAuf0/6rJsemQI76ciY0iM1/cmVtH+EMGkVXiVIEBAkCAgSBAQJAoNXzY+8gXxJgW742SNFqifVp93v3k9qD2Wa/BUmPfl6h+xIEBAkCAgSBAQJAoIEAUGCwGzT6voNLj67qpVXVCdvMaOdTjF05EHaPWDDpFV4lSBBQJAgIEgQECQIDKp2L/Qa7i7ltS9gD7XDYo+Mdw2XMfzsF5RYVe3gVYIEAUGCgCBBQJAgIEgQ2N602mqPuHqh0D+pHXr6lceWtVfLz0qzI0FAkCAgSBAQJAgIEgRumbQ6dM8czfdN1ova1uEjzb5Prn9PzdmOBAFBgoAgQUCQICBIEBAkCAzK30OXDGRtnTpKfvnHds+TaMdODK+2e57E0O5ZFz92JEgIEgQECQKCBAFBgsBs1e6vFwaLTn5w+Sj5Fw4vOjIb9Ujhsf0yj5wr9eQJsSNBQJAgIEgQECQICBIEBAkC6+Xvm7UDDyZv8aSr8sixZZN29xO/MCjiBXYkCAgSBAQJAoIEAUGCwIdV7e7pqly+/sdVFP96oc62uxE5fxjsSBAQJAgIEgQECQKCBAFBgsBv++L++jpOnBH/5Grh9V/w5Fc4coLYpHu+czsSBAQJAoIEAUGCgCBBYLZp9Z53epftHt45WSp84QyidrDo7gm1Q7sLtu2P/diRICFIEBAkCAgSBAQJAoIEgUHTKvD/siNBQJAgIEgQECQICBIEBAkC/wO7IaxUQfAl0gAAAABJRU5ErkJggg==",
                        singerName: item.singerName,
                        songName: '/《' + item.songName + '》',
                        text1: '排名NO.' + item.rank,
                        text2: '由你音乐榜指数' + item.uniIndex + (~item.diffUniIndex ? '，距离上一名相差' + Number(item.diffUniIndex).toFixed(2) + '分' : ''),
                        text3: text3,
                        text4: '酷狗音乐',
                        text5: initInfo.nickName
                    }

                if (srcCache) return _this.shareImgUi(srcCache);
                //外部传入参数
                _this.waitAndMsg();
                source.jsonp(activityUrlPath + '/api/v1/uni/get_poster', data, function (res) {
                    if (res.status == 1) {
                        op.postImgSrc = res.data.cover;
                        canvasTobase64(op, function (base64) {
                            _this.waitAndMsg(0);
                            songCoverBase64[songId] = base64;
                            return _this.shareImgUi(base64);
                        })
                    } else {
                        _this.waitAndMsg(res.error)
                    }
                })

            },
            queryInitData: function (callBack) {
                KgMobileCall.getUserInfo(function (res1) {
                    utils.copyJson(initInfo, res1);
                    KgMobileCall.getMobileInfo(function (res2) {
                        utils.copyJson(initInfo, res2);
                        KgMobileCall.getVersion(function (res3) {
                            utils.copyJson(initInfo, res3);
                            callBack();


                        })
                    })
                });
            },
            /**
             *
             * @returns {init}
             */
            init: function () {
                var _this = this;
                KgMobileCall.changeTitleColor({"color": '#ff00ff', "alpha": 1});
                setTimeout(function () {
                    //测试暂时注释
                    KgMobileCall.showRightMenus({list: [{type: 6, title: '分享', callbackName: 'rightShare()'}]});
                }, 50)
                setTimeout(function () {
                    KgMobileCall.savePreReturnPage({type: 1});
                }, 100)
                setTimeout(function () {
                    KgMobileCall.showHideBar({state: 1});
                }, 500)

                var i = 0; //同时访问标志
                var callBack = function () {
                    i++;
                    if (i == 3) {
                        _this.initUi().queryPeriods();
                    }
                }
                goHash('') //刷新回到根路径，防止刷新引起的路径错乱
                this.queryNowList(callBack).queryBanner(callBack).queryNote(callBack);
                actions.sendMobileBILogStat(109);
                return this;
            },
            oldEvent: function () {
                //打开点赞通道
                $('.on-list-info-static-btn,.list-data-item-btn').click(function (e) {
                    e.stopPropagation();
                    if (!isKugouApp) return actions.backApp();
                    listData.choiceItem = JSON.parse(decodeURIComponent($(this).parents('.list-data-item').attr('data-item')));
                    // actions.exponentLayerUi(listData.choiceItem );
                    goHash(routers.exponent);
                    checkLogCount({b: '曝光'});
                });
                //开始播放
                $('.list-data-item').click(function (e) {
                    e.stopPropagation();

                    var el = $(this),
                        flag = el.hasClass('play'),
                        item = JSON.parse(decodeURIComponent(el.attr('data-item')));
                    var issue = listData.issue,
                        shwoData = issue == 'now' ? listData[issue].chartsList : listData[issue], //当前展示的期数
                        ids = shwoData.map(function (item) {
                            return item.platformSongId
                        }).join(',');

                    if (flag) {
                        nowPlay = false;
                        actions.pauseSong(this);
                    } else {
                        nowPlay = item.songId;
                        actions.idConversionHash(item.platformSongId, this, 'playSong', ids);
                    }

                    //flag ? actions.pauseSong(this) : actions.idConversionHash(item.platformSongId, this, 'playSong',ids);
                });
                //去mv
                $('.has-mv').click(function (e) {
                    e.stopPropagation();
                    if (!isKugouApp) return actions.backApp();
                    var el = $(this),
                        item = JSON.parse(decodeURIComponent($(this).parents('.list-data-item').attr('data-item')));
                    actions.queryMvHash(item.mvId);
                    actions.sendMobileBILogStat(100);
                });


                return this;
            },
            nowEvent: function () {
                //打开点赞通道
                $('.list-data-item-btn').click(function (e) {
                    e.stopPropagation();
                    if ($('.content').hasClass('live')) {
                        return
                    }
                    // if (!isKugouApp) return actions.backApp();
                    listData.choiceItem = JSON.parse(decodeURIComponent($(this).parents('.list-data-item').attr('data-item')));
                    goHash(routers.praise)
                    actions.sendMobileBILogStat(101);
                    checkLogCount({b: '曝光'});
                    // actions.queryPraise(listData.choiceItem)
                });
                //开始暂停播放
                $('.list-data-item').click(function (e) {

                    e.stopPropagation();

                    var el = $(this),
                        flag = el.hasClass('play'),
                        item = JSON.parse(decodeURIComponent(el.attr('data-item')));
                    var issue = listData.issue,
                        shwoData = issue == 'now' ? listData[issue].chartsList : listData[issue], //当前展示的期数
                        ids = shwoData.map(function (item) {
                            return item.platformSongId
                        }).join(',');


                    if (flag) {
                        nowPlay = false;
                        actions.pauseSong(this);
                    } else {
                        nowPlay = item.songId;
                        actions.idConversionHash(item.platformSongId, this, 'playSong', ids);
                    }
                    //flag ? actions.pauseSong(this) : actions.idConversionHash(item.platformSongId, this, 'playSong',ids);
                });
                //去mv
                $('.has-mv').click(function (e) {
                    e.stopPropagation();
                    if (!isKugouApp) return actions.backApp();
                    var el = $(this),
                        item = JSON.parse(decodeURIComponent($(this).parents('.list-data-item').attr('data-item')));
                    actions.queryMvHash(item.mvId);
                    actions.sendMobileBILogStat(100);
                });


                var sid = utils.getQueryString('sid'),
                    psid =   utils.getQueryString('platformSongId');

                if (sid) {
                    if ($('#now_' + sid).length > 0) {
                        if (sidToView) {
                            sidToView = false;
                            $('#now_' + sid)[0].scrollIntoView();
                            if (!KgMobileCall.isInClient()) {
                                $('#now_' + sid + ' .list-data-item').click();
                            }
                        }
                    }
                }else if(psid) {
                    if ($('.sid_' + psid).length > 0) {
                        if (sidToView) {
                            sidToView = false;
                            $('.sid_' + psid)[0].scrollIntoView();
                        }
                    }

                }

                return this;
            },
            /**
             * 点赞弹层
             */
            // selectEvent: function () {
            //     /**进度*/
            //     var areaData1= (function () {
            //         var lastYear  = 2018;
            //         var nowYear =  new Date().getFullYear();
            //         var data = [];
            //         for(var i  =nowYear;i>=lastYear;i--){
            //             data.push({id:i,value:i})
            //         }
            //         return data;
            //     })()
            //     var areaData2= function(){
            //         actions.queryPeriods(year,callback);
            //     };
            //     $('.banner-info-periods-btn').bind('click', function () {
            //         var iosSelect = new IosSelect(2,
            //             [areaData1, areaData2],
            //             {
            //                 title: '期数选择',
            //                 itemHeight: 35,
            //                 relation: [1, 1, 0, 0],
            //                 oneLevelId: '',
            //                 twoLevelId: '',
            //                 showLoading:true,
            //                 callback: function (selectOneObj, selectTwoObj) {
            //                     var issue = selectTwoObj.issue;
            //                     if (issue == 'now') {
            //                         actions.nowUi();
            //                     } else {
            //                         actions.queryOldList(issue)
            //                     }
            //                 }
            //             });
            //     });
            // },
            // 初始化绑定事件
            initEvent: function () {
                //打开公告
                $('.affiche').click(function (e) {
                    e.stopPropagation();
                    $(this).toggleClass('open')
                })
                //打开规则
                $('.banner').click(function (e) {
                    e.stopPropagation();
                    // KgMobileCall.changeTitleColor({"color": '#c706c7', "alpha": 1});
                    // $('.rule-layer').removeClass('visibility');
                    // actions.scrollPointThrough(1)
                    goHash(routers.rule)

                })

                //去官方
                $('.go-tofficial-website-btn').click(function (e) {
                    e.stopPropagation();
                    actions.sendMobileBILogStat(103);
                    if (KgMobileCall.isInClient()) {
                        KgMobileCall.openURL({
                            "browser": "0",
                            "url": "https://yobang.tencentmusic.com/index.html",
                            "isHideTitleBar": "0",
                            "isShowArrow": "1"
                        });
                    } else {
                        window.location.href = 'https://yobang.tencentmusic.com/index.html';
                    }
                })
                //关闭规则
                $('.rule-close-btn').click(function () {
                    // KgMobileCall.changeTitleColor({"color": '#ff00ff', "alpha": 1});
                    // $('.rule-layer').addClass('visibility');
                    // actions.scrollPointThrough(0)
                    history.go(-1)
                })
                //切换榜档
                $('.list-options li').click(function (e) {
                    e.stopPropagation();
                    var el = $(this),
                        periodsEl = $('.banner-info-periods-btn'),
                        issue = '',
                        selectEl = $('.banner-info-periods-btn select'),
                        index = el.index();//为0时实时，为1时旧的
                    selectEl.find("option[selected='true']").attr("selected", '');
                    if (!el.hasClass('list-option-choice')) {
                        if (index) {
                            issue = PeriodList[toYear][1].issue;
                            periodsEl.attr('data-periods-id', issue);
                            periodsEl.attr('data-year-id', toYear);
                            actions.queryOldList();
                            // var item = 'option[value="' + PeriodList[toYear][0].issue + '"]';
                            // selectEl.find(item).attr("selected", "selected");
                        } else {
                            periodsEl.attr('data-periods-id', 'now');
                            periodsEl.attr('data-year-id', toYear);
                            actions.nowUi()
                            // selectEl.find("option[value='now']").attr("selected", "selected");
                        }
                    }
                })

                //关闭点赞层
                $('.praise-layer-close').click(function (e) {
                    e.stopPropagation();
                    // $('.praise-layer').addClass('visibility')
                    // actions.scrollPointThrough(0)
                    history.go(-1)
                })

                //加票
                $('.praise-add-btn').click(function (e) {
                    e.stopPropagation();
                    if (!initInfo.userName) return KgMobileCall.callSoftUserLogin({'topicName': '', 'loginType': ''});
                    var el = $('.praise-layer-give input'),
                        spare_vote = ~~listData.choiceItem.spare_vote,
                        num = ~~el.val();
                    if (spare_vote == 0) {
                        actions.waitAndMsg('次数用完了')
                    } else if (num < spare_vote) {
                        el.val(++num)
                        $('.praise-layer-ok-btn').text('立即点赞')
                    } else {
                        actions.waitAndMsg('今日剩余点赞数' + spare_vote + '次')
                        el.val(spare_vote)
                    }
                })
                // 减票
                $('.praise-count-btn').click(function (e) {
                    e.stopPropagation();
                    if (!initInfo.userName) return KgMobileCall.callSoftUserLogin({'topicName': '', 'loginType': ''});
                    var el = $('.praise-layer-give input'),
                        spare_vote = ~~listData.choiceItem.spare_vote,
                        num = ~~el.val();
                    if (spare_vote == 0) {
                        actions.waitAndMsg('次数用完了')
                    } else if (num > 1) {
                        el.val(--num)
                        $('.praise-layer-ok-btn').text('立即点赞')
                    } else {
                        actions.waitAndMsg('已经最小赞数')
                        el.val(1)
                    }
                })
                //输入
                $('.praise-layer-give input').bind('input', function () {
                    var el = $(this),
                        btnEl = $('.praise-layer-ok-btn'),
                        spare_vote = ~~listData.choiceItem.spare_vote,
                        num = ~~el.val();
                    btnEl.text('点赞X' + num)
                    if (spare_vote == 0) {
                        actions.waitAndMsg('次数用完了')
                        el.val(1)
                        btnEl.text('点赞X' + 1)
                    } else if (num < 1) {
                        actions.waitAndMsg('最小点赞不能小于1')
                        el.val(1)
                        btnEl.text('点赞X' + 1)
                    } else {
                        actions.waitAndMsg('最大点赞为' + spare_vote)
                        el.val(spare_vote)
                        btnEl.text('点赞X' + spare_vote)
                    }
                })

                //点赞
                $('.praise-layer-ok-btn').click(function (e) {
                    e.stopPropagation();
                    if (!isKugouApp) return actions.backApp();
                    if (listData.isYearVip == 1 && listData.choiceItem.spare_vote == 0) {
                        goHash(routers.shareImg)
                        actions.sendMobileBILogStat(108)
                    } else {
                        actions.givePraise()
                        actions.sendMobileBILogStat(102)
                    }
                })

                //关闭绑定手机号
                $('.bind-phone-layer .layer-close-btn').click(function (e) {
                    e.stopPropagation()
                    $('.bind-phone-layer').addClass('visibility');
                    actions.scrollPointThrough(0)
                });

                //去绑定手机号
                $('.bind-phone-btn').click(function (e) {
                    e.stopPropagation()
                    KgMobileCall.pageJumpToUserCountSetPage({'type': 1});
                    setTimeout(function () {
                        $('.bind-phone-layer').addClass('visibility');
                        history.go(-1)
                    }, 0)

                });
                //点击蒙层关闭
                $('.mask').click(function (e) {
                    e.stopPropagation();
                    // var  currentUrl = window.location.hash.slice(1) || '/',
                    var isRouter = false;
                    for (var key in routers) {
                        if (routers[key] == currentUrl && currentUrl != '/') {
                            isRouter = true;
                        }
                    }
                    if (isRouter && $('.mask:not(.visibility)').length == 1) {
                        history.go(-1);
                    } else {
                        $(this).addClass('visibility');
                        actions.scrollPointThrough(0)
                    }


                });

                $('.invite-layer .layer-close-btn').click(function (e) {
                    e.stopPropagation();
                    var isRouter = false;
                    for (var key in routers) {
                        if (routers[key] == currentUrl && currentUrl != '/') {
                            isRouter = true;
                        }
                    }
                    if (isRouter && $('.mask:not(.visibility)').length == 1) {
                        history.go(-1);
                    } else {
                        $(this).parent().parent().addClass('visibility');
                        actions.scrollPointThrough(0)
                    }
                });


                $('.vip-layer .layer-close-btn').click(function (e) {
                    e.stopPropagation();
                    $(this).parent().parent().addClass('visibility');
                });


                //去会员中心
                $('.vip-friend-btn').click(function (e) {
                    e.stopPropagation();
                    actions.sendMobileBILogStat(104);
                    setTimeout(function () {
                        //KgMobileCall.openTab({tab: '30'})
                        var url = 'http://m.kugou.com/vip/v2/vip.html?source_id=2087';
                        if (KgMobileCall.isIOS) {
                            url = 'http://m.kugou.com/vip/ios/vip.html?source_id=2087';
                        }
                        checkLogCount({b: '点击', button_id: 4000});
                        KgMobileCall.openURL({browser: 4, url: url, isLoading: 1});

                    }, 0);
                    $(this).parent().parent().addClass('visibility');
                })

                //蒙层主题不关闭
                $('.mask>div,.banner-info-periods-btn').click(function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                })
                //打开分享图片
                $('.praise-layer-share').click(function (e) {
                    e.stopPropagation();
                    actions.sendMobileBILogStat(106);
                    if (!initInfo.userName) return KgMobileCall.callSoftUserLogin({'topicName': '', 'loginType': ''});
                    goHash(routers.shareImg)

                })

                //首次
                $('.invite-friend-btn').click(function (e) {
                    e.stopPropagation();
                    actions.sendMobileBILogStat(108);
                    $('.invite-layer').addClass('visibility');
                    goHash(routers.shareImg)
                })


                //分享图片按钮
                $('.share-img-btn').click(function (e) {
                    e.stopPropagation();
                    actions.sendMobileBILogStat(106)
                    setTimeout(function () {
                        actions.shareImg()
                    }, 50);
                })
                //去会员中心
                $('.praise-layer-vip-btn a').click(function (e) {
                    e.stopPropagation();
                    //history.go(-1);
                    //actions.sendMobileBILogStat(104)
                    // $('.praise-layer').addClass('visibility')
                    // actions.scrollPointThrough(0)

                    setTimeout(function () {
                        //KgMobileCall.openTab({tab: '30'})
                        var url = 'http://m.kugou.com/vip/v2/vip.html?source_id=2087';
                        if (KgMobileCall.isIOS) {
                            url = 'http://m.kugou.com/vip/ios/vip.html?source_id=2087';
                        }
                        checkLogCount({b: '点击', button_id: 4000});
                        actions.sendMobileBILogStat(104);
                        KgMobileCall.openURL({browser: 4, url: url, isLoading: 1});
                    }, 0)

                })

                //播放全部
                $('.banner-info-go-off-btn').click(function (e) {
                    e.stopPropagation();

                    if (!isKugouApp) return actions.backApp();

                    var el = $(this),
                        issue = listData.issue,
                        shwoData = issue == 'now' ? listData[issue].chartsList : listData[issue], //当前展示的期数
                        ids = shwoData.map(function (item) {
                            return item.platformSongId
                        }).join(','),
                        flag = el.hasClass('play');
                    //console.log(ids);

                    actions.idConversionHash(ids, this, 'playSong', false);

                    var $node = $('<div class="note" ></div>');
                    $('.banner').append($node);
                    setTimeout(function () {
                        $node.remove();
                    }, 2000);

                })

                //关闭直播层
                $('.go-live-home-layer-close').click(function (e) {
                    e.stopPropagation();
                    $('.go-live-home-layer').addClass('visibility');
                    actions.scrollPointThrough(0)
                })
                //去直播间
                $('.go-live-home-btn').click(function (e) {
                    e.stopPropagation();
                    if (!isKugouApp) return actions.backApp();
                    KgMobileCall.jumpToKFInnerPage({"pageType": 1002, "subPageId": 0, "params": {"roomId": 2718254}});
                })

                $('.now-data-banner').click(function (e) {
                    e.stopPropagation();
                    var bannerData = listData.banner,
                        jumpType = ~~bannerData.jumpType,
                      platformSrcId = bannerData.platformSrcId;
                    switch (jumpType){ // 1链接 2音频 3视频 4直播
                        case 1:
                            var jumpUrl = bannerData.jumpUrl;
                            KgMobileCall.showRightMenus({list: []});

                            // if (KgMobileCall.isInClient()) {
                            //     KgMobileCall.openURL({
                            //         "browser": "0",
                            //         "url": jumpUrl,
                            //         "isHideTitleBar": "0",
                            //         "isShowArrow": "1"
                            //     });
                            // } else {
                            setTimeout(function () {
                                window.location.href = jumpUrl;
                            },200)
                            // }
                            break;
                        case 2:
                              var  el = $(this),
                                flag = el.hasClass('play');
                            if (flag) {
                                nowPlay = false;
                                actions.pauseSong(this);
                            } else {
                                nowPlay = platformSrcId;
                                el.addClass('play');
                                actions.idConversionHash(platformSrcId, this, 'playSong');
                            }
                            break;
                        case 3:
                            if (!isKugouApp) return actions.backApp();
                            actions.queryMvHash(platformSrcId);
                            break;
                        case 4:
                            if (!isKugouApp) return actions.backApp();
                            KgMobileCall.jumpToKFInnerPage({"pageType": 1002, "subPageId": 0, "params": {"roomId": 2718254}});
                            break;
                    }
                })
                //端外跳回APP
                $('.go-app-layer').click(function (e) {
                    e.stopPropagation();
                    if (!isKugouApp) return actions.backApp();
                })

                /**进度*/
                var areaData1 = (function () {
                    var lastYear = 2018;
                    var nowYear = new Date().getFullYear();
                    var data = [];
                    for (var i = nowYear; i >= lastYear; i--) {
                        data.push({id: i, value: i})
                    }
                    return data;
                })()
                var areaData2 = function (year, callback) {
                    actions.queryPeriods(year, callback);
                };
                $('.banner-info-periods-btn').bind('click', function () {
                    var el = $(this),
                        flag = $(this).hasClass('now'),
                        oneLevelId = el.attr('data-year-id'),
                        twoLevelId = el.attr('data-periods-id');
                    if (flag) return;
                    var iosSelect = new IosSelect(2,
                        [areaData1, areaData2],
                        {
                            title: '期数选择',
                            itemHeight: 35,
                            relation: [1, 1, 0, 0],
                            oneLevelId: oneLevelId,
                            twoLevelId: twoLevelId,
                            showLoading: true,
                            callback: function (selectOneObj, selectTwoObj) {
                                var issue = selectTwoObj.issue;
                                el.attr('data-year-id', selectOneObj.id)
                                el.attr('data-periods-id', selectTwoObj.id)
                                //console.log(selectTwoObj)
                                if (selectTwoObj.id == 'now') {
                                    actions.nowUi();
                                } else {
                                    actions.queryOldList(issue)
                                }
                            }
                        });
                });


                if (KgMobileCall.isInClient()) {

                    var ga = document.createElement('script');
                    ga.type = 'text/javascript';
                    ga.defer = true;
                    ga.src = 'https://jswebcollects.kugou.com/v2/web/collect.js?appid=2400';
                    var s = document.getElementsByTagName('script')[0];
                    ga.addEventListener('load', function () {
                    }, false);
                    s.parentNode.insertBefore(ga, s);

                }


                return this;
            },
            /*发送客户端统计（调用MobileCall实现）*/
            sendMobileBILogStat: function (type) {
                var _this = this;
                var type_androidId = null,
                    type_iosId = 9999999,
                    typeName = '',
                    typeCategory = '',
                    typeSource = '',
                    typeDest = '';

                switch (type) {
                    case 100 :
                        /*歌曲的MV按钮*/
                        type_androidId = 13717;
                        type_iosId = 13553;
                        typeName = '点击';
                        typeDest = '歌曲的MV按钮';
                        typeCategory = 'UNI音榜页面';
                        break;
                    case 101:
                        /*点赞按钮*/
                        type_androidId = 13718;
                        type_iosId = 13554;
                        typeName = '点击';
                        typeDest = '点赞按钮';
                        typeCategory = 'UNI音榜页面';
                        break;
                    case 102:
                        /*点赞弹窗点赞按钮*/
                        type_androidId = 13719;
                        type_iosId = 13555;
                        typeName = '点击';
                        typeDest = '点赞按钮';
                        typeCategory = '点赞弹窗';
                        break;
                    case 103:
                        /*UNI官网*/
                        type_androidId = 13720;
                        type_iosId = 13556;
                        typeName = '点击';
                        typeDest = 'UNI官网';
                        typeCategory = 'UNI音榜页面';
                        break;
                    case 104:
                        /*开通酷狗SVIP获得更多票数*/
                        type_androidId = 13721;
                        type_iosId = 13557;
                        typeName = '点击';
                        typeDest = '开通酷狗SVIP获得更多票数';
                        typeCategory = '点赞弹窗';
                        break;
                    case 105:
                        /*UNI音榜页面分享按钮*/
                        type_androidId = 13722;
                        type_iosId = 13558;
                        typeName = '点击';
                        typeDest = '分享按钮';
                        typeCategory = 'UNI音榜页面';
                        break;
                    case 106:
                        /*UNI音榜页面分享按钮*/
                        type_androidId = 13723;
                        type_iosId = 13559;
                        typeName = '点击';
                        typeDest = '分享按钮';
                        typeCategory = '点赞弹窗';
                        break;
                    case 107:
                        /*点赞成功弹窗拉好友点赞*/
                        type_androidId = 13724;
                        type_iosId = 13560;
                        typeName = '点击';
                        typeDest = '“拉好友点赞”按钮';
                        typeCategory = '点赞成功弹窗';
                        break;
                    case 108:
                        /*svip用户在点赞次数允许范围内点完最后一次赞时，在弹出的窗口中，点击“拉好友点赞”按钮时上报*/
                        type_androidId = 13725;
                        type_iosId = 13561;
                        typeName = '点击';
                        typeDest = '“拉好友点赞”按钮';
                        typeCategory = '点赞弹窗';
                        break;
                    case 109:
                        /*上报时机：点击进入由你音乐榜，榜单完整曝光时上报*/
                        type_androidId = 13767;
                        type_iosId = 13585;
                        typeName = '曝光';
                        typeDest = '由你音乐榜';
                        typeCategory = '由你音乐榜';
                        break;
                    default:
                        break;
                }
                //console.log(type_androidId, type_iosId, typeName, typeCategory, typeDest, typeSource);
                if (KgMobileCall.isIOS) {
                    /*兼容ios不能同时发两条命令，所以做延时处理*/
                    setTimeout(function () {
                        KgMobileCall.statistics(type_androidId, type_iosId, typeName, typeCategory, typeDest, typeSource);
                    }, 200)
                } else if (KgMobileCall.chkAndroidApp()) {
                    KgMobileCall.statistics(type_androidId, type_iosId, typeName, typeCategory, typeDest, typeSource);
                }
                return this;
            }
        }
    };

    /**
     * 更改hash
     * @param hash
     */
    function goHash(hash) {
        window.location.hash = hash;
    }

    /**
     * 音乐播放
     * @returns {{play: play, pause: pause}}
     */
    function audioPlay() {
        var audio = document.getElementById('audio');
        audio.preload = 'preload';
        audio.addEventListener('ended', function () {
            $('.weui_cell_ft').each(function (index, el) {
                if (el.innerText === '正在播放') {
                    //console.log($(el).parent().next())
                    if ($(el).parent().next().length === 0) {
                        $('.weui_cell').eq(0).click()
                    } else {
                        $(el).parent().next().click()
                    }
                    return false
                }
            })
        });
        return {
            play: function (url) {
                audio.src = url;
                audio.play();
            },
            pause: function () {
                audio.pause();
            }
        }
    }

    /**
     * canvas里绘画都使用px单位定位 并且对文字长度进行限制
     * @param op
     * @param callback
     */
    function canvasTobase64(op, callback) {


        var postImg = new Image(),//海报
            QRImg = new Image(),//二维码
            thisW = 660,//canvas的宽、高，双倍于img标签，保证清晰度
            thisH = 1060,
            canvas = document.getElementById('canvas'),
            cxt = canvas.getContext("2d");
        canvas.setAttribute('width', thisW);
        canvas.setAttribute('height', thisH);
        postImg.setAttribute('crossorigin', 'anonymous');//导入的图片允许跨域


        postImg.onload = function () {
            //清除画布
            cxt.clearRect(0, 0, thisW, thisH);
            //白色底
            cxt.fillStyle = '#fff';
            cxt.fillRect(0, 0, thisW, thisH);
            //顶部海报
            cxt.drawImage(postImg, 0, 0, thisW, thisW);

            cxt.fillStyle = 'rgba(0,0,0,0.1)';
            cxt.fillRect(0, 0, thisW, thisW);

            //二维码
            cxt.drawImage($('#qrcode img')[0], 550, 960, 80, 80);
            //主内容 歌手名字
            cxt.font = "bold 38px Microsoft YaHei";
            cxt.fillStyle = "#000";
            var singerName = op.singerName + op.songName;
            // var longPx = singerName.length * 30;
            cxt.fillText(singerName, 31, 735, 598);
            //主内容 歌曲名字
            // cxt.font = "bold 24px Microsoft YaHei";
            // cxt.fillStyle = "#000";
            // cxt.fillText(op.songName, 51 + longPx, 735);
            //单行字 限制23个字符; 多行字 限制每行23个字符 3行
            cxt.font = "26px Microsoft YaHei";
            cxt.fillStyle = "#666";
            cxt.fillText(op.text1.substr(0, 23), 31, 783);
            cxt.fillText(op.text2, 31, 823, 598);
            cxt.fillText(op.text3.substr(0, 23), 31, 880);
            cxt.fillText(op.text3.substr(23, 23), 31, 920);
            cxt.fillText(op.text3.substr(46, 23), 31, 960);

            //底部二维码旁边的文字
            cxt.font = "24px Microsoft YaHei";
            cxt.fillStyle = "#000";
            cxt.textAlign = "end";
            cxt.fillText(op.text4.substr(0, 20), 530, 994);
            cxt.font = "22px Microsoft YaHei";
            cxt.fillStyle = "#666";
            cxt.fillText(op.text5.substr(0, 20), 530, 1025);
            // //输出
            var base64Url = canvas.toDataURL("image/jpeg", 1);
            callback(base64Url)
        }


        postImg.src = op.postImgSrc;//海报图


    }


    /**
     * 分享回调
     * @param cmd
     * @param jsonStr
     */
    window.KgWebMobileCall = {
        /*用户离开切换内嵌页回调*/
        pageStatus: function (cmdid, jsonStr) {
        },
        pageStatusNew: function (cmdid, jsonStr) {
        },
        /*播放状态回调*/
        playStatus: function (jsonStr) {


            var json = jsonStr;
            if (Object.prototype.toString.call(json) === '[object String]') {
                json = JSON.parse(json);
            }


            //if((KgMobileCall.isKugouAndroid || KgMobileCall.isAndroid) && !json.hash){
            //	return;
            //}

            if (json.status == 1) {
                $('.play').removeClass('play');
                $('.sh_' + json.hash.toUpperCase() + ' .list-data-item').addClass('play');

            } else {

                $('.play').removeClass('play');
            }


        },
        shareStatus: function (cmd, jsonStr) {
            if (currentUrl == routers.shareImg) return history.go(-1);
        },
        userStatus: function (cmd, jsonStr) {
            var json = jsonStr;
            if (Object.prototype.toString.call(json) === '[object String]') {
                json = JSON.parse(json);
            }
            if (currentUrl == routers.praise) {
                actions.queryPraise()
            }
            actions.queryInitData(function () {
                actions.queryPraise()
            })
        }
    }
    /**
     * 分享页面功能
     */
    window.rightShare = function () {
        if (currentUrl == routers.shareImg) return actions.shareImg();
        var shareData = {
            "linkUrl": window.location.href,
            "picUrl": 'https://webimg.kgimg.com/82b66f7f29c428722e4d1e630fad310c.jpg',
            "content": '糟糕，是心动的感觉！这首歌太好听了，忍不住分享给你，喜欢的话就点个赞吧^_^',
            "title": initInfo.nickName ? initInfo.nickName + '请你定义流行' : '你的小伙伴请你定义流行'
        }
        actions.sendMobileBILogStat(105);
        KgMobileCall.share({
            "shareName": "酷狗音乐",
            "topicName": "酷狗音乐",
            "hash": "",
            "listID": "",
            "type": "3", //专题type=3
            "suid": "",
            "slid": "",
            "imgUrl": "",
            "filename": "",
            "duration": "",
            "shareData": shareData
        });
    }

    $(window).bind('hashchange', function () {
        currentUrl = window.location.hash.slice(1) || '/';
        var root = routers.root,
            rule = routers.rule,
            exponent = routers.exponent,
            shareImg = routers.shareImg,
            praise = routers.praise;
        switch (currentUrl) {
            case root:  //根hash
                if (preHash == rule) { //隐藏rule
                    KgMobileCall.changeTitleColor({"color": '#ff00ff', "alpha": 1});
                    $('.rule-layer').addClass('visibility');
                } else if (preHash == exponent) {
                    $('.exponent-layer').addClass('visibility');
                } else if (preHash == praise) {
                    $('.praise-layer').addClass('visibility')
                }
                actions.scrollPointThrough(0)
                break;
            case praise:   //点赞
                if (preHash == shareImg) { //隐藏分享图片
                    $('.share-img-layer').addClass('visibility')
                    actions.scrollPointThrough(0)
                    KgMobileCall.changeTitleColor({"color": '#ff00ff', "alpha": 1});
                    setTimeout(function () {
                        KgMobileCall.showHideBar({state: 1});
                    }, 50)
                } else {  //打开直播
                    actions.queryPraise()
                }
                break;
            case rule:   //rule
                KgMobileCall.changeTitleColor({"color": '#c706c7', "alpha": 1});
                $('.rule-layer').removeClass('visibility');
                actions.scrollPointThrough(1)
                break;
            case shareImg:   //分享图片
                actions.showShareImg();
                break;
            case exponent:   //打开层
                actions.exponentLayerUi(listData.choiceItem);
                break;
        }
        preHash = currentUrl
    })
    /**
     * 图片懒加载
     */
    $(window).bind('scroll', function (e) {
        actions.lazyListImg();
    })


})();

