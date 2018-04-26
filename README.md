# addmd5
给项目下的jsp html 内引用的css js 链接增加md5值，防止浏览器缓存导致的问题。

# usage
```
npm install addmd5 -g
addmd5 //给当前目录下的所有的jsp 和 html内引用的css js 增加md5值，防止缓存
addmd5 -d /home/source //给/home/source 目标目录下增加
addmd5 -c //增加的同时，压缩内容，去掉换行。
addmd5 -r ${basePath},<%=basePath%> //将这些字符串替换成为空字符串，因为在jsp中一般都有项目路径作为前缀，替换后可以找到文件
addmd5 -e plugins,build //忽略plugins build 文件夹下的文件
addmd5 -f .jsp,.html,.html //指定要检查的文件后缀
```