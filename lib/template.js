import dataCache from './dataCache'
const pSIdToHash = {};
const tems = {
  index: function (obj) {
    const issueTitle = obj.issueTitle.split('（')[0],
      notices = dataCache.notices.data,
      noteHtml = notices ? '<div class="affiche  one-px-bottom">\n' +
                '        <p class="affiche-info">' + notices[0].content + '</p>\n' +
                '        <div class="affiche-btn"></div>\n' +
                '    </div>\n' : '',
      issueStart = obj.issueStart.substring(5, 16);
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
    '    </div>';
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
                '                    <li class="list-data-item-img" data-img="' + item.coverImages + '" style="background-image: url(' + (i<6?item.coverImages:'') + ');"></li>\n' +
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
            (dataCache.banner.data ? '<img class="now-data-banner" src="' + dataCache.banner.mobileImage + '" />' : '') +
            lisHtl + '</ul>'
  },
}

export  default  function createStrHtl(data, temName, attrs, type) {
  let htmlList = [];
  if (data instanceof Array && Object.prototype.toString.call(data) === '[object Array]' && type!='list') {
    htmlList = data.map(function (item) {
      return tems[temName](item);
    });
  } else {
    htmlList.push(tems[temName](data));
  }
  return htmlList.join('');

}
