import os
import asyncio
from metaapi_cloud_sdk import MetaApi
from datetime import datetime, timedelta

# Note: for information on how to use this example code please read https://metaapi.cloud/docs/client/usingCodeExamples

token = os.getenv('TOKEN') or 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI5YmVlYmE4NDRiYzYxYzdkMTdlYTM5MzBiMTc5MWU0ZCIsInBlcm1pc3Npb25zIjpbXSwidG9rZW5JZCI6IjIwMjEwMjEzIiwiaW1wZXJzb25hdGVkIjpmYWxzZSwicmVhbFVzZXJJZCI6IjliZWViYTg0NGJjNjFjN2QxN2VhMzkzMGIxNzkxZTRkIiwiaWF0IjoxNzAzMDc4NDc0fQ.C0zGwBDKXlv_GXQryiQ34w5KDXOpYz_yH2Cu2yDvpzhEFDHcCk_w9bV1cuU_Zaa4q28Sto9wgDiGapLnvbq3gweNs3Nn45Gk9W55MGYFOq3KHTTb837LZHiHWiyFcS09_-afWq2ou_bA89_Uw29YHm5eOVjJDg9t2v4RkDmN2DRPjTRCEhcxkJ8M4dr7LMlntMjgwYjPo7L0WIh16U8xbNse5UQ1ertBfTS-Q6FlTwsoRVbgLHoTj6bg7uaahhgkHteM12Htb_s_uHVJ_J2D9lsnhwjtRoLWTbstILXNMqHntmv9QE_eJ4E9AFqsbnu73sDR4PPJUUb2O2bIlEJTgV4qLO3trkPOP9-pc2AmrB2B9WiNqeABvMGV0QmVo9QOHgoNb4SGvJdBhkmDijc1n1EhKXzJqT_BSDTtbJN6cHhnnptiM_enS2TEb0yLmkVkIeBb92OnA1ostOWkHJY-nycasMALT-xGNnBWH2Gmjuyc3-2RK4dLCIv2bfhwXCOz9wdJZlrpwzp8gAKShVnW601_dWKutfk3wpp7x16UknZrI8yCk_3akwOAohygl6gvrE4zvVcOPvuiyBgL2BBzJvD9qfkVd6Yd04ooLdkmleLCTRc1gMfyVRAgTLmuo5VsdNMxCJvPB6_t3oxJErj9cMXsisFgngPhZ6UVVcLRkZY'
accountId = os.getenv('ACCOUNT_ID') or '82247356-7c34-4188-be66-c9b36136ae04'


async def test_meta_api_synchronization():
    api = MetaApi(token)
    try:
        account = await api.metatrader_account_api.get_account(accountId)
        initial_state = account.state
        deployed_states = ['DEPLOYING', 'DEPLOYED']

        if initial_state not in deployed_states:
            #  wait until account is deployed and connected to broker
            print('Deploying account')
            await account.deploy()

        print('Waiting for API server to connect to broker (may take couple of minutes)')
        await account.wait_connected()

        # connect to MetaApi API
        connection = account.get_rpc_connection()
        await connection.connect()

        # wait until terminal state synchronized to the local state
        print('Waiting for SDK to synchronize to terminal state (may take some time depending on your history size)')
        await connection.wait_synchronized()

        # invoke RPC API (replace ticket numbers with actual ticket numbers which exist in your MT account)
        print('Testing MetaAPI RPC API')
        print('account information:', await connection.get_account_information())
        print('positions:', await connection.get_positions())
        # print(await connection.get_position('1234567'))
        print('open orders:', await connection.get_orders())
        # print(await connection.get_order('1234567'))
        print('history orders by ticket:', await connection.get_history_orders_by_ticket('1234567'))
        print('history orders by position:', await connection.get_history_orders_by_position('1234567'))
        print(
            'history orders (~last 3 months):',
            await connection.get_history_orders_by_time_range(
                datetime.utcnow() - timedelta(days=90), datetime.utcnow()
            ),
        )
        print('history deals by ticket:', await connection.get_deals_by_ticket('1234567'))
        print('history deals by position:', await connection.get_deals_by_position('1234567'))
        print(
            'history deals (~last 3 months):',
            await connection.get_deals_by_time_range(datetime.utcnow() - timedelta(days=90), datetime.utcnow()),
        )
        print('server time', await connection.get_server_time())

        # calculate margin required for trade
        print(
            'margin required for trade',
            await connection.calculate_margin(
                {'symbol': 'GBPUSD', 'type': 'ORDER_TYPE_BUY', 'volume': 0.1, 'openPrice': 1.1}
            ),
        )

        # trade
        print('Submitting pending order')
        try:
            result = await connection.create_limit_buy_order(
                'GBPUSD', 0.07, 1.0, 0.9, 2.0, {'comment': 'comm', 'clientId': 'TE_GBPUSD_7hyINWqAlE'}
            )
            print('Trade successful, result code is ' + result['stringCode'])
        except Exception as err:
            print('Trade failed with error:')
            print(api.format_error(err))
        if initial_state not in deployed_states:
            # undeploy account if it was undeployed
            print('Undeploying account')
            await connection.close()
            await account.undeploy()

    except Exception as err:
        print(api.format_error(err))
    exit()


asyncio.run(test_meta_api_synchronization())
