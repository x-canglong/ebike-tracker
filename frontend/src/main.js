import { createApp } from 'vue'
import App from './App.vue'

// 引入 Vant 样式
import 'vant/lib/index.css'
// 引入 Vant 组件
import { 
  NavBar, 
  Tabs, 
  Tab, 
  Cell, 
  CellGroup, 
  Field, 
  Button, 
  Card, 
  Tag, 
  Icon, 
  Empty, 
  PullRefresh, 
  List,
  Form,
  Radio,
  RadioGroup,
  Popup,
  Dialog
} from 'vant'

const app = createApp(App)

// 注册 Vant 组件
app.use(NavBar)
app.use(Tabs)
app.use(Tab)
app.use(Cell)
app.use(CellGroup)
app.use(Field)
app.use(Button)
app.use(Card)
app.use(Tag)
app.use(Icon)
app.use(Empty)
app.use(PullRefresh)
app.use(List)
app.use(Form)
app.use(Radio)
app.use(RadioGroup)
app.use(Popup)
app.use(Dialog)

// 挂载应用
app.mount('#app')
