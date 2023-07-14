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
