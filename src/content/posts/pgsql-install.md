---
title: PostgreSQL安装与生产级配置
description: PostgreSQL作为企业级开源数据库的首选，凭借其出色的性能和稳定性深受开发者喜爱！
published: 2026-01-18
date: 2026-01-18
tags:
  - PostgreSQL
category: 教程
draft: false
pinned: false
# image: ./img/defalut-cover.png
---
# 安装
## Ubuntu 二进制

查询安装包
```bash
apt search postgresql 14
```

安装
```bash
apt -install postgresql-14
```

修改数据库密码
```bash
# 登录postgres用户
su - postgres
# 登录到数据库中
psql

# 或者直接以root用户登录
psql -U postgres

# 修改密码
alter user postgres with password 'xxxxxx';
```

## Docker-Compose
此种方式适合测试环境，可以在一台主机上运行多个Postgres容器
```yaml
services:
  pgsql:
    image: docker.xuanyuan.run/postgres:14
    container_name: postgres_hfcy
    restart: always

    command: >
      postgres
      -c config_file=/etc/postgresql/postgresql.conf
      -c hba_file=/etc/postgresql/pg_hba.conf

    environment:
      POSTGRES_PASSWORD: Passwd@2026 # 默认密码
      TZ: Asia/Shanghai

    ports:
      - "6432:5432"

    volumes:
      - /opt/pgsql/01/data:/var/lib/postgresql/data  # 数据目录
      - /opt/pgsql/01/config/postgresql.conf:/etc/postgresql/postgresql.conf:ro
      - /opt/pgsql/01/config/pg_hba.conf:/etc/postgresql/pg_hba.conf:ro

    networks:
      - net

networks:
  net:
    name: app-net
    driver: bridge
    external: true
```
# 配置PostgreSQL
## 配置远程访问
PostgreSQL 通过一个名为**角色**的概念支持多种客户端身份验证方法。默认的身份验证方法是**身份验证**，它将 Postgres 角色与 Unix 系统帐户关联起来。所有受支持的身份验证方法有：

- **Ident** – 仅支持通过 TCP/IP 连接。它通过可选的用户名映射获取客户端系统用户名。
- **密码** – 角色使用密码进行连接。
- **Peer** – 与 ident 类似，但仅支持本地连接。
- **信任** – 只要满足 _**pg_hba.conf**_ 中定义的条件，就允许角色进行连接。

为了远程访问我们的数据库服务器实例，我们应该在文件 **/etc/postgresql/14/main/pg_hba.conf** 中进行更改。

通过运行以下命令允许在 PostgreSQL 服务器上进行密码身份验证。  
```bash
sudo sed -i '/^host/s/ident/md5/' /etc/postgresql/14/main/pg_hba.conf
```
接下来是将识别方法从对等更改为***信任***，如下所示。
```bash
sudo sed -i '/^local/s/peer/trust/' /etc/postgresql/14/main/pg_hba.conf
```
要允许从任何地方访问实例，请编辑命令如下：
```bash
sudo vim /etc/postgresql/14/main/pg_hba.conf
```
在该文件中，添加以下行。
```sql
# IPv4 local connections:  
host   all             all             0.0.0.0/0               md5  
```
现在，通过如下编辑 **/etc/postgresql/14/main/postgresql.conf** 中的 conf 文件来确保服务正在侦听 。
```bash
sudo vim /etc/postgresql/14/main/postgresql.conf
```
在文件中，取消注释并编辑该行，如下所示。
```sql
#------------------------------------------------------------------------------  
# CONNECTIONS AND AUTHENTICATION  
#-----------------------------------------------------------------------------  
.......  
listen_addresses='*'
```
现在重新启动并启用 PostgreSQL 以使更改生效。
```bash
sudo systemctl restart postgresql  
sudo systemctl enable postgresql
```
## 数据目录迁移/修改
```bash
# 停止PostgreSQL  
systemctl stop postgresql  
  
# 拷贝原来的数据路径到新的路径下  
cp -rf /var/lib/postgresql/14/main /opt/postgresql/  
  
# 设置用户和权限  
chown -R postgres:postgres /opt/postgresql/  
chmod 700 /opt/postgresql/  
  
# 将配置文件的数据存储路径改成新的  
vim /etc/postgresql/14/main/postgresql.conf  
data_directory='/app/postgresql/'  
  
# 再启动即可  
systemctl start postgresql  
  
# 查看当前数据目录  
psql -U postgres  
  
postgres=# show data_directory;  
data_directory  
-----------------------------  
/var/lib/postgresql/14/main  
(1 row)
```
## 配置外部数据库
因为postgreSQL不能跨库查询，所以我们可以使用外部数据包装器（Foreign Data Wrapper，简称 FDW）访问的外部数据源。
**1）安装扩展**

