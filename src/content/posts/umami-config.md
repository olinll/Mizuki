---
title: 自建umami的相关配置
description: 因为官方的API请求时间太久，所以自建了一个umami

published: 2026-01-24
date: 2026-01-24
tags: [Umami]
category: '教程'
draft: false
pinned: false
image: './img/defalut-cover.png'
---

# 写在前面

Umami 是一个开源的分析工具，它可以帮助你了解你的网站的流量来源、用户行为、页面访问等信息。

Umami官方地址 [umami](https://umami.is)

Umami官方文档: [Umami - Doc](https://umami.is/docs)

Umami官方API: [Umami - API](https://umami.is/docs/api)

# 正文

这里需要注意一点，使用官方的api 只需要申请一个`API KEY` 就可以调用api了，如果使用自建服务器，需要先获取token，再进行调用。

## 认证

**POST /api/auth/login**

首先你需要获得一个令牌，才能发起 API 请求。你需要向端点发送以下请求：POST/api/auth/login

```json
{
  "username": "admin",
  "password": "umami"
}
```

如果成功，你应该会收到如下回复：

```json
{
  "token": "eyTMjU2IiwiY...4Q0JDLUhWxnIjoiUE_A",
  "user": {
    "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "username": "admin",
    "role": "admin",
    "createdAt": "2000-00-00T00:00:00.000Z",
    "isAdmin": true
  }
}
```

保存标记值，并发送一个包含所有数据请求的头部，地址为 。你的请求头应该是这样的：AuthorizationBearer <token>

```sql
Authorization: Bearer eyTMjU2IiwiY...4Q0JDLUhWxnIjoiUE_A
```

每次需要权限的 API 调用都必须有授权令牌。



## 实现认证方式


```js

/**
 * 获取登录 Token (通过用户名/密码)
 * @param {string} baseUrl 
 * @param {string} apiKey - 此处实际为 password
 */
async function fetchTokenData(baseUrl, apiKey) {
	const cached = localStorage.getItem(cacheTokenKey);
	if (cached) {
		try {
			const parsed = JSON.parse(cached);
			if (Date.now() - parsed.timestamp < cacheTTL) {
				return parsed.value;
			}
		} catch {
			localStorage.removeItem(cacheTokenKey);
		}
	}
	const res = await fetch(`${baseUrl}/api/auth/login`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			username: "admin",
			password: apiKey,
		}),
	});
	if (!res.ok) {
		throw new Error("获取 Umami 登录信息失败");
	}
	const data = await res.json();
	localStorage.setItem(
		cacheTokenKey,
		JSON.stringify({ timestamp: Date.now(), value: data.token }),
	);
	return data.token;
}

```
 :::important
使用这种方式会在浏览器中暴露请求的用户名和密码，建议创建一个单独的用户，只用于获取统计数据。
:::

## 邪修玩法

我们可以采用share key 认证方式，这样就不会暴露用户名和密码了。

原理：在umami网站中，我们可以将统计数据分享出去，使用户可以免登录查看统计数据。

分享页面请求了一下 `/api/share/{shareId}` 接口，返回了一个token，并且后面所有对api的请求都会带一个header `x-umami-share-token`，并且值和之前返回的token一致。

我们可以直接将上面的认证方法替换为`x-umami-share-token`，不需要使用用户名密码了。

```js
/**
 * 获取分享 Token 数据
 * @param {string} baseUrl - Umami 实例地址
 * @param {string} shareId - 分享 ID
 */
async function fetchShareData(baseUrl, shareId) {
	const cached = localStorage.getItem(cacheShareKey);
	if (cached) {
		try {
			const parsed = JSON.parse(cached);
			if (Date.now() - parsed.timestamp < cacheTTL) {
				return parsed.value;
			}
		} catch {
			localStorage.removeItem(cacheShareKey);
		}
	}
	// 请求分享 API
	const res = await fetch(`${baseUrl}/api/share/${shareId}`);
	if (!res.ok) {
		throw new Error("获取 Umami 分享信息失败");
	}
	const data = await res.json();
	
	// 写入 LocalStorage 缓存
	localStorage.setItem(
		cacheShareKey,
		JSON.stringify({ timestamp: Date.now(), value: data }),
	);
	return data;
}

```

