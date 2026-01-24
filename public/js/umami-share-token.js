((global) => {
	const cacheKey = "umami-token-cache";
	const cacheTTL = 3600_000; // 1h




	async function fetchTokenData(baseUrl, apiKey) {
		const cached = localStorage.getItem(cacheKey);
		if (cached) {
			try {
				const parsed = JSON.parse(cached);
				if (Date.now() - parsed.timestamp < cacheTTL) {
					return parsed.value;
				}
			} catch {
				localStorage.removeItem(cacheKey);
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
			throw new Error("获取 Umami 分享信息失败");
		}
		const data = await res.json();
		localStorage.setItem(
			cacheKey,
			JSON.stringify({ timestamp: Date.now(), value: data.token }),
		);
		return data.token;
	}

	/**
	 * 获取 Umami 分享数据（websiteId、token）
	 * 在缓存 TTL 内复用；并用全局 Promise 避免并发请求
	 * @param {string} baseUrl
	 * @param {string} apiKey
	 * @returns {Promise<{websiteId: string, token: string}>}
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

	global.clearUmamiTokenCache = () => {
		localStorage.removeItem(cacheKey);
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
	 * @param {string} apiKey - API密钥
	 * @param {string} websiteId - 网站ID
	 * @returns {Promise<object>} 网站统计数据
	 */
	async function fetchWebsiteStats(baseUrl, apiKey, websiteId) {
		const currentTimestamp = Date.now();
		// 缓存键：site-{websiteId}
		// 注意：这里没有包含 timestamp，意味着只要不刷新，就一直用第一次加载的数据
		// 如果需要定期更新，可以在 value 里存 timestamp 并检查 TTL
		const cacheKey = `site-${websiteId}`;

		if (global.__umamiDataCache.has(cacheKey)) {
			return global.__umamiDataCache.get(cacheKey);
		}

		let res;

		//判断是否为官方网站
		if(baseUrl==='https://api.umami.is'){
			const statsUrl = `${baseUrl}/v1/websites/${websiteId}/stats?startAt=0&endAt=${currentTimestamp}`;

			res = await fetch(statsUrl, {
				headers: {
					"x-umami-api-key": apiKey,
				},
			});
		}else{

		const token = await global.getUmamiTokenData(
				baseUrl,
				apiKey,
			);
		const statsUrl = `${baseUrl}/api/websites/${websiteId}/stats?startAt=0&endAt=${currentTimestamp}`;

		res = await fetch(statsUrl, {
			headers: {
				// "x-umami-api-key": apiKey,
				"Authorization": "Bearer "+token,
			},
		});
		}


		

		if (!res.ok) {
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
	 * @param {string} apiKey - API密钥
	 * @param {string} websiteId - 网站ID
	 * @param {string} urlPath - 页面路径
	 * @param {number} startAt - 开始时间戳
	 * @param {number} endAt - 结束时间戳
	 * @returns {Promise<object>} 页面统计数据
	 */
	async function fetchPageStats(
		baseUrl,
		apiKey,
		websiteId,
		urlPath,
		startAt = 0,
		endAt = Date.now(),
	) {
		// 只有查询全时段数据（startAt=0）时才使用缓存
		const shouldCache = startAt === 0;
		const cacheKey = `page-${websiteId}-${urlPath}`;

		if (shouldCache && global.__umamiDataCache.has(cacheKey)) {
			return global.__umamiDataCache.get(cacheKey);
		}

		
		let res;

		if(baseUrl==='https://api.umami.is'){

		const statsUrl = `${baseUrl}/v1/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}&path=${encodeURIComponent(urlPath)}`;

		res = await fetch(statsUrl, {
			headers: {
				"x-umami-api-key": apiKey,
			},
		});


		}else{
		const token = await global.getUmamiTokenData(
			baseUrl,
			apiKey,
		);
		const statsUrl = `${baseUrl}/api/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}&path=${encodeURIComponent(urlPath)}`;

		res = await fetch(statsUrl, {
			headers: {
				// "x-umami-api-key": apiKey,
				"Authorization": "Bearer "+token,
			},
		});


		}




		

		if (!res.ok) {
			throw new Error("获取页面统计数据失败");
		}

		const stats = await res.json();

		if (shouldCache) {
			global.__umamiDataCache.set(cacheKey, stats);
		}

		return stats;
	}

	/**
	 * 获取 Umami 网站统计数据
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
	 * 获取特定页面的 Umami 统计数据
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
