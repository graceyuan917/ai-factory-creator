# 前端原型代码规范

> **author**: AI助手  
> **date**: 2026-03-31  
> **version**: v1.0  
> **description**: 前端原型开发代码规范，适用于ERP系统原型开发，基于React + TypeScript + Tailwind CSS技术栈

---

## 📋 概述

本规范定义了前端原型开发的技术栈、项目结构、编码规范和质量标准，旨在确保原型代码的一致性、可维护性和可复用性。

## 🛠️ 技术栈

| 类型 | 选型 | 说明 |
|------|------|------|
| 框架 | React 18+ | 函数组件 + Hooks |
| 构建工具 | Vite | 快速开发体验 |
| 语言 | TypeScript 5.0+ | 强类型检查 |
| UI组件库 | shadcn/ui (基于Radix UI) | 可访问性优先 |
| 样式方案 | Tailwind CSS 3.0+ | 原子化CSS，zinc灰色调 |
| 路由 | react-router-dom 6.0+ | 声明式路由 |
| 状态管理 | React Context / Zustand (按需) | 简单场景用Context，复杂用Zustand |
| HTTP客户端 | axios / fetch API | RESTful API调用 |
| 图标库 | lucide-react | 一致的图标体系 |
| 代码格式化 | Prettier + ESLint | 统一代码风格 |

## 📁 项目结构

```
src/
├── components/           # 可复用组件
│   ├── layout/          # 布局组件（Sidebar、Header、Layout）
│   ├── ui/              # shadcn/ui基础组件
│   ├── forms/           # 表单相关组件
│   ├── tables/          # 表格相关组件
│   └── shared/          # 业务无关通用组件
├── pages/               # 页面组件（按模块组织）
│   └── [模块名]/        # 如：purchase、inventory、sales
│       ├── list.tsx     # 列表页
│       ├── detail.tsx   # 详情页
│       ├── create.tsx   # 创建页
│       ├── edit.tsx     # 编辑页
│       └── components/  # 页面私有组件
├── hooks/               # 自定义Hooks
│   ├── useAuth.ts       # 认证相关
│   ├── useApi.ts        # API调用封装
│   └── useForm.ts       # 表单处理
├── services/            # API服务层
│   ├── apiClient.ts     # HTTP客户端配置
│   ├── authService.ts   # 认证服务
│   └── [模块]Service.ts # 各模块API
├── types/               # TypeScript类型定义
│   ├── index.ts         # 类型导出
│   ├── api.ts           # API响应/请求类型
│   └── [模块].ts        # 各模块类型
├── utils/               # 工具函数
│   ├── constants.ts     # 常量定义
│   ├── helpers.ts       # 辅助函数
│   └── validators.ts    # 表单验证
├── styles/              # 全局样式
│   └── globals.css      # Tailwind导入和自定义样式
├── App.tsx              # 根组件和路由配置
└── main.tsx             # 应用入口
```

## 🎨 UI/UX规范

### 布局规范
- **标准布局**: 左侧边栏导航 + 右侧主内容区，支持侧边栏折叠
- **响应式**: 适配桌面端，移动端可选（原型以桌面为主）
- **栅格系统**: 使用Tailwind的grid/flex布局，保持一致性

### 设计Token
| 类别 | 值 | 用途 |
|------|----|------|
| 主色调 | zinc-900 / zinc-800 | 背景、文字 |
| 辅助色 | zinc-700 / zinc-600 | 边框、分割线 |
| 状态色 | red-500(错误) / green-500(成功) / blue-500(信息) / yellow-500(警告) | 按钮、提示 |
| 字体大小 | text-xs(12px) / text-sm(14px) / text-base(16px) | 大部分使用sm |
| 间距 | 4px倍数，常用p-2/p-3, m-2/m-3 | 统一间距系统 |
| 圆角 | rounded-md(6px) | 按钮、卡片、输入框 |
| 阴影 | shadow-sm / shadow-md | 卡片、下拉菜单 |

### 组件规范
1. **按钮**
   - 使用shadcn/ui的Button组件
   - 变体：default、destructive、outline、secondary、ghost、link
   - 大小：sm、default、lg
   - 禁用状态：opacity-50 + cursor-not-allowed

2. **表单**
   - 标签在上，输入框在下，使用Label组件
   - 必填字段用红色星号`*`标注
   - 错误提示显示在输入框下方，红色文字
   - 表单分组使用Card组件包裹

3. **表格**
   - 使用shadcn/ui的Table组件
   - 表头固定，内容可滚动
   - 支持分页、排序、筛选（原型可简化）
   - 行操作按钮放在最后一列

4. **卡片**
   - 用于信息分组，有边框和阴影
   - 标题使用CardHeader，内容使用CardContent

### 交互规范
1. **加载状态**: 按钮点击后显示loading状态，防止重复提交
2. **空状态**: 数据为空时显示友好提示和操作引导
3. **成功/失败反馈**: 操作后使用toast通知用户结果
4. **确认对话框**: 删除等重要操作需二次确认

