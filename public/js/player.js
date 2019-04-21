/*
*
* HTML5音乐播放器
*
* 添加歌曲并播放
* 方法:addSongsAndPlay()
* 例：songs = [{ "hash" : hash, "filename" : filename }];
* this.addSongsAndPlay({
*		"write ": true,
*		"songs" : songs
* });
* param { } write 覆盖添加
* param { } songs 歌曲数组
*
* 歌曲播放时回调
* 方法：cusPlay()
* 
* 歌曲缓冲时回调
* 方法：cusload()
*
*/

(function() {

	/**
     * 工具集 Utils
     * @name Utils
     * @function
     */
	var Utils = function() {
		if (! (this instanceof Utils)) {
			return new Utils();
		}
	};

	Utils.prototype = {
		/**
         * 继承对象（复制属性/方法）
         * @id extend
         * @param {Object} 被复制对象（子对象）
         * @param {Object} 复制对象（父对象）
         * @param {Boolean}  是否重写属性/方法
         * @return {Object} 返回被复制对象（子对象）
         */
		extend: function(target, souce, rewrite) {
			for (var property in souce) {
				if (rewrite) {
					target[property] = souce[property];
				} else if (!target[property]) {
					target[property] = souce[property];
				}
			}
			return target;
		},
		/**
         * 时间补足2位
         * @param { Number } 时间值
         */
		formatNumber: function(num) {
			if (num.toString().length < 2) {
				return "0" + num;
			} else {
				return num;
			}
		},
		/**
         * 格式化时间
         * @param { Number } 时间戳
         */
		formatData: function(data) {
			data = parseInt(data, 10);
			var min = this.formatNumber(Math.floor(data / 60));
			var sec = this.formatNumber(Math.floor(data % 60));
			return min + ":" + sec;
		},
		/*
        * 加0处理
        */
		addZero: function(n) {
			return n.toString().length <= 1 ? "0" + n: n;
		},
		/**
         * 判断是否为IOS或Chrome isIOS
         * @name isIOS
         */
		isIOS: function() {
			if (navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPod/i)) {
				return true;
			} else {
				return false;
			}
		},
        isKnowAdr : function(){
			if (navigator.userAgent.match(/HUAWEI/i) || navigator.userAgent.match(/Chrome/i)) {
				return true;
			} else {
				return false;
			}
        },
		isCanPlayAudio: function() {
			if ( !! (document.createElement('audio').canPlayType("audio/mpeg"))) {
				return true;
			}
			return false;
		},
		formatImgSize: function(o) {
			var size = o.size || 400;
			var str = o.img;
			str = str.replace(/softhead\/\d+\//, "softhead/" + size + "/");
			return str;
		},
		trim: function(str) {
			return str.replace(/(^\s+)|(\s+$)/g,'');
		}
	};

	/**
     * HTML5播放核心 Player
     * @name Player
     * @function
     * @param obj
     */
	var Player = function(opts) {
		var _this = this;
		if (! (this instanceof Player)) {
			return new Player(opts);
		}
		_this.utils = Utils();
		_this.init(opts);
		return this;
	};
	Player.prototype = {
		ver : "1",
		/*
		 *是否在客户端
		 */
		isInClient : false,
		cacheList : {},//缓存列表
		/**
         * 默认变量
         */
		_default: {
			"fatherId": "player",
			//播放器父层
			"playId": "kugou",
			//播放器核心
			"currentTime": "current_time",
			//当前播放时间
			"totalTime": "total_time",
			//播放总时长 
			"btnPrev": "play_prev",
			//上一首按钮
			"btnNext": "play_next",
			//下一首按钮
			"btnMain": "play_main",
			//播放|暂停按钮
			"playClass": "play",
			//播放类名
			"pauseClass": "pause",
			//暂停类名
			"loadClass": "load",
			//加载类名
			"btnMode": "play_mode",
			//播放模式切换按钮
			"songName": "song_name",
			//歌曲名称
			"singerName": "singer_name",
			//播放进度
			"playBarLoad": "play_bar_load",
			//加载进度
			"playBarPlay": "play_bar_play",
			//歌词
			"songLrc": "song_lrc",
			//歌词,
			"songCover": "song_cover",
			//封面
			"defCover": "http://m.kugou.com/static/images/share2014/list/cover.png",
            //是否为歌曲封面
            "isSongCover" : true,
            /*歌曲类名*/
			"songCls" : "songsList",
            /*歌曲列表前缀*/
			"songsListExt" : "songs_",
            /*加载层*/
            "loadName" : "loading",
            /*是否循环*/
            "isCycle" : true, 
			/*是否自动播放*/
			"isAuto" : true,
			/*播放模式single|list*/
			"playMode" : "list"
		},
        /**
         * 播放下一首 nextSong
         * 依懒base.js v2.0
         * @name nextSong
         * @function
         * @modify by lianlihui 2015-05-12
         */
        nextSong : function(isCycle){
            var _this = this;
            var curIndex = _this.curIndex;

            _this.curIndex++;
            if(_this.curIndex < _this.songsList.length){
               _this.create(); 
            }else{
            	if (isCycle) {
	                _this.curIndex = 0;
	                _this.create(); 
            	}
            }
        },

		/**
		 * 开始缓冲数据
		* @method cusload
		*
		*/
		cusload : function(){
            var _this = this,
            dc = document,
            loading = dc.getElementById(_this._default.loadName);

            if(loading){
				loading.style.display = "block";
            }
		},
		
		/**
		 * 缓冲完成
		* @method cusPlay
		*
		*/
		cusPlay : function(){
			var _this = this,
            loading = document.getElementById(_this._default.loadName);

            if(loading){
                loading.style.display = "none";
            }
		},
        /**
         * loadStart 开始加载媒体
         * @name loadStart
         * @function
         */
        loadStart : function(){
            var _this = this;

			if(_this.isInClient){
				return;
			}

			if (_this.utils.isIOS() || _this.utils.isKnowAdr()) {
				if(_this.isFirst || !_this.isAuto){
					_this.cusload();
				}else{
					_this.isFirst = true;
				}
			}else{
				_this.cusload();
			}
        },
        /**
         * 媒体即将播放 playStart
         * @name playStart
         * @function
         */
        playStart : function(){
			var _this = this;

			if(_this.isInClient){
				return;
			}

			_this.cusPlay();
        },
		ispaused : function(){
			var _this = this,
			dc = document;

            if(dc.getElementById(_this._default.playId)){
				return !dc.getElementById(_this._default.playId).paused;
			}
		},
		/**
         * 播放 play
         * @name play
         * @function
         */
		play: function() {

			var _this = this,
			dc = document;

			if(_this.isInClient){
				return;
			}

            if(dc.getElementById(_this._default.playId)){
                dc.getElementById(_this._default.playId).play();
            }

            if(dc.getElementById(_this._default.btnMain)){
                dc.getElementById(_this._default.btnMain).className = _this._default.pauseClass;
            }

		},
		/**
         * 暂停播放 pause
         * @name pause
         * @function
         */
		pause: function() {
			var _this = this,
			dc = document;

			if(_this.isInClient){
				return;
			}

            try{
                dc.getElementById(_this._default.playId).pause();
            }catch(e){}

		},

		/**
		 * 获取歌曲信息 非客户端
		 * @return {[type]} [description]
		 */
		getSongInfo: function(hash) {
			var _this = this;
			var url = 'https://mactivitys.kugou.com/content/getbyHash';
			var src = "";

			$.post(url, {"hash": hash}, function(res) {
				if (res && res.status == 1) {
					if(_this.songsList[_this.curIndex].hash && _this.songsList[_this.curIndex].hash.toUpperCase() != res.hash.toUpperCase()) {
						return;
					}
					src = res.url;
					_this.songsList[_this.curIndex].src = src;
					_this.songsList[_this.curIndex].timeLength = res.timeLength;
					_this.songsList[_this.curIndex].filename = res.fileName;

					//缓存请求
					_this.cacheList[hash] = {
						"src" : src,
						"timeLength" : res.timeLength,
						"filename" : res.fileName
					};
					_this.playSong(src);
				} else {
					
					if(res.ctype == 1003){

						_this.songsList[_this.curIndex].type = 2;
						_this.cacheList[hash]={type:2};
						//alertUI.init('应版权方要求，试听需开通音乐包', 1000);
						$('#buyDialog').show();


					}else{
					
						_this.songsList[_this.curIndex].type = 3;
						_this.cacheList[hash]={type:3};
						alertUI.init('客官，这首歌我们暂时没有版权，酷小狗正在帮您挥汗争取中，先听听别的呗', 1000);
					}
					$('#playAll').removeClass('btn-playAll-pause').attr('played', '0');
					$('.btn-pause').attr('played', '0');
					$('.btn-pause').removeClass('btn-pause');
					
				}
				_this.isLoadSrc = false;
			}, "json");
		},

		/**
		 * 获取客户端歌曲信息
		 * @param  {[type]} hash [description]
		 * @return {[type]}      [description]
		 */
		getClientSongInfo: function(hash) {
			var _this = this;
			var url = 'http://m.kugou.com/api/v1/song/get_by_hashs_album';
			var datahash = [];

			for (var i = 0, len = _this.songsList.length; i < len; i++) {
				datahash.push('{"hash":"'+_this.songsList[i].hash+'","albumid":0}');
			}

			var listen = {
				"total": 1,
				"info":  []
			};

			$.ajax({
				type: 'GET',
				url: url,
				data: {"params":'['+datahash.join(',')+']','format':'jsonp'},
				dataType: 'jsonp',
				success: function(res) {
					if (res && res.status == 1) {
						var arr = res.data;
						var arrLen = arr.length;

						/*单曲 无版权处理*/
						// if(arrLen === 1 && arr[0].status === 0){
						// 	if(arr[0].ctype == 1003 || arr[0].ctype == 1002){
						// 		// alertUI.init('客官，这首歌我们暂时没有版权，酷小狗正在帮您挥汗争取中，先听听别的呗', 1000);
						// 		$('#playAll').removeClass('btn-playAll-pause').attr('played', '0');
						// 		$('.btn-pause').attr('played', '0');
						// 		$('.btn-pause').removeClass('btn-pause');
						// 	}
						// }

						listen.total = arrLen;

						for (var j = 0; j < arrLen; j++) {
							var info = {
								"filename" : arr[j]['fileName'],
								"filesize" : arr[j]['fileSize'],
								"hash" : arr[j]['hash'],
								"bitrate" : arr[j]['bitRate'],
								"extname" : arr[j]['extName'],
								"duration" : arr[j]['timeLength'],
								"mvhash": "",
								"m4afilesize" : 0,
								"320hash" : arr[j]['extra']['320hash'],
								"320filesize" : arr[j]['extra']['320filesize'], 
								"sqhash" : arr[j]['extra']['sqhash'],
								"sqfilesize" :arr[j]['extra']['sqfilesize'],
								"feetype" : 0,
								"isfirst" : 0,
								"privilege" : arr[j]['privilege']
							};
							listen.info.push(info);	
						}
						try {
							KgMobileCall.listen(listen);
						} catch (e) {}
					
					}else{
						alertUI.init('网络繁忙，请稍后再试');
					}
					_this.isLoadSrc = false;
				},
				error: function(res) {
						alertUI.init('网络繁忙，请稍后再试');
						_this.isLoadSrc = false;
				}
			});
			
			
			/*
			$.get(url+'['+datahash.join(',')+']',function(res) {
				if (res && res.status == 1) {
					var arr = res.data;
					var arrLen = arr.length;

					listen.total = arrLen;

					for (var j = 0; j < arrLen; j++) {
						var info = {
							"filename" : arr[j]['fileName'],
							"filesize" : arr[j]['fileSize'],
							"hash" : arr[j]['hash'],
							"bitrate" : arr[j]['bitRate'],
							"extname" : arr[j]['extName'],
							"duration" : arr[j]['timeLength'],
							"mvhash": "",
							"m4afilesize" : 0,
							"320hash" : arr[j]['extra']['320hash'],
							"320filesize" : arr[j]['extra']['320filesize'], 
							"sqhash" : arr[j]['extra']['sqhash'],
							"sqfilesize" :arr[j]['extra']['sqfilesize'],
							"feetype" : 0,
							"isfirst" : 0
						};
						listen.info.push(info);	
					}
					try {
						KgMobileCall.listen(listen);
					} catch (e) {}

				} else {
					alertUI.init('暂时不能听这首歌哦', 1000);
				}
				_this.isLoadSrc = false;
			}, "json");
			*/
		},

		playSong: function(src) {
			var _this = this;
			var dc = document;
			
			/*创建音频*/
			if (_this.utils.isIOS() || _this.utils.isKnowAdr()) {
				//for IOS 
				dc.getElementById(_this._default.playId).src = src;
			} else {
				//for android
				dc.getElementById(_this._default.playId).src = src;
			}

			if (_this.utils.isIOS()) {
				dc.getElementById(_this._default.playId).pause();
			} else {
				dc.getElementById(_this._default.playId).pause();
			}
			dc.getElementById(_this._default.playId).play();
		},


		playStatus: function(hash) {
			if ($('.btn-pause')[0]) {
				$('.btn-pause').attr('played', '0');
				$('.btn-pause').removeClass('btn-pause');
			}
			if ($('#song_'+hash)[0]) {
				$('#song_'+hash).attr('played', '1');
				$('#song_'+hash).addClass('btn-pause');
			}
		},


		/**
         * 创建一个音频对象 create
         * 依赖 base.js v2.0
         * @name create
         * @function
         */
		create: function(o) {
			var _this = this,
			dc = document,
			song = {},
			src = "",
			_id = "",
			clientStr = "";
            
            if(_this.isLoadSrc){
                return;
            }
            _this.isLoadSrc = true;

			song = _this.songsList[_this.curIndex];
			song.hash =  _this.utils.trim(song.hash);
			if (!_this.isInClient) { //html5播放
				//强制播放需要
				dc.getElementById(_this._default.playId).removeAttribute("src");

				//不支持HTML5
				if (!_this.utils.isCanPlayAudio()) {
					alert("此款手机不支持HTML5播放");
					return;
				}

				if (!_this.cacheList[song.hash]){
					/*获取歌曲信息*/
					_this.getSongInfo(song.hash);
					
				} else {
					
					if(_this.cacheList[song.hash].type == 2){
						$('#playAll').removeClass('btn-playAll-pause').attr('played', '0');
						$('.btn-pause').attr('played', '0');
						$('.btn-pause').removeClass('btn-pause');
						//alertUI.init('应版权方要求，试听需开通音乐包', 1000);
						$('#buyDialog').show();
						_this.isLoadSrc = false;
						return;
					}else if(_this.cacheList[song.hash].type == 3){
						$('#playAll').removeClass('btn-playAll-pause').attr('played', '0');
						$('.btn-pause').attr('played', '0');
						$('.btn-pause').removeClass('btn-pause');
						alertUI.init('客官，这首歌我们暂时没有版权，酷小狗正在帮您挥汗争取中，先听听别的呗', 1000);
						_this.isLoadSrc = false;
						return;
					}

					src = _this.cacheList[song.hash].src;
					_this.isLoadSrc = false;
				}
				_this.playSong(src);

			} else { //客户端播放
				_this.getClientSongInfo(song.hash);
			}
		},
		/**
         * 添加歌曲列表并播放 addSongsAndPlay
         * @name addSongsAndPlay
         * @function
         * @modify by lianlihui 2015-05-12
         */
		addSongsAndPlay: function(o) {
			var _this = this;
			if (o) {
				if (o.hasOwnProperty("isCycle")) {
					_this._default.isCycle = o.isCycle;
				}
				if (o.hasOwnProperty("playMode")) {
					_this._default.playMode = o.playMode;
				}
				if (o.write) {
					_this.songsList = o.songs;
					_this.curIndex = 0;
				} else {
					_this.songsList = _this.songsList.concat(o.songs);
				}
				_this.create();
			}
		},
		/**
         * 添加歌曲列表不播放 addSongsNoPlay
         * @name addSongsNoPlay
         * @function
         */
		addSongsNoPlay: function(o) {
			var _this = this;
			if (o) {
				if (o.write) {
					_this.songsList = o.songs;
				} else {
					_this.songsList = _this.songsList.concat(o.songs);
				}
			}
		},
        /**
         * bindAudio
         * 依懒 base.js v2.0
         * @name bindAudio
         * @function
         */
        bindAudio : function(){
            var _this = this,
            dc = document;

			/*如果是客户端则跳过*/
			if(_this.isInClient){
				return;
			}

            $("#" + _this._default.playId).on("loadstart",function(){
                _this.loadStart();
            });

            $("#" + _this._default.playId).on("canplay",function(){
                _this.playStart();
            });

            //暂停播放
            $("#" + _this._default.playId).on("pause",function(){
                if(dc.getElementById(_this._default.btnMain)){
                    dc.getElementById(_this._default.btnMain).className = _this._default.playClass;
                }
                _this.playStart();
            });
            /*播放*/
            $("#" + _this._default.playId).on("play",function(){
                if(dc.getElementById(_this._default.btnMain)){
                    dc.getElementById(_this._default.btnMain).className = _this._default.pauseClass;
                }
            });
            /*播放出错, 这里不要暂停*/
            $("#" + _this._default.playId).on("error",function(){
                _this.playStart();
            });

            /*当首歌曲播放完成 modify by lianlihui 2015-05-12*/
            $("#" + _this._default.playId).on("ended",function(){
            	if (_this._default.playMode == "single") { //单曲
            		if (_this._default.isCycle) {
            			if (_this.isInClient) {
            				_this.create();	
            			} else {
	            			document.getElementById(_this._default.playId).play();	
            			}
            		}
            	} else { //列表
            		_this.nextSong(_this._default.isCycle);
            	}
            });
            $("#" + _this._default.playId).on("suspend",function(){
            	_this.playStart();
				// document.getElementById(_this._default.playId).pause();
				// document.getElementById(_this._default.playId).play();
            });
			/*兼容处理，如果自动加载数据，则尝试播放*/
			$("#" + _this._default.playId).on("loadeddata",function(){
				document.getElementById(_this._default.playId).play();
			});
        },

		/**
         * 绑定事件 bind
         * 依赖base.js v2.0
         * @name bind
         * @function
         */
		bind: function() {
			var _this = this,
			dc = document;

			//绑定播放/暂停按钮 
			if (dc.getElementById(_this._default.btnMain)) {
				$("#" + _this._default.btnMain).on("click", function() {
                    if(_this.songsList && _this.songsList.length > 0){
                        if (this.className.indexOf(_this._default.playClass) > -1) {
                            _this.play();
                        } else {
                            _this.pause();
                        }
                    }
				});
			}
            
		},
		/**
		 * 创建音频对象
		* @method createAudio
		*
		* @return { } 
		*/
		createAudio : function(){
			var _this = this,
			dc = document;

			if(!dc.getElementById(_this._default.fatherId) && !_this.isInClient){
				var au = document.createElement("div");
				au.id = _this._default.fatherId;
				au.style.display = "none";
				if(_this._default.isAuto){
					au.innerHTML = '<audio id="'+ _this._default.playId +'" autoplay height="100%" width="100%" controls></audio>'; 
				}else{
					au.innerHTML = '<audio id="'+ _this._default.playId +'" height="100%" width="100%" controls></audio>'; 
				}
				dc.body.appendChild(au);
			}
		}, 
		/**
         * 初始化 init
         * @name init
         * @function
         * @param {Object} opts
         */
		init: function(opts) {
			var _this = this,
			dc = document;
			/*歌曲列表*/
			_this.songsList = [];
			/*当前序号*/
			_this.curIndex = 0;
			/*创建歌词对象*/
			_this.uiLRC = null;
			/*是否在客户端*/
			try{
				_this.isInClient =  KgMobileCall.isInClient();
			} catch(e){
				_this.isInClient =  false;
			}

			if (opts) {
				$.extend(_this._default, opts||{});
				//_this.utils.extend(_this._default, opts, true);
			}

			//创建视频对象
			_this.createAudio();

			_this.bindAudio();
			//绑定事件
			_this.bind();
			return this;
		}
	};
	window.Player = Player;
} ());
