((global) => {
	// 定义缓存键名
	const cacheTokenKey = "umami-token-cache";
	const cacheShareKey = "umami-share-cache";
	const cacheTTL = 3600_000; // 缓存有效期 1小时

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

	/**
	 * 获取 Umami 分享数据（包含 token 等信息）
	 * 使用全局 Promise 防止并发请求，并在 TTL 内复用缓存
	 * @param {string} baseUrl
	 * @param {string} shareId
	 * @returns {Promise<{token: string, ...}>}
	 */
	global.getUmamiShareData = (baseUrl, shareId) => {
		if (!global.__umamiSharePromise) {
			global.__umamiSharePromise = fetchShareData(baseUrl, shareId).catch(
				(err) => {
					// 失败时清除 Promise，允许重试
					delete global.__umamiSharePromise;
					throw err;
				},
			);
		}
		return global.__umamiSharePromise;
	};

	/**
	 * 清除 Umami 分享相关的缓存（LocalStorage 和 内存）
	 */
	global.clearUmamiShareCache = () => {
		localStorage.removeItem(cacheShareKey);
		delete global.__umamiSharePromise;
		// 如果有数据缓存，也一并清除，确保数据新鲜度
		if (global.__umamiDataCache) {
			global.__umamiDataCache.clear();
		}
	};

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

	/**
	 * 获取 Umami 登录 Token
	 * @param {string} baseUrl
	 * @param {string} apiKey
	 */
	global.getUmamiTokenData = (baseUrl, apiKey) => {
		if (!global.__umamiTokenPromise) {
			global.__umamiTokenPromise = fetchTokenData(baseUrl, apiKey).catch(
				(err) => {
					delete global.__umamiTokenPromise;
					throw err;
				},
			);
		}
		return global.__umamiTokenPromise;
	};

	/**
	 * 清除 Umami 登录 Token 缓存
	 */
	global.clearUmamiTokenCache = () => {
		localStorage.removeItem(cacheTokenKey);
		delete global.__umamiTokenPromise;
		if (global.__umamiDataCache) {
			global.__umamiDataCache.clear();
		}
	};


	// 初始化全局内存缓存
	// 使用内存缓存(Map)而不是 sessionStorage/localStorage
	// 这样在页面刷新(F5)时缓存会自动清空，符合"只有刷新的时候才再次获取"的需求
	// 而在 swup 单页跳转时，window 对象保留，缓存依然有效
	if (!global.__umamiDataCache) {
		global.__umamiDataCache = new Map();
	}

	/**
	 * 获取网站统计数据
	 * @param {string} baseUrl - Umami Cloud API基础URL
	 * @param {string} apiKey - API密钥 (或 ShareId)
	 * @param {string} websiteId - 网站ID
	 * @param {boolean} isRetry - 是否为重试请求 (内部使用)
	 * @returns {Promise<object>} 网站统计数据
	 */
	async function fetchWebsiteStats(baseUrl, apiKey, websiteId, isRetry = false) {
		const currentTimestamp = Date.now();
		// 缓存键：site-{websiteId}
		// 注意：这里没有包含 timestamp，意味着只要不刷新，就一直用第一次加载的数据
		// 如果需要定期更新，可以在 value 里存 timestamp 并检查 TTL
		const cacheKey = `site-${websiteId}`;

		// 如果不是重试，且有缓存，则直接返回缓存
		if (!isRetry && global.__umamiDataCache.has(cacheKey)) {
			return global.__umamiDataCache.get(cacheKey);
		}

		let res;

		// 判断是否为官方网站
		if(baseUrl === 'https://api.umami.is'){
			const statsUrl = `${baseUrl}/v1/websites/${websiteId}/stats?startAt=0&endAt=${currentTimestamp}`;

			res = await fetch(statsUrl, {
				headers: {
					"x-umami-api-key": apiKey,
				},
			});
		} else {
			// 自建实例，使用 Share Token 认证
			const {token} = await global.getUmamiShareData(
					baseUrl,
					apiKey,
				);
			const statsUrl = `${baseUrl}/api/websites/${websiteId}/stats?startAt=0&endAt=${currentTimestamp}`;

			res = await fetch(statsUrl, {
				headers: {
					// "x-umami-api-key": apiKey,
					// "Authorization": "Bearer "+token,
					"x-umami-share-token": token,
				},
			});
		}

		if (!res.ok) {
			// 如果是 401 未授权，且之前未重试过，则尝试清除缓存并重试一次
			if (res.status === 401 && !isRetry) {
				global.clearUmamiShareCache();
				// 递归调用自身进行重试
				return fetchWebsiteStats(baseUrl, apiKey, websiteId, true);
			}
			throw new Error("获取网站统计数据失败");
		}

		const stats = await res.json();

		// 写入内存缓存
		global.__umamiDataCache.set(cacheKey, stats);

		return stats;
	}

	/**
	 * 获取特定页面的统计数据
	 * @param {string} baseUrl - Umami Cloud API基础URL
	 * @param {string} apiKey - API密钥 (或 ShareId)
	 * @param {string} websiteId - 网站ID
	 * @param {string} urlPath - 页面路径
	 * @param {number} startAt - 开始时间戳
	 * @param {number} endAt - 结束时间戳
	 * @param {boolean} isRetry - 是否为重试请求 (内部使用)
	 * @returns {Promise<object>} 页面统计数据
	 */
	async function fetchPageStats(
		baseUrl,
		apiKey,
		websiteId,
		urlPath,
		startAt = 0,
		endAt = Date.now(),
		isRetry = false
	) {
		// 只有查询全时段数据（startAt=0）时才使用缓存
		const shouldCache = startAt === 0;
		const cacheKey = `page-${websiteId}-${urlPath}`;

		// 如果不是重试，且有缓存，则直接返回缓存
		if (!isRetry && shouldCache && global.__umamiDataCache.has(cacheKey)) {
			return global.__umamiDataCache.get(cacheKey);
		}
		
		let res;

		if(baseUrl === 'https://api.umami.is'){
			const statsUrl = `${baseUrl}/v1/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}&path=${encodeURIComponent(urlPath)}`;

			res = await fetch(statsUrl, {
				headers: {
					"x-umami-api-key": apiKey,
				},
			});
		} else {
			// 自建实例，使用 Share Token 认证
			const {token} = await global.getUmamiShareData(
				baseUrl,
				apiKey,
			);
			const statsUrl = `${baseUrl}/api/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}&path=${encodeURIComponent(urlPath)}`;

			res = await fetch(statsUrl, {
				headers: {
					// "x-umami-api-key": apiKey,
					// "Authorization": "Bearer "+token,
					"x-umami-share-token": token,
				},
			});
		}

		if (!res.ok) {
			// 如果是 401 未授权，且之前未重试过，则尝试清除缓存并重试一次
			if (res.status === 401 && !isRetry) {
				global.clearUmamiShareCache();
				// 递归调用自身进行重试
				return fetchPageStats(baseUrl, apiKey, websiteId, urlPath, startAt, endAt, true);
			}
			throw new Error("获取页面统计数据失败");
		}

		const stats = await res.json();

		if (shouldCache) {
			global.__umamiDataCache.set(cacheKey, stats);
		}

		return stats;
	}

	/**
	 * 获取 Umami 网站统计数据 (暴露给外部的接口)
	 * @param {string} baseUrl - Umami Cloud API基础URL
	 * @param {string} apiKey - API密钥
	 * @param {string} websiteId - 网站ID
	 * @returns {Promise<object>} 网站统计数据
	 */
	global.getUmamiWebsiteStats = async (baseUrl, apiKey, websiteId) => {
		try {
			return await fetchWebsiteStats(baseUrl, apiKey, websiteId);
		} catch (err) {
			throw new Error(`获取Umami统计数据失败: ${err.message}`);
		}
	};

	/**
	 * 获取特定页面的 Umami 统计数据 (暴露给外部的接口)
	 * @param {string} baseUrl - Umami Cloud API基础URL
	 * @param {string} apiKey - API密钥
	 * @param {string} websiteId - 网站ID
	 * @param {string} urlPath - 页面路径
	 * @param {number} startAt - 开始时间戳（可选）
	 * @param {number} endAt - 结束时间戳（可选）
	 * @returns {Promise<object>} 页面统计数据
	 */
	global.getUmamiPageStats = async (
		baseUrl,
		apiKey,
		websiteId,
		urlPath,
		startAt,
		endAt,
	) => {
		try {
			return await fetchPageStats(
				baseUrl,
				apiKey,
				websiteId,
				urlPath,
				startAt,
				endAt,
			);
		} catch (err) {
			throw new Error(`获取Umami页面统计数据失败: ${err.message}`);
		}
	};


})(window);