## 📝 代码规范

### 组件开发
1. **函数组件**: 使用React函数组件和Hooks
2. **组件命名**: PascalCase，如`PurchaseOrderList`
3. **Props类型**: 使用TypeScript接口定义，包含`?`可选标记
4. **默认导出**: 每个文件默认导出一个组件
5. **组件拆分**: 超过200行或逻辑复杂时拆分子组件

### 类型定义
```typescript
// 业务对象接口
interface PurchaseOrder {
  id: string;
  orderNo: string;
  supplierId: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  totalAmount: number;
  createdAt: string;
  items: PurchaseOrderItem[];
}

// API响应类型
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}
```

### 状态管理
1. **本地状态**: 使用`useState`、`useReducer`
2. **跨组件状态**: 简单场景用Context，复杂场景用Zustand
3. **表单状态**: 使用React Hook Form + zod验证
4. **服务端状态**: 使用TanStack Query（可选，原型可简化）

### API调用
1. **服务层封装**: 在`services/`目录下按模块组织API函数
2. **错误处理**: 统一错误拦截，toast提示用户
3. **请求取消**: 使用AbortController避免内存泄漏
4. **类型安全**: 请求/响应类型与后端API对齐

```typescript
// 示例：采购订单服务
export const purchaseOrderService = {
  // 查询列表
  getList: async (params: GetPurchaseOrderListParams): Promise<PurchaseOrder[]> => {
    const response = await apiClient.get<ApiResponse<PurchaseOrder[]>>('/purchase-orders', { params });
    return response.data.data;
  },
  
  // 创建订单
  create: async (data: CreatePurchaseOrderDto): Promise<PurchaseOrder> => {
    const response = await apiClient.post<ApiResponse<PurchaseOrder>>('/purchase-orders', data);
    return response.data.data;
  },
};
```

### 样式编写
1. **Tailwind优先**: 使用Tailwind工具类，避免自定义CSS
2. **自定义样式**: 在`globals.css`中定义，使用`@layer`
3. **响应式**: 使用响应式前缀，如`sm:`、`md:`、`lg:`
4. **暗色模式**: 原型暂不要求，保持亮色模式

### 性能优化
1. **组件优化**: 使用`React.memo`、`useMemo`、`useCallback`避免不必要的重渲染
2. **代码分割**: 使用React.lazy + Suspense实现路由懒加载
3. **图片优化**: 使用WebP格式，添加loading="lazy"
4. **包大小**: 定期分析bundle大小，移除未使用依赖

## 🚀 开发流程

### 环境要求
- Node.js 18+
- pnpm 8+（推荐）或 npm 10+
- VS Code + 推荐扩展（ESLint, Prettier, Tailwind CSS IntelliSense）

### 项目初始化
```bash
# 创建Vite项目
pnpm create vite@latest erp-prototype --template react-ts

# 安装依赖
cd erp-prototype
pnpm install

# 初始化shadcn/ui
pnpm dlx shadcn-ui@latest init

# 安装常用组件
pnpm dlx shadcn-ui@latest add button card table ...
```

### 开发命令
```bash
# 开发服务器
pnpm dev

# 构建
pnpm build

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

## 📋 质量要求

### 代码质量
1. **TypeScript**: 严格模式，无any类型
2. **ESLint**: 零错误，零警告
3. **测试**: 关键组件和工具函数有单元测试（原型可简化）
4. **可访问性**: 支持键盘导航，ARIA标签完整

### 用户体验
1. **响应时间**: 页面加载<3秒，操作反馈<1秒
2. **错误边界**: 使用ErrorBoundary捕获渲染错误
3. **离线处理**: 网络异常时友好提示
4. **数据一致性**: 列表/详情数据同步更新

## 🔧 常用代码片段

### 列表页模板
```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function PurchaseOrderList() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await purchaseOrderService.getList({});
      setOrders(data);
    } catch (error) {
      console.error('加载失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>采购订单列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Input placeholder="搜索订单号..." className="max-w-sm" />
            <Button onClick={() => {/* 跳转创建页 */}}>新建订单</Button>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>订单号</TableHead>
                <TableHead>供应商</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>金额</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.orderNo}</TableCell>
                  <TableCell>{order.supplierId}</TableCell>
                  <TableCell>{order.status}</TableCell>
                  <TableCell>{order.totalAmount}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">查看</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 📚 参考资料

1. [React官方文档](https://react.dev)
2. [TypeScript手册](https://www.typescriptlang.org/docs)
3. [Tailwind CSS文档](https://tailwindcss.com/docs)
4. [shadcn/ui文档](https://ui.shadcn.com)
5. [Radix UI原始组件](https://www.radix-ui.com)

---

## 📝 更新日志

| 版本 | 日期 | 更新内容 | 更新人 |
|------|------|---------|--------|
| v1.0 | 2026-03-31 | 初始版本，创建完整规范 | AI助手 |

