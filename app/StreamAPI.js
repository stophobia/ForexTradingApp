//require('dotenv').config({path:'/Users/sidd/VSCode Projects/.env-production'})

const path = require('path'); // Correct import for the path module
require('dotenv').config({
  path: path.resolve(__dirname, '.env'), // Adjust the path based on your .env file location
});

// Add this line to check if .env is loaded
console.log('Environment variables:', process.env);
let tickInterval;

const express = require('express');
const MetaApi = require('metaapi.cloud-sdk').default;

const app = express();
const port = process.env.PORT || 3000;

let token = process.env.TOKEN;
let accountId = process.env.ACCOUNT_ID;

if (!token || !accountId) {
  console.error('Missing required environment variables. Make sure to set TOKEN and ACCOUNT_ID.');
  process.exit(1);
}

const api = new MetaApi(token);

async function testMetaApiSynchronization() {
  try {
    const account = await api.metatraderAccountApi.getAccount(accountId);
    const initialState = account.state;
    const deployedStates = ['DEPLOYING', 'DEPLOYED'];

    if(!deployedStates.includes(initialState)) {
      // wait until account is deployed and connected to broker
      console.log('Deploying account');
      await account.deploy();
    }
    console.log('Waiting for API server to connect to broker (may take couple of minutes)');
    await account.waitConnected();

    // connect to MetaApi API
    let connection = account.getStreamingConnection();
    await connection.connect();


        // wait until terminal state synchronized to the local state
    console.log('Waiting for SDK to synchronize to terminal state (may take some time depending on your history size)');
    await connection.waitSynchronized();

    // access local copy of terminal state
    console.log('Testing terminal state access');
    let terminalState = connection.terminalState;
    console.log('connected:', terminalState.connected);
    console.log('open Positions:', terminalState.positions);
    console.log('connected to broker:', terminalState.connectedToBroker);
    console.log('account information:', terminalState.accountInformation);
    // console.log('positions:', terminalState.positions);
    console.log('orders:', terminalState.orders);
    //console.log('specifications:', terminalState.specifications);
    // console.log('EURUSDm specification:', terminalState.specification('EURUSD'));
    await connection.subscribeToMarketData('EURUSD');
    console.log('EURUSDm price:', terminalState.price('EURUSD'));
    

    async function get3MinCandles() {
      const currentDateTime = new Date();
      console.log(`Getting candles for ${currentDateTime.toISOString()}`);
    
      // Call your getHistoricalCandles method here
      const candles = await account.getHistoricalCandles('EURUSD', '3m', currentDateTime, 3);
    
      console.log('Historical Candles received:', candles);
    
      console.log(`Checking for the valid conditions for the timestamp ${currentDateTime.toISOString()}`);
      const validCandle = isCandleConditionSatisfied(candles[1], 5, 10);
      console.log('Is Valid Candle?', validCandle);
    
      if (validCandle) {
        console.log('Checking tick data for EURUSD: ');
    
        const calculateInitialDelay = () => {
          const now = new Date();
          const secondsUntilNextInterval = 2.5 - (now.getSeconds() % 2.5);
          return secondsUntilNextInterval * 1000; // Convert seconds to milliseconds
        };
    
        let tickInterval; // Declare tickInterval outside the setTimeout scope
    
        const checkTickData = async () => {
          const currentTickDateTime = new Date(); // Get current time for each tick
          currentTickDateTime.setSeconds(currentTickDateTime.getSeconds() - 3); // Subtract 2 seconds
          console.log('Checking tick data for:', currentTickDateTime);
    
          try {
            // Call your getHistoricalTicks method here
            const latestTicks = await account.getHistoricalTicks('EURUSD', currentTickDateTime, 1, 2);
            console.log('Latest Tick:', latestTicks);
    
            if (latestTicks.length > 0) {
              // Place market buy order with target price as candle length and stop loss as candle low
              console.log('Placing Market Order:');
              console.log('Open positions length: ', terminalState.positions.length);
    
              if (isBullish(candles[1]) && terminalState.positions.length <= 0) {
                const targetPrice = candles[1].high + (candles[1].high - candles[1].low);
                const stopLoss = candles[1].low;
                submitMarketBuyOrder('EURUSD', 0.1, targetPrice, stopLoss);
                clearInterval(tickInterval);
              } else if (isBearish(candles[1]) && terminalState.positions.length <= 0) {
                const targetPrice = candles[1].low - (candles[1].high - candles[1].low);
                const stopLoss = candles[1].high;
                submitMarketSellOrder('EURUSD', 0.1, targetPrice, stopLoss);
                clearInterval(tickInterval);
              }
    
              // Stop further checking tick data
              clearInterval(tickInterval);
            }
    
            // Stop after 5 minutes
            if (currentTickDateTime - currentDateTime >= 50000) {
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
          tickInterval = setInterval(checkTickData, 2500); // 2.5 seconds in milliseconds
        }, initialDelay);
      }
    }
    
    
    // Example usage:
   
    
    
    // Start the process

    function getCandlesPeriodically() {
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
  
  // Call the method to start the process
  getCandlesPeriodically();
  

    

    //trade
    async function submitMarketBuyOrder(symbol, volume, target, stopLoss) {
      console.log(`Submitting Market order for ${symbol}`);
  
      try {
        const trailingStopLoss = {
          distance: {
              distance: 10,
          },
      };
      
      const opt  = {
          trailingStopLoss
          
      };
        
  
          const options = {
              trailingStopLoss, // Include trailing stop loss configuration
              comment: 'comm',
              clientId: `TE_${symbol}_${Date.now()}`
          };
  
          const result = await connection.createMarketBuyOrder(symbol, volume, stopLoss, target, 2.0, opt);
          console.log('Trade successful, result code is ' + result.stringCode);
      } catch (err) {
          console.log('Trade failed with result code ' + err.stringCode);
      }
  }
  
  

    async function submitMarketSellOrder(symbol, volume, target, stopLoss) {
      console.log(`Submitting Market order for ${symbol}`);
  
      try {
          const trailingStopLoss = {
              distance: 10, // Set your desired distance for trailing stop loss
          };

          const opt  = {
              trailingStopLoss
              
          };


  
          const options = {
              trailingStopLoss, // Include trailing stop loss configuration
              comment: 'comm',
              clientId: `TE_${symbol}_${Date.now()}`
          };
  
          const result = await connection.createMarketSellOrder(symbol, volume, stopLoss, target, 2.0, opt);
          console.log('Trade successful, result code is ' + result.stringCode);
      } catch (err) {
          console.log('Trade failed with result code ' + err.stringCode);
      }
  }
  
    

    
    function isCandleConditionSatisfied(candle, wickThreshold, bodySizeThreshold) {
      console.log('candle high:', candle.brokerTime.toISOString);
      console.log('candle high:', candle.high * 100000);
      console.log('candle open:', candle.open * 100000);
      console.log('candle close:', candle.close * 100000);
      console.log('candle low:', candle.low * 100000);
  
      let candleHigh = (candle.high) * 100000;
      let candleLow = (candle.low) * 100000;
      let candleClose = (candle.close) * 100000;
      let candleOpen = (candle.open) * 100000;
  
      const isBullish = candleClose > candleOpen;
  
      const wickUp = isBullish ? (candleHigh - candleClose) : (candleHigh - candleOpen);
      const wickDown = isBullish ? (candleOpen - candleLow) : (candleClose - candleLow);
      const bodySize = Math.abs(candleClose - candleOpen);
  
      console.log('wickUp:', wickUp);
      console.log('wickDown:', wickDown);
      console.log('bodySize:', bodySize);
  
      const condition =
          (wickUp <= wickThreshold && wickDown <= wickThreshold) ||
          (wickUp === 0 && wickDown <= wickThreshold) ||
          (wickDown === 0 && wickUp <= wickThreshold);
  
      return condition && bodySize >= bodySizeThreshold;
  }

  function isCandleConditionSatisfiedBTC(candle, wickThreshold, bodySizeThreshold) {
    console.log('candle high:', candle.high );
    console.log('candle open:', candle.open);
    console.log('candle close:', candle.close );
    console.log('candle low:', candle.low );

    let candleHigh = (candle.high);
    let candleLow = (candle.low);
    let candleClose = (candle.close);
    let candleOpen = (candle.open);

    const isBullish = candleClose > candleOpen;

    const wickUp = isBullish ? (candleHigh - candleClose) : (candleHigh - candleOpen);
    const wickDown = isBullish ? (candleOpen - candleLow) : (candleClose - candleLow);
    const bodySize = Math.abs(candleClose - candleOpen);

    console.log('wickUp:', wickUp);
    console.log('wickDown:', wickDown);
    console.log('bodySize:', bodySize);

    const condition =
        (wickUp <= wickThreshold && wickDown <= wickThreshold) ||
        (wickUp === 0 && wickDown <= wickThreshold) ||
        (wickDown === 0 && wickUp <= wickThreshold);

    return condition && bodySize >= bodySizeThreshold;
}

  function isBullish(candle) {
    return candle.close > candle.open;
}

function isBearish(candle) {
    return candle.close < candle.open;
}
  
    if(!deployedStates.includes(initialState)) {
      // undeploy account if it was undeployed
      console.log('Undeploying account');
      //await connection.close();
      //await account.undeploy();
    }


  } catch (err) {
    console.error(err);
  }
  //process.exit();
}

app.get('/executeMetaApi', async (req, res) => {
    try {
      await testMetaApiSynchronization();
      res.status(200).send('MetaApi execution successful');
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  });
  
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

