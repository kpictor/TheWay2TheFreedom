# VPS部署指南

---

## 系统要求

- Node.js 16+
- npm 或 yarn
- 2GB+ RAM
- 10GB+ 磁盘空间

---

## 快速部署

### 1. 克隆项目

```bash
git clone https://github.com/kpictor/TheWay2TheFreedom.git
cd TheWay2TheFreedom
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动服务

```bash
# 开发模式
npm run dev

# 或生产模式（推荐使用PM2）
npm install -g pm2
pm2 start server.js --name "learning-system"
pm2 save
pm2 startup
```

---

## 使用Nginx反向代理（推荐）

### 安装Nginx

```bash
sudo apt update
sudo apt install nginx
```

### 配置Nginx

```nginx
# /etc/nginx/sites-available/learning
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 启用配置

```bash
sudo ln -s /etc/nginx/sites-available/learning /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 添加HTTPS（推荐）

使用Let's Encrypt免费证书：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 环境变量

创建 `.env` 文件（可选）：

```bash
PORT=3000
NODE_ENV=production
```

---

## 数据备份

用户数据存储在 `user-data/` 目录：

```bash
# 备份
tar -czvf backup-$(date +%Y%m%d).tar.gz user-data/

# 恢复
tar -xzvf backup-YYYYMMDD.tar.gz
```

---

## 常见问题

### 端口被占用

```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

### PM2进程管理

```bash
pm2 list          # 查看进程
pm2 logs          # 查看日志
pm2 restart all   # 重启
pm2 stop all      # 停止
```

---

## 目录结构

```
TheWay2TheFreedom/
├── server.js           # 后端服务
├── package.json        # 依赖配置
├── index.html          # 前端界面
├── episodes/           # 52期主内容
├── deep-learning/      # 深度学习文档
├── ai-prompts/         # AI交互Prompt
├── templates/          # 用户模板
└── user-data/          # 用户数据（自动创建）
```
