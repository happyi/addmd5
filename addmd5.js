//给jsp 或 html 中的css js 添加fileMd5值
var fs = require('fs'),
	readline = require('readline'),
	path = require('path'),
	join = path.join,
	extname = path.extname,
	async = require('async'),
	colors = require('colors'),
	url = require('url'),
	crypto = require('crypto'),
	qs = require('querystring');

function AddMd5(directory,opts){
	this.directory = directory;
	this.fileList = [];
	this.count = 0;
	this.extList = opts.extList;//['.jsp','.html','.htm'];
	this.exclude = opts.exclude;//['plugins'];
	this.compress = opts.compress;
	this.replace = opts.replace;//['${basepath}','${staticresdomain}','<%=basepath%>'];//替换字符串
	return this;
}
//获得符合条件的文件
AddMd5.prototype.getFiles = function(dirPath){
	var thiz = this;
	if(fs.existsSync(dirPath)){
		var files = fs.readdirSync(dirPath);
		if(files && files.length > 0){
			for(var i=0,max=files.length;i<max;i++){
				var temp = files[i];
				var filePath = join(dirPath,temp);
				var stats = fs.statSync(filePath);
				if(stats.isDirectory() && thiz.exclude.indexOf(temp) < 0){
					//继续
					thiz.getFiles(filePath);
				}else{
					var fileExt = extname(filePath).toLowerCase();
					if(thiz.extList.indexOf(fileExt) > -1){
						//符合
						thiz.fileList.push(filePath);
					}
				}
			}
		}
	}
}
AddMd5.prototype.start = function(){
	var thiz = this,
		directory = thiz.directory;
	thiz.getFiles(directory);
	console.log('共计扫描到 '.green+(''+thiz.fileList.length).red+' 个符合条件的文件'.green);
	async.mapLimit(thiz.fileList,5,function(item,cb){
		thiz.scan(item,cb);
	},function(err,value){
		console.log('共计替换 '.green+(''+thiz.count).red +' 个链接'.green)
	});
};

AddMd5.prototype.scan = function(filePath,callback){
	var thiz = this,compress = thiz.compress;
	var is = fs.createReadStream(filePath);
	var inter = readline.createInterface({input :is});
	var strArr = '';
	inter.on('line',function(line){
		var rst = thiz.checkLine(line);
		if(rst){//检查到有内容
			//处理并替换
			var md5 = rst.md5;
			//检索并替换
			var arr = /[src|href][\s]*=[\s]*[\"\']?([^\'\"]*)[\'\"]?/i.exec(line);
			if(arr && arr.length > 0){
				var src = arr[1];
				var query = url.parse(src).query;
				var src2 = src.indexOf('?') > -1 ? src.substring(0,src.indexOf('?')) : src;
				var qsObj = qs.parse(query);
				qsObj.v = md5.substring(0,5);
				var qsStr = qs.stringify(qsObj);
				var newSrc= src2 + '?'+qsStr;
				line = line.replace(src,newSrc);
				console.log('替换 [ '.green+line.red+' ]'.green);
				thiz.count ++ ;
			}
		}
		strArr+=line+(compress ? '' : '\n');
	});
	inter.on('close',function(){
		//重新写入
		if(strArr!=='' || strArr!=null)
		{
		    fs.writeFileSync(filePath,strArr);	
		}
		callback(null,null);
	})
};
//根据文件路径获得FILEMD5
AddMd5.prototype.getMd5 = function(filePath){
	var buffer = fs.readFileSync(filePath);
	var md5 = crypto.createHash('md5');
	md5.update(buffer);
	return md5.digest('hex').toLowerCase();
};
AddMd5.prototype.checkLine = function(str){
	//检查字符串是否符合 link script 
	var thiz = this,replace = thiz.replace,directory = thiz.directory;
	str = str.toLowerCase().replace(/\s/g,'');
	var rst = /\<script[\s\S]*src="([\$\{\}\w\.\/\<\%\=\>\?\&]*)"[\s\S]*\>[\s\S]*\<\/script\>/g.exec(str);
	var src = '';
	var type = '';
	if(rst && rst.length > 0){
		src = rst[1];
		type = 'src';
	}
	rst = /^\<link[\s\S]*href="([\$\{\}\w\.\/\<\%\=\>\?\&]*)"[\s\S]*[\>|\/\>|\<\/link\>]$/g.exec(str);
	if(rst && rst.length > 0 && rst[1].indexOf('favicon') < 0){
		src = rst[1];
		type = 'href';
	}
	if(src){
		if(replace && replace.length > 0){
			for(var i=0,max=replace.length;i<max;i++){
				src = src.replace(replace[i],'');
			}
		}
		var srcObj = url.parse(src);
		var query = srcObj.query;
		var filePath = join(directory,srcObj.pathname);
		if(fs.existsSync(filePath)){
			var fileMd5 = thiz.getMd5(filePath);
			return {
				md5 : fileMd5,
				query : query,
				filePath : srcObj.pathname,
				type : type
			};
		}
	}
	return null;
};

module.exports = AddMd5;
