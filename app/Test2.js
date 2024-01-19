const MetaApi = require('metaapi.cloud-sdk').default;

class MetaApiManager {
  constructor(token, accountId) {
    this.token = token;
    this.accountId = accountId;
    this.api = new MetaApi(token);
  }

  async connectToApi() {
    const account = await this.api.metatraderAccountApi.getAccount(this.accountId);
    const initialState = account.state;
    const deployedStates = ['DEPLOYING', 'DEPLOYED'];

    if (!deployedStates.includes(initialState)) {
      console.log('Deploying account');
      await account.deploy();
    }

    console.log('Waiting for API server to connect to broker (may take a couple of minutes)');
    await account.waitConnected();

    this.connection = account.getStreamingConnection();
    await this.connection.connect();
    console.log('API Connected');
  }

  async waitSynchronized() {
    console.log('Waiting for SDK to synchronize to terminal state (may take some time depending on your history size)');
    await this.connection.waitSynchronized();
    console.log('SDK Synchronized');
  }

  getTerminalState() {
    return this.connection.terminalState;
  }

  async getHistoricalCandles(index, timeframe) {
    const currentDateTime = new Date();
    console.log(`Getting candles for ${index} and ${timeframe} at ${currentDateTime.toISOString()}`);
    return await this.api.getHistoricalCandles(index, timeframe, currentDateTime, 3);
  }

  async subscribeToMarketData(symbol) {
    await this.connection.subscribeToMarketData(symbol);
  }
}

function calculateInitialDelay() {
  const now = new Date();
  const minutesUntilNextInterval = 3 - (now.getMinutes() % 1);
  const secondsUntilNextInterval = (minutesUntilNextInterval * 60) - now.getSeconds();
  return secondsUntilNextInterval * 1000; // Convert seconds to milliseconds
}

function getCandlesPeriodically(manager, index, timeframe) {
    const calculateInitialDelay = () => {
        const now = new Date();
        const minutesUntilNextInterval = 3 - (now.getMinutes() % 1);
        const secondsUntilNextInterval = (minutesUntilNextInterval * 60) - now.getSeconds();
        return secondsUntilNextInterval * 1000; // Convert seconds to milliseconds
    };

    const getCandles = async () => {
        // Your logic for fetching candles goes here
        console.log('Fetching candles at', new Date().toISOString());
        get3MinCandles();
    };

    const initialDelay = calculateInitialDelay();

    // Execute the first getCandles call after the initial delay
    setTimeout(() => {
        getCandles();

        // Set interval to fetch candles every 3 minutes
        const candlesInterval = setInterval(getCandles, 3 * 60 * 1000); // 3 minutes in milliseconds
    }, initialDelay);
}

async function get3MinCandles(manager, index, timeframe) {
    const currentDateTime = new Date();
    console.log(`Getting candles for ${currentDateTime.toISOString()}`);
  
    // Call your getHistoricalCandles method here
    const candles = await manager.account.getHistoricalCandles(index, timeframe, currentDateTime, 3);
  
    console.log('Historical Candles received:', candles);
  
    console.log(`Checking for the valid conditions for the timestamp ${currentDateTime.toISOString()}`);
    const validCandle = isCandleConditionSatisfied(candles[1], 5, 15);
    console.log('Is Valid Candle?', validCandle);
  
    if (validCandle) {
      console.log('Checking tick data for EURUSD: ');
  
      const calculateInitialDelay = () => {
          const now = new Date();
          const secondsUntilNextInterval = 2.5 - (now.getSeconds() % 2.5);
          return secondsUntilNextInterval * 1000; // Convert seconds to milliseconds
      };
  
      const checkTickData = async () => {
          const currentTickDateTime = new Date(); // Get current time for each tick
          currentTickDateTime.setSeconds(currentTickDateTime.getSeconds() - 3); // Subtract 2 seconds
          console.log('Checking tick data for:', currentTickDateTime);


  
          try {
              // Call your getHistoricalTicks method here
              const latestTicks = await manager.account.getHistoricalTicks(index, currentTickDateTime, 1, 2);
              console.log('Latest Tick:', latestTicks);
  
              if (latestTicks.length > 0) {
                  // Place market buy order with target price as candle length and stop loss as candle low
  
                  console.log('Placing Market Order:');
                  console.log('Open positions length: ', terminalState.positions.length);
  
                  if (isBullish(candles[1]) && terminalState.positions.length <= 0) {
                      const targetPrice = candles[1].high + (candles[1].high - candles[1].low);
                      const stopLoss = candles[1].low;
                      submitMarketBuyOrder(index, 0.1, targetPrice, stopLoss);
                      clearInterval(tickInterval);
                  } else if (isBearish(candles[1]) && terminalState.positions.length <= 0) {
                      const targetPrice = candles[1].low - (candles[1].high - candles[1].low);
                      const stopLoss = candles[1].high;
                      submitMarketSellOrder(index, 0.1, targetPrice, stopLoss);
                      clearInterval(tickInterval);
                  }
  
                  // Stop further checking tick data
                  //clearInterval(tickInterval);
              }
  
              // Stop after 5 minutes
              if (currentTickDateTime - currentDateTime >= 150000) {
                  console.log('Stopped checking tick data after 5 minutes.');
                  clearInterval(tickInterval);
              }
          } catch (error) {
              console.error('Error checking tick data:', error);
              clearInterval(tickInterval);
          }
      };
  
      // Calculate the initial delay based on the current time
      const initialDelay = calculateInitialDelay();
  
      // Execute the first tick check after the initial delay
      setTimeout(() => {
          checkTickData();
  
          // Set interval to check tick data every 2.5 seconds
          const tickInterval = setInterval(checkTickData, 2500); // 2.5 seconds in milliseconds
      }, initialDelay);
  }
  
  
  
  
    // Process the retrieved candles as needed
    console.log('Candles:', candles);
  }


