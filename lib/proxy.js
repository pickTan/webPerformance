/**
 * 反向代理
 * Created by pengfeng on 2016/10/18.
 */
import fs from 'fs'
import http from 'http'


const proxy =  ()=>{
  new Promise((resolve, reject)=>{
    var request = http.request(opt,  (response)=> { //建立连接 和 响应回调
      if (response.statusCode == 200) {
        response.setEncoding('utf8');
        var body = "";
        response.on('data',  recData=> { body += recData; });
        response.on('end',  () =>{

          fs.unlink(req.file.path);
          body = JSON.parse(body);
          var resJson = {
            status: body.status,
            error_code: body.error_code,
            url: 'http://webimg.bssdl.kugou.com/' + body.data['x-bss-filename']
          }
          resolve(resJson)
        });
      } else {
        res.send(500, "error");
      }
    });
  })
}