```sql
-- 在本地数据库执行  
CREATE EXTENSION IF NOT EXISTS postgres_fdw;
```
**2）创建远程服务器连接**
```sql
-- 创建服务器配置  
CREATE SERVER remote_server_hf_cy -- 外部服务器名称  
FOREIGN DATA WRAPPER postgres_fdw  
OPTIONS (  
host '172.172.254.200', -- 远程IP  
dbname 'hf_cy', -- 远程数据库名  
port '6432' -- 远程端口  
);
```
**3）创建用户映射**
```sql
-- 设置认证信息  
CREATE USER MAPPING FOR postgres  
SERVER remote_server_hf_cy -- 外部服务器名称  
OPTIONS (  
user 'postgres', -- 远程数据库用户名  
password 'huanfaCypatroni' -- 远程数据库密码  
);
```
**4）导入远程表**  
方式1：导入单个表
```sql
-- 导入指定表到本地public schema  
IMPORT FOREIGN SCHEMA public  
LIMIT TO (hf_cy_approval_role) -- 只导入这个表  
FROM SERVER remote_server_hf_cy -- 外部服务器名称  
INTO public;
```
方式2：导入多个表
```sql
-- 导入多个表  
IMPORT FOREIGN SCHEMA public  
LIMIT TO (table1, table2, table3) -- 逗号分隔表名  
FROM SERVER remote_server_hf_cy -- 外部服务器名称  
INTO public;
```
方式3：导入整个schema（慎用）
```sql
-- 导入整个public schema的所有表  
IMPORT FOREIGN SCHEMA public  
FROM SERVER remote_server_hf_cy -- 外部服务器名称  
INTO public;
```
**5）使用导入的表**  
和正常的表一样使用  
**6）常用管理命令**  
查看配置
```sql
-- 查看所有外部服务器  
SELECT * FROM pg_foreign_server;  
  
-- 查看导入的外部表  
SELECT * FROM information_schema.foreign_tables;  
  
-- 查看表结构  
\d hf_cy_approval_role;
```
修改配置
```sql
-- 修改服务器选项  
ALTER SERVER remote_server OPTIONS (  
ADD fetch_size '50000' -- 增加每次获取的行数  
);  
  
-- 修改参数  
ALTER SERVER basic_db_server  
OPTIONS (SET host '192.168.2.21', SET port '5432', SET dbname 'hf_cy_basic_biz');  
  
  
-- 修改密码  
ALTER USER MAPPING FOR CURRENT_USER  
SERVER basic_db_server  
OPTIONS (  
SET password 'Yanfa@DB'  
);
```
删除配置
```sql
-- 删除单个外部表  
DROP FOREIGN TABLE hf_cy_approval_role;  
  
-- 删除用户映射  
DROP USER MAPPING FOR postgres SERVER remote_server;  
  
-- 删除服务器  
DROP SERVER remote_server CASCADE;  
  
-- 删除扩展  
DROP EXTENSION postgres_fdw;
```
# 备份与恢复
## 备份与恢复整个数据库
1）使用超级用户（通常是 postgres）导出整个集群
```bash
sudo -u postgres pg_dumpall -h localhost -p 5432 -v > /tmp/pg_full_backup.sql
```
2）将备份文件拷贝到目标服务器
```bash
rsync -avz --progress /tmp/pg_full_backup.sql huanfa@192.168.2.21:/tmp/
```
3）恢复数据库
```bash
# 实体PostgreSQL  
sudo -u postgres psql -f /tmp/pg_full_backup.sql  
  
# 容器PostgreSQL  
## 复制进容器  
docker cp /tmp/pg_full_backup.sql pg-migrated:/tmp/  
## 执行恢复（使用 psql）  
docker exec -i pg-migrated psql -U postgres -f /tmp/pg_full_backup.sql
```
## 备份与恢复一个数据表
1）备份单个表
```bash
# 使用超级用户（postgres）备份指定表  
sudo -u postgres pg_dump -h localhost -p 5432 -d your_database_name -t your_table_name -v > /tmp/table_backup.sql  
  
# 示例：备份 mydb 数据库中的 users 表  
#sudo -u postgres pg_dump -h localhost -p 5432 -d mydb -t users -v > /tmp/users_backup.sql  
  
# 可选：备份时包含删除和创建语句（便于重复恢复）  
#sudo -u postgres pg_dump -h localhost -p 5432 -d mydb -t users --clean --if-exists -v > /tmp/users_backup_clean.sql
```
2）将备份文件拷贝到目标服务器
```bash
rsync -avz --progress /tmp/users_backup.sql huanfa@192.168.2.21:/tmp/  
  
# 如果需要同时备份多个表  
rsync -avz --progress /tmp/*_backup.sql huanfa@192.168.2.21:/tmp/
```
3）恢复单个表到目标数据库  
如果表已存在，需要先将表删除或者改名
```
# 实体PostgreSQL  
sudo -u postgres psql -d target_database -f /tmp/users_backup.sql  
## 如果表已存在，需要先将表删除或者改名  
  
# 容器PostgreSQL  
## 复制进容器  
docker cp /tmp/users_backup.sql pg-migrated:/tmp/  
## 执行恢复（使用 psql）  
docker exec -i pg-migrated psql -U postgres -d target_database -f /tmp/users_backup.sql
```


