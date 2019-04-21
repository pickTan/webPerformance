import {getJsonFiles,setPushs} from './lib/helper'
import template from './lib/template'
import dataCache from './lib/dataCache'
import cheerio from 'cheerio'
import spdy from 'spdy'
import express from 'express'
import path from 'path'
import fs from 'fs'
import fetch from 'node-fetch'
const port = 3000
// const spdy = require('spdy')
// const express = require('express')
// const path = require('path')
// const fs = require('fs')
// const fetch = require('node-fetch')
const app = express()
const options = {
  key: fs.readFileSync(__dirname + '/key/server.key'),
  cert: fs.readFileSync(__dirname + '/key/server.crt')
}


const tenUrlPath =  'https://yobang.tencentmusic.com';
const fileCache =  getJsonFiles('public');
fileCache.push(['/js/dataCache.js',`window.dataCache=${JSON.stringify(dataCache)}`])
let htl = fileCache.find(item=> ~item[0].indexOf('.html'))[1]
const $ = cheerio.load(htl);


function getDateCache(callBack) {
  let i = 0;
  function resCallback() {
    i++;

    if(i===3) {
      const obj =  fileCache.find(item=>item[0]=='/js/dataCache.js')
      obj[1]=`window.dataCache=${JSON.stringify(dataCache)}`;
      const nowData = dataCache.dynamic.data,
        indexhtl = template(nowData, 'index', {}),
        listoptionel = $('.list-options li').eq(0),
        period = nowData.issueTitle.split('（')[0],
        nowListhtl = template(nowData.chartsList, 'nowList', {},'list');
      $('.content').html(indexhtl)
      dataCache.notes || $('.go-live-home-layer').addClass('not-notes') //如果note不存在，修正直播间的位置
      $('.list-container').html(nowListhtl)
      $('.banner-info-periods-btn').addClass('now');
      $('.banner-info-update-time span').text(nowData.updateTime.substring(5, 16).replace('.', '-') + ' 更新')
      $('.banner-info-periods-btn span').text(period)
      if (!listoptionel.hasClass('list-option-choice')) {
        $('.list-option-choice').removeClass('list-option-choice');
        listoptionel.addClass('list-option-choice')
      }
        htl = $.html()
    }

  }
  fetch(`${tenUrlPath}/unichartsapi/v1/songs/charts/dynamic?limit=100&offset=0&platform=kugou`).then(res => res.json())
    .then(body =>{
      dataCache.dynamic = body;
      resCallback()
    });

  fetch(`${tenUrlPath}/unichartsapi/v1/displays/banner?platform=kugou`).then(res => res.json())
    .then(body =>{
      dataCache.banner = body;
      resCallback()
    });

  fetch(`${tenUrlPath}/unichartsapi/v1/displays/notices?platform=kugou`).then(res => res.json())
    .then(body =>{
      dataCache.notices = body;
      resCallback()
    });
}
getDateCache()
setInterval(getDateCache,100000)



app.get('/', (req, res) => {
  setPushs(fileCache,res)
  res.end(htl)
})

spdy.createServer(options, app)
  .listen(port, (error) => {
    if (error) {
      console.error(error)
      return process.exit(1)
    } else {
      console.log('Listening on port: ' + port + '.')
    }
  })

app.use('/', express.static(path.join(__dirname, 'public')))



