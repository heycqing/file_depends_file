
## 安装
Node 版本: v.16 

## 使用
1. `npm i` 安装依赖

2. 更改扫描路径: config.js
    #### 需要扫描的路径
    例如：
    D:\code\base\src\kyetree-prism\pages\data-mode
    D:\code\base\src\kyetree-prism\pages\data-set
    D:\code\base\src\kyetree-prism\pages\data-view

    具体路径文件集合在config中。

3. `node findfile.js` 

## 输出
1. js_imports_output.yml 主要输出依赖的js文件

2. vue_output.yml 主要输出依赖的vue文件