async function main() {
  try {
    let token = process.env.TOKEN || 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI5YmVlYmE4NDRiYzYxYzdkMTdlYTM5MzBiMTc5MWU0ZCIsInBlcm1pc3Npb25zIjpbXSwidG9rZW5JZCI6IjIwMjEwMjEzIiwiaW1wZXJzb25hdGVkIjpmYWxzZSwicmVhbFVzZXJJZCI6IjliZWViYTg0NGJjNjFjN2QxN2VhMzkzMGIxNzkxZTRkIiwiaWF0IjoxNzAzNjc0MDAxfQ.KfSVhmGk31fDmYVN1Nfxk9bf9iQHbgm1Sl6tSjD4qvr0Eil7ExeHIa84nSOF7NNcspbY9SwPtU9jjank4bHhJV7w3DRbS4lpKCmcBvdOJxNROTIZ3iGtrMRqcGw5KRuij9_kkGerB0zFx2EAlXyF_cHiquIEAdfE88PgSCOeNHUAawuGl_6nZBPsNEI7PJ2Th7ECl8bXzTGayrdXAdVCPnfdBm4KPGQ7i4M9YhyFxT-zCM0iPfoY3hvEMEmRQ-aRrPljuC5aQacD7SO5b-lucE2lJvc--ril81xJj26gSSBPnX2S60HlGJ0YF0Qg0-9fmse34K7GrDDHTb0iFk8oKQOGvUgFgfdDMqBZgDKusVdQrtTg4gsuFvqFYIfERy0Gi5rskpnOqnQsLPecJyLDL57yoeNNGY2P4EohJYI9Ul7MCTi68aoO1EfOplAt3ojkcZVCIZ0AUh06k-pHjmUqOMr-v5SWvbw6mNKOkZLvvo6AULg9tIhQ-iH3n3TGLs3q_UZhKbrOGNwhsnzJgxB_3LKkUbtMjCn9Pzy9XApN96anuH40lBzTPHTRY12ulzBnbVFUph3nRFg5l1gWT7l2ET_D46KwW_Wvmbsx6TphNCWv6zcH-VRLrqyQ80n1MlB6RDOBVmbW-ved7_XOqCYWkeS1fo-DyhEizeYhN7wZzhk';
    let accountId = process.env.ACCOUNT_ID || '159ef489-9d6d-4faf-b269-cc4f6bac2711';
    const metaApiManager = new MetaApiManager(token, accountId);

    await metaApiManager.connectToApi();
    await metaApiManager.waitSynchronized();

    const indexes = ['EURUSD', 'GBPUSD'];
    const timeframes = ['1m', '5m', '15m'];

    for (const index of indexes) {
      for (const timeframe of timeframes) {
        await getCandlesPeriodically(metaApiManager, index, timeframe);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

main();
