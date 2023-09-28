## 实现的功能:

### 1) 配置 `rootPath` 获取 `rootpath` 下所有的 vue / js 依赖关系

例子: 

<br/> 

输入:
配置文件: `config\config.js`
```
{
  "paths": ["D://code//base//src//kyetree//pages"]
}
```

<br/>

输出的结果为 2 个文件: `js_imports_output.yml` / `vue_output.yml`

<br/>

`js_imports_output.yml` 内容如下：

<br/>

```yml
'D:\code\base\src\kyetree\pages\crm\client-introduction\components\date\index.vue':

'D:\code\base\src\kyetree\pages\crm\client-introduction\components\drop-down\dep\dropdown.vue':

'D:\code\base\src\kyetree\pages\crm\client-introduction\components\drop-down\dep\index.vue':

```

<br/>

`vue_output.yml` 内容如下:

<br/>

```yml

D:\code\base\src\kyetree\pages\crm\client-track\index.vue:
  import 'import HomeOld from './home-old''
  import 'import HomeV2 from './home-v2''
  import 'import followUpRemarks from './dialog/followUpRemarks''
  import 'import moment from 'moment''

D:\code\base\src\kyetree\pages\crm\client-track\poll-chart.vue:
  import 'import KtEcharts from '@/kyetree/components/kt-echarts''
  import 'import sortMixin from './mixins/sort-mixin''

```

<br/>
<br/>


### 2) 获取 `rootpath` 下所有的引入未被使用的 vue 文件


<br/>

#### 方法1


<br/>

亦可以单独使用命令行调用， 注意不同操作系统更换不同的路径写法

<br/>

```sh
node .\find-unused-vue-file\index.js D://code//base//src//kyetree//pages

```

<br/>

#### 方法2

<br/>


使用方式， 配置在 `config\config.js`

<br/>

```js
{
  "paths": ["D://code//base//src//kyetree//pages"],
  "findUnusedVueFile": true
}
```

<br/>


输出内容:

```yml

目前扫描的项目目录: D://code//base//src//kyetree//pages未被引用的vue文件数量是: 1884
未被引用的vue文件路径:
- D:\code\base\src\kyetree\pages\crm\client-introduction\components\date\index.vue
- D:\code\base\src\kyetree\pages\crm\client-introduction\components\drop-down\dep\dropdown.vue
- D:\code\base\src\kyetree\pages\crm\client-introduction\components\drop-down\dep\index.vue

```

<br/>
<br/>


### 3） 获取 `rootpath` 下所有的引入vue文件，但是未被使用的vue文件

使用方式， 配置在 `config\config.js`

<br/>

```js
{
  "paths": ["D://code//base//src//kyetree//pages"],
   // vue组件的组件名, 首字母大写，驼峰写法，
  //  转变之后会是：BdTreeSelect  >  bd-tree-select
  "componentName":  'BdTreeSelect'
}
```

<br/>

```yml
Files importing bd-tree-select:
D:\code\base\src\kyetree\pages\crm\operation-manager\daily-analysis\dialog\waybill-detail-dialog\waybill-detail-person.vue:
  import 'import BdTreeSelect from '@/bigdata-common/components/bd-tree-select''

D:\code\base\src\kyetree\pages\crm\seller-tag\components\dialog\sudoku\index.vue:
  import 'import BdTreeSelect from '@/bigdata-common/components/bd-tree-select''

```