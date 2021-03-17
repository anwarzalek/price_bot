require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const ABIs = require('./ABIs')
const pairs = require('./pairs')
const http = require('http')
const Web3 = require('web3')
const HDWalletProvider = require('@truffle/hdwallet-provider')
const moment = require('moment-timezone')
const numeral = require('numeral')
const _ = require('lodash')
const axios = require('axios')
const { PerformanceObserver, performance } = require('perf_hooks');
var count_request = 0
var count_response = 0

// SERVER CONFIG
const PORT = process.env.PORT || 5000
const app = express();
const server = http.createServer(app).listen(PORT, () => console.log(`Listening on ${ PORT }`))
// WEB3 CONFIG
const web3 = new Web3(process.env.RPC_URL)
const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"

const kyberRateContract = new web3.eth.Contract(ABIs.KYBER_RATE_ABI, ABIs.KYBER_RATE_ADDRESS)

async function checkPair(args) {
  const { outputTokenSymbol, outputTokenAddress, inputAmount  , unit} = args

  const uniswapFactoryContract = new web3.eth.Contract(ABIs.UNISWAP_ROUTE_ABI, ABIs.UNISWAP_ROUTE_ADDRESS)

  var uniswapResult_tokens_BUY = await uniswapFactoryContract.methods.getAmountsOut(inputAmount , [WETH, outputTokenAddress]).call()
  var uniswapResult_tokens_SELL = await uniswapFactoryContract.methods.getAmountsIn(inputAmount , [ outputTokenAddress , WETH]).call()
  // count_response += 1
        
  // console.log('response' + count_response)
  console.table({  
    'Input Token': "WETH",
    'Output Token': outputTokenSymbol,
    'Input Amount': web3.utils.fromWei(inputAmount, "ether"),
    'Uniswap BUY token': web3.utils.fromWei(uniswapResult_tokens_BUY[1], unit),
    'Uniswap SELL token': web3.utils.fromWei(uniswapResult_tokens_SELL[0], unit),
    // 'Kyber Expected Rate': web3.utils.fromWei(kyberResult.expectedRate, 'Ether'),
    // 'Kyber Min Return': web3.utils.fromWei(kyberResult.slippageRate, 'Ether'),
    'Timestamp': moment().tz('Asia/Tokyo').format(),
  })
}

let priceMonitor
let monitoringPrice = false

async function monitorPrice() {
    if(monitoringPrice) {return}

    monitoringPrice = true
    var temp = {}
    try {
      for (const pair in pairs.pairs) {
        temp  = pairs.pairs[pair]
        temp.inputAmount = web3.utils.toWei('1', 'ETHER')
        
        var t0 = performance.now()
        // count_request += 1
        // console.log('request'  + count_request )
        await checkPair(temp)

        var t1 = performance.now()
        console.log("Call to doSomething took " + (t1 - t0) + " milliseconds.")
      }

    } catch (error) {
      console.error(error)
      monitoringPrice = false
      clearInterval(priceMonitor)
      return
    }
    monitoringPrice = false
}

// Check markets every n seconds
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 200 // 1 Seconds

priceMonitor = setInterval(async () => { await monitorPrice() }, POLLING_INTERVAL)
