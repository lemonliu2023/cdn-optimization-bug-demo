import dva from 'dva';
import { createHashHistory as createHistory } from 'history';
import 'antd/dist/antd.less';

const app = dva({
  history: createHistory(),
  onError: (e) => {
    console.log('全局统一catch：\n', e.message);
  },
});
  app.model({
    namespace: 'global',
    state: {}
  });
  app.router(require('./router').default);
  app.start(document.querySelector('#app'));
