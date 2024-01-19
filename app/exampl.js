let MetaApi = require('metaapi.cloud-sdk').default;

let token = process.env.TOKEN || 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI5YmVlYmE4NDRiYzYxYzdkMTdlYTM5MzBiMTc5MWU0ZCIsInBlcm1pc3Npb25zIjpbXSwidG9rZW5JZCI6IjIwMjEwMjEzIiwiaW1wZXJzb25hdGVkIjpmYWxzZSwicmVhbFVzZXJJZCI6IjliZWViYTg0NGJjNjFjN2QxN2VhMzkzMGIxNzkxZTRkIiwiaWF0IjoxNzAzMDk0MTI0fQ.Qzvxqs_KgoKl8xe5n2sK4YRgAxr11105xktU4WRmpwlGxmmDlu8r_I35aPklpCgoAnmeBrkJS3XVuy5wF_GxrKHacsP5xjlTc6fZKTlsvuD0uo9TN65bWSsSXCxJSGo9d7KvwMg-Vj2DdimbGSGCP6doNX8lJlqckHaVk-aw-tR6IAYb5Ju-Jb8vnT4mgLRjipBH0o8ppNUv7SgqS2An_B1FPyl1bamNb038eT5kZS8yiB9dl-avHnaRpgGRxRV8kyR3Qa7gZg888V0gbDyXaGT0ULCPK04m6mXdlkpHiDS7R4Sj6j3RExc4cSqbZM34aesnsSPyx-k1FV-5wGrLIEhMviMzg8A2kw7uxZMjn66heu6bzft_4pFfoi1VIuqqF_wWv22J81n3VNTt4yvW--ncQDEZ6inmJG75dUwNeTNbGaJsGRf7FcuCNTcnSicv_Bgc3EzW8sMGPlgDSky4QR532yzfrzKH19pGIhiUbw0TlLLpM_RxbCs4hHc4gLRNVQr99Rm_74MAaSbhj8N_2N10-R-yIgdr0ge9XbS77VgfS-KbUX1Qmv2NcNZDvntyQIRXyn8XmvW4SeHCccq2TOr7ll4fWq-0C2JD7SiTJ6ps_jldkCzgqAxWvjR2k3cclMcS0exFGVz5QLnczoAR74GUUlV7sUX2KiDqBBoZJIA';
let accountId = process.env.ACCOUNT_ID || '82247356-7c34-4188-be66-c9b36136ae04';

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
    let connection = account.getRPCConnection();
    await connection.connect();

    // wait until terminal state synchronized to the local state
    console.log('Waiting for SDK to synchronize to terminal state (may take some time depending on your history size)');
    await connection.waitSynchronized();

    // invoke RPC API (replace ticket numbers with actual ticket numbers which exist in your MT account)
    console.log('Testing MetaAPI RPC API');
    console.log('account information:', await connection.getAccountInformation());
    console.log('positions:', await connection.getPositions());
    //console.log(await connection.getPosition('1234567'));
    console.log('open orders:', await connection.getOrders());
    //console.log(await connection.getOrder('1234567'));
    console.log('history orders by ticket:', await connection.getHistoryOrdersByTicket('1234567'));
    console.log('history orders by position:', await connection.getHistoryOrdersByPosition('1234567'));
    console.log('history orders (~last 3 months):', 
      await connection.getHistoryOrdersByTimeRange(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date()));
    console.log('history deals by ticket:', await connection.getDealsByTicket('1234567'));
    console.log('history deals by position:', await connection.getDealsByPosition('1234567'));
    // console.log('history deals (~last 3 months):', 
    //   await connection.getDealsByTimeRange(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date()));
    console.log('server time', await connection.getServerTime());

   // log.infor('getting tick data ',await connection.getTick('EURUSDm',true))

    // calculate margin required for trade
    // console.log('margin required for trade', await connection.calculateMargin({
    //   symbol: 'GBPUSD',
    //   type: 'ORDER_TYPE_BUY',
    //   volume: 0.1,
    //   openPrice: 1.1
    // }));

    // trade
    console.log('Submitting pending order');
    // try {
    //   let result = await
    //   connection.createMarketBuyOrder('EURUSDm', 0.1, {
    //     comment: 'comm',
    //     clientId: 'TE_GBPUSD_7hyINWqAlE'
    //   });
    //   console.log('Trade successful, result code is ' + result.stringCode);
    // } catch (err) {
    //   console.log('Trade failed with result code ' + err.stringCode);
    // }

    if(!deployedStates.includes(initialState)) {
      // undeploy account if it was undeployed
      console.log('Undeploying account');
      await connection.close();
      await account.undeploy();
    }
  
  } catch (err) {
    console.error(err);
  }
  process.exit();
}

testMetaApiSynchronization();
