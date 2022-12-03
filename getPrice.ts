import { Pool } from '@uniswap/v3-sdk'
import { ethers } from 'ethers'
import { Token } from '@uniswap/sdk-core'
import { abi as IUniswapV3PoolABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
//219164368e334e05a9f591abe5397491
const provider = new ethers.providers.JsonRpcProvider('https://goerli.infura.io/v3/' + process.argv[2])
console.log(process.argv[2])
const poolAddress = '0x306a3Af3E65a11B83C74BeC88d12782D08E64867'
const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI, provider)
var price: number;

interface Immutables {
  factory: string
  token0: string
  token1: string
  fee: number
  tickSpacing: number
  maxLiquidityPerTick: ethers.BigNumber
}

interface State {
  liquidity: ethers.BigNumber
  sqrtPriceX96: ethers.BigNumber
  tick: number
  observationIndex: number
  observationCardinality: number
  observationCardinalityNext: number
  feeProtocol: number
  unlocked: boolean
}

async function getPoolImmutables() {
  const immutables: Immutables = {
    factory: await poolContract.factory(),
    token0: await poolContract.token0(),
    token1: await poolContract.token1(),
    fee: await poolContract.fee(),
    tickSpacing: await poolContract.tickSpacing(),
    maxLiquidityPerTick: await poolContract.maxLiquidityPerTick(),
  }
  return immutables
}

async function getPoolState() {
  const slot = await poolContract.slot0()
  const PoolState: State = {
    liquidity: await poolContract.liquidity(),
    sqrtPriceX96: slot[0],
    tick: slot[1],
    observationIndex: slot[2],
    observationCardinality: slot[3],
    observationCardinalityNext: slot[4],
    feeProtocol: slot[5],
    unlocked: slot[6],
  }
  return PoolState
}

async function main(sender: string) {
  const immutables = await getPoolImmutables();
  const state = await getPoolState();
  const DAI = new Token(1, immutables.token0, 18, "DAI", "Stablecoin");
  const USDC = new Token(1, immutables.token1, 18, "USDC", "USD Coin");
  const DAI_USDC_POOL = new Pool(
    DAI,
    USDC,
    immutables.fee,
    state.sqrtPriceX96.toString(),
    state.liquidity.toString(),
    state.tick
  );
  price = +DAI_USDC_POOL.token0Price.toSignificant(9);
  var ETHUSD: number;
  const https = require("https");
  https
    .get(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      (resp: any) => {
        let data = "";
        resp.on("data", (chunk: string) => {
          data += chunk;
        });
        resp.on("end", () => {
          ETHUSD = JSON.parse(data).ethereum.usd;
          price = price * ETHUSD;
          const fs = require("fs");
          var capacity = 168;
          var json;
          fs.readFile("./data.json", "utf8", (err: string, jsonString: string) => {
            if (err) {
              return;
            }
            var json = JSON.parse(jsonString);
            if (json.length >= capacity) {
              json.pop();
            }
            var currentdate = new Date(); 
            var element = {"date": currentdate.getDate() + "/"
            + (currentdate.getMonth()+1)  + "/" 
            + currentdate.getFullYear() + " "  
            + currentdate.getHours() + ":"  
            + currentdate.getMinutes(), "PATC":price }
            json.push(element);
            var jsonContent = JSON.stringify(json);
            fs.writeFile("data.json", jsonContent, "utf8", function (err: string) {
              if (err) {
                return console.log(err);
              }
            });
          });
        });
      }
    )
}
main("0xc488a904a4e32329f569F9f03EA4BBACBaa66200")