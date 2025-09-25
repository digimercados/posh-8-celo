// lib/contracts/mento.ts
// Fetch real-time fiat rates from Mento Protocol on Celo

import { ContractKit } from '@celo/contractkit';
import { newKitFromWeb3 } from '@celo/contractkit';
import Web3 from 'web3';

// Mento Oracle Addresses (Mainnet) — replace with real addresses when available
const MENTO_ORACLES = {
  cUSD: '0x8c3B7a43296B0615142519E192A6e2C4a6A8e4C5',
  cEUR: '0x7d02A3E0a5C7C7C7C7C7C7C7C7C7C7C7C7C7C7C7',
  cCOP: '0x9a12345678901234567890123456789012345678',
  cREAL: '0x8b12345678901234567890123456789012345678',
};

const FIAT_CURRENCIES = {
  USD: 'cUSD',
  EUR: 'cEUR',
  COP: 'cCOP',
  BRL: 'cREAL',
  ARS: 'cUSD', // Proxy via USD
  CLP: 'cUSD',
  PEN: 'cUSD',
  UYU: 'cUSD',
};

export async function getFiatRate(baseFiat: string, quoteFiat: string = 'USD'): Promise<number> {
  if (baseFiat === quoteFiat) return 1;

  const stablecoin = FIAT_CURRENCIES[baseFiat as keyof typeof FIAT_CURRENCIES];
  if (!stablecoin) {
    console.warn(`No oracle for ${baseFiat} — using USD proxy`);
    return 1;
  }

  const web3 = new Web3('https://forno.celo.org');
  const kit = newKitFromWeb3(web3);
  const oracleAddress = MENTO_ORACLES[stablecoin as keyof typeof MENTO_ORACLES];

  if (!oracleAddress) {
    throw new Error(`No Mento oracle for ${baseFiat}`);
  }

  const oracleAbi = [{
    constant: true,
    inputs: [],
    name: 'getExchangeRate',
    outputs: [{ type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  }];

  const oracleContract = new kit.web3.eth.Contract(oracleAbi as any, oracleAddress);
  const rateInWei = await oracleContract.methods.getExchangeRate().call();
  const rate = kit.web3.utils.fromWei(rateInWei, 'ether');
  return parseFloat(rate);
}

export async function getAllFiatRates(): Promise<Record<string, number>> {
  const rates: Record<string, number> = {};
  for (const fiat of Object.keys(FIAT_CURRENCIES)) {
    try {
      rates[fiat] = await getFiatRate(fiat);
    } catch (e) {
      console.error(`Failed to fetch rate for ${fiat}:`, e);
      rates[fiat] = 1;
    }
  }
  return rates;
}
