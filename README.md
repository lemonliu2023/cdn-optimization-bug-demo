# main.js 瘦身失败了

最近在做系统优化，减少首屏加载时间，在把项目依赖的三方库换成 cdn 后，系统白屏了，在此记录下排查过程

## 问题复现
问题复现的最小仓库已经上传，地址：https://github.com/lemonliu2023/cdn-optimization-bug-demo
1. 启动优化前的项目
```shell
git clone https://github.com/lemonliu2023/cdn-optimization-bug-demo.git
cd cdn-optimization-bug-demo
git checkout -b original-project origin/original-project
pnpm i
pnpm start
```
打开浏览器，打开 http://localhost:8000
正常情况下，页面会出现一个 antd 的测试按钮

2. 把 react、react-dom、antd 换成 cdn 加载
![image-20230714163850529](https://p.ipic.vip/0lsphl.png)
```shell
git checkout -b bug-appear origin/bug-appear
```
页面白屏
![image-20230714164015317](https://p.ipic.vip/07zd16.png)

## 排查

### 1. moment 未定义

第一个错误仔细观察是 antd.min.js 内的问题
![image-20230714164219237](https://p.ipic.vip/rc4fex.png)
点进去发现`moment` 未定义，从源码看是 antd 依赖 React、ReactDOM 和 moment，需要把 moment 也换成 cdn 加载。

![image-20230714175901258](https://p.ipic.vip/y4j0e4.png)

antd 官网其实已经介绍过这个问题，https://3x.ant.design/docs/react/introduce-cn#%E6%B5%8F%E8%A7%88%E5%99%A8%E5%BC%95%E5%85%A5

![image-20230714175625644](https://p.ipic.vip/xmiz2z.png)

我们加上 moment 问题依然无法解决

![image-20230714180035573](https://p.ipic.vip/42ngka.png)

### 2. Component 属性没找到

把重要代码提取出来，大概长这样

```js
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);

var Router = function (_React$Component) {}(react__WEBPACK_IMPORTED_MODULE_2___default.a.Component)
```

所以只要找到`react__WEBPACK_IMPORTED_MODULE_2___default.a` 是什么问题就解决了

继续分析，这里有几个 webpack 打包后的函数

`__webpack_require__`：加载一个模块，返回模块导出的变量

```js
// 缓存模块使用
var installedModules = {};
// The require function
// 模拟模块的加载，webpack 实现的 require
function __webpack_require__(moduleId) {
  // Check if module is in cache
  // 检查模块是否在缓存中，有则直接从缓存中获取
  if(installedModules[moduleId]) {
    return installedModules[moduleId].exports;
  }
  // Create a new module (and put it into the cache)
  // 没有则创建并放入缓存中，其中 key 值就是模块 Id
  var module = installedModules[moduleId] = {
    i: moduleId, // Module ID
    l: false, // 是否已经执行
    exports: {}
  };

  // Execute the module function
  // 执行模块函数，挂载到 module.exports 上。this 指向 module.exports
  modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

  // Flag the module as loaded
  // 标记这个 module 已经被加载
  module.l = true;

  // Return the exports of the module
  // module.exports通过在执行module的时候，作为参数存进去，然后会保存module中暴露给外界的接口，如函数、变量等
  return module.exports;
}
```

`__webpack_require__.n`：判断module是否为es模块，当 __esModule 为 true 的时候，标识 module 为es 模块，默认返回module.default，否则返回 module。

```js
// getDefaultExport function for compatibility with non-harmony modules
__webpack_require__.n = function(module) {
  var getter = module && module.__esModule ?
    function getDefault() { return module['default']; } :
    function getModuleExports() { return module; };
  __webpack_require__.d(getter, 'a', getter);
  return getter;
};
```

`__webpack_require__.d`：主要的工作就是将上面的 getter 函数绑定到 exports 中的属性 a 的 getter 上

```js
// define getter function for harmony exports
__webpack_require__.d = function(exports, name, getter) {
 if(!__webpack_require__.o(exports, name)) {
  Object.defineProperty(exports, name, {
   configurable: false,
   enumerable: true,
   get: getter
  });
 }
};
```

综上，可以得出 `react__WEBPACK_IMPORTED_MODULE_2___default.a` 就是 React 模块，也就是说 react 模块没有正常加载

所以需要排查 react 模块加载部分

```js
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("window.antd"), require("window.React"), require("window.ReactDOM"));
	else if(typeof define === 'function' && define.amd)
		define(["window.antd", "window.React", "window.ReactDOM"], factory);
	else {
		var a = typeof exports === 'object' ? factory(require("window.antd"), require("window.React"), require("window.ReactDOM")) : factory(root["window.antd"], root["window.React"], root["window.ReactDOM"]);
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(window, function(__WEBPACK_EXTERNAL_MODULE_antd__, __WEBPACK_EXTERNAL_MODULE_react__, __WEBPACK_EXTERNAL_MODULE_react_dom__) {})
```

这是一份`UMD`的打包输出，我们只要关心浏览器环境的打包就可以，简化上面代码得到

```js
(function webpackUniversalModuleDefinition(root, factory) {
		var a = factory(root["window.antd"], root["window.React"], root["window.ReactDOM"]);
		for(var i in a) root[i] = a[i];
})(window, function(__WEBPACK_EXTERNAL_MODULE_antd__, __WEBPACK_EXTERNAL_MODULE_react__, __WEBPACK_EXTERNAL_MODULE_react_dom__) {})
```

其中 root = window，显然 window['window.React'] 是取不到值的，也就是说

**webpack umd 打包与 externals 使用 window. 的配置不兼容**

如果使用 var 模式打包，会发现 webpack 打包的产物是

```js
module.exports = window.React // = React 也兼容
```

得出一个结论，externals 配置的 value 最好不要使用 window. ，即使它在有些打包模式下是生效的

更改 externals 配置

![image-20230717164231651](https://p.ipic.vip/os8pjb.png)

此时的项目就可以正常运行了。

实际排查中还出现了另一个问题，这里手动改代码复现，更新下 antd 的版本

![image-20230717164745692](https://p.ipic.vip/0qcuq2.png)

此时页面：

![image-20230717164827272](https://p.ipic.vip/worrhw.png)

### 3. Minified React error #130

生产环境的 React 错误提示十分精短，需要打开详细链接才知道错误原因，可手动更改为开发环境排查问题

![image-20230717165231462](https://p.ipic.vip/0u9lu6.png)

此时页面：

![image-20230717165312069](https://p.ipic.vip/xxrlqg.png)

大致意思是`DvaRoot`预期返回一个组件，结果返回了 `undefined`

全局搜索 DvaRoot，出现错误的位置是 cdn-optimization-bug-demo/node_modules/dva/lib/index.js

```js
function getProvider(store, app, router) {
  var DvaRoot = function DvaRoot(extraProps) {
    return _react.default.createElement(_reactRedux.Provider, {
      store: store
    }, router((0, _objectSpread2.default)({
      app: app,
      history: app._history
    }, extraProps)));
  };

  return DvaRoot;
}
```

也就是说 _reactRedux 的 Provider 返回了 undefined

找到 Provider 源码，cdn-optimization-bug-demo/node_modules/.pnpm/react-redux@5.0.7_react@16.14.0+redux@3.7.2/node_modules/react-redux/lib/components/Provider.js

```js
var Provider = function (_Component) {
  _inherits(Provider, _Component);
  Provider.prototype.getChildContext = function getChildContext() {
    var _ref;
    return _ref = {}, _ref[storeKey] = this[storeKey], _ref[subscriptionKey] = null, _ref;
  };
  function Provider(props, context) {
    _classCallCheck(this, Provider);
    var _this = _possibleConstructorReturn(this, _Component.call(this, props, context));
    _this[storeKey] = props.store;
    return _this;
  }
  Provider.prototype.render = function render() {
    return _react.Children.only(this.props.children);
  };
  return Provider;
}(_react.Component);
```

可以看到，Provider render 的是父组件传入的 children，向上推导得出 DvaRoot 里 render 的是 router 组件

也就是说 router 组件为 undefined

cdn-optimization-bug-demo/src/router.js

```jsx
import React from 'react'
import { ConfigProvider, Button } from 'antd'
import zhCN from 'antd/lib/locale-provider/zh_CN'


export default () => {
  return (
    <ConfigProvider locale={zhCN}>
        <Button>测试</Button>
    </ConfigProvider>
  )
}
```

打印 ConfigProvider，为 undefined，猜测 antd 版本过低，没有相关 api，但是开发安装的依赖是 3.10.7，使用的 cdn 也是这个版本，不应该出现问题

实际打开 node_modules 里的 antd，发现版本是 3.26.19，cdn 切换到此版本，问题解决

![image-20230717171245556](https://p.ipic.vip/ffu8pp.png)

由此看出，项目依赖锁定版本的重要性
