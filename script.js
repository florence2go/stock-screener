// 初始化圖表
const ctx = document.getElementById('stockChart').getContext('2d');
const stockChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [], // 日期
        datasets: [{
            label: '股價',
            data: [], // 價格數據
            borderColor: '#007BFF',
            fill: false
        }]
    },
    options: {
        scales: {
            x: { title: { display: true, text: '日期' } },
            y: { title: { display: true, text: '價格 (USD)' } }
        }
    }
});

// 篩選股票函數
async function screenStock() {
    const symbol = document.getElementById('stockSymbol').value.toUpperCase();
    if (!symbol) {
        alert('請輸入股票代碼！');
        return;
    }

    // Alpha Vantage API 設定
    const apiKey = '2Z59WWMGOTLVLQR0'; // 替換成你註冊的 API Key
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}&outputsize=full`; // 獲取完整數據

    try {
        const response = await fetch(url);
        const data = await response.json();
        const timeSeries = data['Time Series (Daily)'];

        if (!timeSeries) {
            alert('無法獲取數據，請檢查股票代碼或 API Key');
            return;
        }

        // 提取所有數據
        const dates = Object.keys(timeSeries).reverse(); // 從舊到新
        const prices = dates.map(date => parseFloat(timeSeries[date]['4. close']));

        // 計算移動平均線 (SMA)
        const calculateSMA = (period) => {
            return prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
        };
        const sma50 = calculateSMA(50);
        const sma150 = calculateSMA(150);
        const sma200 = calculateSMA(200);

        // 計算 52 週高低點 (約 252 個交易日)
        const high52w = Math.max(...prices.slice(0, 252));
        const low52w = Math.min(...prices.slice(0, 252));
        const currentPrice = prices[prices.length - 1];

        // Minervini 趨勢模板條件
        const isTrending = (
            currentPrice > sma50 &&
            currentPrice > sma150 &&
            currentPrice > sma200 &&
            sma50 > sma150 &&
            sma150 > sma200 &&
            currentPrice >= low52w * 1.3 && // 高於 52 週低點 30%
            currentPrice <= high52w * 1.25   // 在 52 週高點 25% 內
        );

        // 200 日均線上升 (簡化檢查前 21 天與現在的差異)
        const sma200_1monthAgo = calculateSMA(200 - 21);
        const isSma200Rising = sma200 > sma200_1monthAgo;

        // 更新圖表
        const recentDates = dates.slice(-50); // 顯示最近 50 天
        const recentPrices = prices.slice(-50);
        stockChart.data.labels = recentDates;
        stockChart.data.datasets[0].data = recentPrices;
        stockChart.data.datasets[0].label = `${symbol} 股價`;
        stockChart.update();

        // 顯示篩選結果
        if (isTrending && isSma200Rising) {
            alert(`${symbol} 符合 Minervini 趨勢模板！\n價格: ${currentPrice.toFixed(2)} USD`);
        } else {
            alert(`${symbol} 不完全符合趨勢模板，檢查條件：\n- 價格 > SMA: ${currentPrice > sma200}\n- 200 日均線上升: ${isSma200Rising}`);
        }

    } catch (error) {
        console.error('錯誤：', error);
        alert('獲取數據時出錯，請稍後再試！');
    }
}