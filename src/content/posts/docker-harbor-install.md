---
title: Docker私服仓库：Harbor安装与配置
description: 想用Docker部署服务？还在docker save docker load？Harbor私服仓库教你优雅发布！
published: 2026-01-18
date: 2026-01-18
tags:
  - Docker
  - Harbor
category: 教程
draft: false
pinned: false
image: ./img/defalut-cover.png
---
# 前言
## 什么是Harbor
Harbor 是一个开源镜像仓库，通过策略和基于角色的访问控制来保护镜像，确保镜像经过扫描且没有漏洞，并将镜像签名为可信镜像。Harbor 是一个 CNCF 毕业项目，提供合规性、性能和互操作性，帮助您在 Kubernetes 和 Docker 等云原生计算平台上一致且安全地管理镜像。
## 为什么用harbor?
我们可以将镜像上传至Harbor，然后在服务器端直接更新镜像即可实现优雅部署，不使用第三方的镜像仓库，内网上传，内网拉取，更加安全！特别是对于无网环境，特别友好！

同时我们也可以将常用的镜像包上传至harbor，以便快速拉取，部署业务。
# 开始安装
官方推荐使用docker-compose进行安装，在官网下载对应系统的安装包，配置完配置文件后运行目录里面的install.sh即可自动安装。
## 下载安装包
Harbor Releases仓库：[Harbor - Github](https://github.com/goharbor/harbor/releases)  
::github{repo="goharbor/harbor"}

offline为离线包，安装时自动解压压缩包里的docker镜像，online为在线包，在安装的时候会在线拉取docker镜像。这里建议选择offline离线包。
## 配置yml文件

配置之前，先为harbor签名一个ssl证书

安装OpenSSL
```bash
sudo apt update && sudo apt install -y openssl
```
创建配置文件
```bash
# 创建证书配置文件
vim harbor_cert.cnf
# 填入下面内容
```
```sql
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = CN          # 国家（按需修改）
ST = Beijing    # 省份
L = Beijing     # 城市
O = MyOrg       # 组织
OU = DevOps     # 部门
CN = harbor.example.com  # ← 替换为你的 Harbor 域名或 IP！

[v3_req]
keyUsage = keyEncipherment, dataEncipherment, digitalSignature
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = harbor.example.com   # ← 主域名
DNS.2 = *.example.com        # 可选：泛域名
IP.1 = 192.168.2.11          # ← 如果用 IP 访问，必须加上！
```
生成证书和私钥  
```bash
# 生成私钥 + 自签名证书（有效期 3650 天 ≈ 10 年）
openssl req -x509 \
  -newkey rsa:4096 \
  -sha256 \
  -days 3650 \
  -nodes \
  -keyout harbor.key \
  -out harbor.crt \
  -config harbor_cert.cnf \
  -extensions v3_req
```
客户端信任证书、Docker 客户端信任
```bash
sudo mkdir -p /etc/docker/certs.d/harbor.example.com/
sudo cp harbor.crt /etc/docker/certs.d/harbor.example.com/ca.crt
```
具体设置可以查看这篇文章，详细讲述了安装Harbor证书
[Docker 安装与卸载：最佳实践与常见问题解决](/docker-install)

***然后正式开始配置Yml文件***

将安装目录里面的harbor.yml.tmpl复制为harbor.yml
```bash
cp harbor.yml.tmpl harbor.yml
```
然后编辑文件

- hostname：域名称，填写上面的域名
- http.port：http端口名称
- https.port：https端口名称
- https.certificate：crt证书公钥配置
- https.private_key：key证书私钥配置
- harbor_admin_password：默认admin用户的配置，这里默认值是Harbor12345
- data_volume：持久化文件存储位置，这里默认值是/data、建议配置到存储空间大的目录

## 安装Harbor
```bash
# 执行安装命令
./install.sh
```
然后等待跑完命令，即可安装完成

如果要修改harbor.yml配置文件，可以运行下面命令`reload`
```bash
# 重新生成配置
./prepare
# 停止容器
docker-compose down
# 开启容器
docker-compose up -d
```
# 如何使用？
## docker命令
如果是内网搭建，并且是自定义hostname，请配置`hosts`
```sql
192.168.2.21 harbor.local
```
推荐快捷配置hosts工具：[SwitcheHosts](https://github.com/oldj/SwitchHosts/releases)
::github{repo="oldj/SwitchHosts"}

1、登录私有仓库
```bash
docker login <registry_url>
```
2、为镜像打标签
```bash
docker tag myapp:latest registry.example.com/myproject/myapp:v1.0.0
```
3、推送镜像
```bash
docker push registry.example.com/myproject/myapp:v1.0.0
```

# 其他
## 使用http
当然，你也可以使用http协议，需要在客户端做以下操作

docker配置文件daemon.json，或者docker desktop的配置里面添加如下内容
```bash
"insecure-registries": ["私有仓库HostName/IP"]
# 然后重启docker服务
systemctl restart docker

```
## 使用其他端口
80 443端口是非常宝贵的，你可以使用其他端口进行传输，只要在配置的时候配置了别的端口，就可以使用这个端口进行传输。

此时你的访问域名就变成了 hostname:port

最后可以使用nginx在把端口配置到80/443去

```sql
upstream harbor_backend {
    server 127.0.0.1:5443;  # 转发到 Harbor 的 HTTPS 端口
    keepalive 32;
}

server {
    listen 443 ssl http2;

    # 替换为你的实际域名或 IP
    server_name harbor.local 192.168.2.21;

    # 使用 Harbor 的证书
    ssl_certificate     /opt/harbor/harbor/crt/harbor.crt;
    ssl_certificate_key /opt/harbor/harbor/crt/harbor.key;

    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    client_max_body_size 0;  # 允许大镜像上传

    location / {
        proxy_pass https://harbor_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 必须关闭缓冲，否则大镜像 push/pull 会卡住
        proxy_buffering off;
        proxy_request_buffering off;

        # 超时设置（重要！）
        proxy_connect_timeout 90s;
        proxy_send_timeout 90s;
        proxy_read_timeout 90s;
    }
}

# 可选：HTTP 自动跳转 HTTPS
server {
    listen 80;
    server_name harbor.local 192.168.2.21;

    return 301 https://$host$request_uri;
}

```

## 使用其他私服仓库

可以使用如registry等轻量的私服仓库进行部署。
[registry | Docker Hub](https://hub.docker.com/_/registry)
::github{repo="distribution/distribution-library-image"}

::github{repo="Joxit/docker-registry-ui"}