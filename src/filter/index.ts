import { PartiallyDecodedInstruction, PublicKey } from "@solana/web3.js";
import {
  httpsConnection,
  minimumTradeAmount,
  mintPK,
  poolPK,
  RAYDIUM_AUTHORITY,
  RAYDIUM_LP_V4,
  SOL_ADDRESS,
  wssConnection,
} from "../../config";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { appendToSpreadsheet } from "../sheet";
const raydiumLP = new PublicKey(RAYDIUM_LP_V4);

const logsFilterMention = "Transfer";
let raydiumSignatureList: string[] = [];

async function getLogs(): Promise<void> {
  try {
    wssConnection.onLogs(
      poolPK,
      (logs, context) => processLogs(logs, logsFilterMention),
      "confirmed"
    );
  } catch {
    console.error("error on raydium websocket");
  }
}

function processLogs(logs: any, filter: string): void {
  // console.log(logs);
  if (logs.err == null) {
    const L = logs.logs.length;
    for (let i = 0; i < L; i++) {
      if (logs.logs[i].includes(filter)) {
        if (
          raydiumSignatureList.length == 0 ||
          raydiumSignatureList[raydiumSignatureList.length - 1] !=
            logs.signature
        ) {
          raydiumSignatureList.push(logs.signature);
          // console.log(logs.signature);
        }
      }
    }
  }
}
function convertAsDateFormat(timestamp: number) {
  const date = new Date(timestamp * 1000);
  const dateFormat = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "long",
  }).format(date);
  return dateFormat;
}
function analyzeData(
  preTokenBalances: any,
  postTokenBalances: any
): { amount: number; swap: string } {
  let preBal = 0;
  let postBal = 0;
  const preLen = preTokenBalances.length;
  const postLen = postTokenBalances.length;
  for (let i = 0; i < preLen; i++) {
    if (
      preTokenBalances[i].mint === SOL_ADDRESS &&
      preTokenBalances[i].owner === RAYDIUM_AUTHORITY
    ) {
      preBal = preTokenBalances[i].uiTokenAmount.uiAmount;
    }
  }
  for (let j = 0; j < postLen; j++) {
    if (
      postTokenBalances[j].mint === SOL_ADDRESS &&
      postTokenBalances[j].owner === RAYDIUM_AUTHORITY
    ) {
      postBal = postTokenBalances[j].uiTokenAmount.uiAmount;
    }
  }
  const res = preBal - postBal;
  if (res >= 0) {
    return { amount: res, swap: "Sell" };
  } else {
    return { amount: -1 * res, swap: "Buy" };
  }
}
async function getTransactionOfToken(signature: string) {
  try {
    const tx = await httpsConnection.getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    // in case of general swap
    const insts = tx?.transaction.message.instructions;
    const innerInsts = tx?.meta?.innerInstructions;
    const preBal = tx?.meta?.preTokenBalances;
    const postBal = tx?.meta?.postTokenBalances;
    const blockTime = tx?.blockTime;
    if (insts && tx?.meta && blockTime) {
      const instLength = insts.length;
      for (let i = 0; i < instLength; i++) {
        if (
          insts[i].programId.toString() === RAYDIUM_LP_V4 &&
          (insts[i] as PartiallyDecodedInstruction).accounts &&
          (insts[i] as PartiallyDecodedInstruction).data
        ) {
          const accountsList = (insts[i] as PartiallyDecodedInstruction)
            .accounts;
          const data = (insts[i] as PartiallyDecodedInstruction).data;
          if (
            accountsList.length >= 17 &&
            accountsList[1].toString() == poolPK.toString()
          ) {
            // console.log(typeof data);
            // Get the trade amount
            const res = analyzeData(preBal, postBal);
            // console.log(analyzeData(preBal, postBal));
            console.log(signature);
            console.log(
              `wallet: ${accountsList[accountsList.length - 1].toString()}, ${
                res.swap
              }, ${res.amount}, ${convertAsDateFormat(blockTime)}`
            );

            console.log("\n");
            if (res.amount >= minimumTradeAmount) {
              const sheetValue = [
                convertAsDateFormat(blockTime),
                accountsList[accountsList.length - 1].toString(),
                res.swap,
                res.amount.toString(),
              ];
              appendToSpreadsheet([sheetValue]);
            }
            return;
          }
        }
      }
    }
    // In case of specific swap via Jupiter

    if (innerInsts && blockTime) {
      const lengthOfInst = innerInsts.length;
      for (let i = 0; i < lengthOfInst; i++) {
        const tinyInsts = innerInsts[lengthOfInst - i - 1]?.instructions;
        // console.log(tinyInsts);
        const tinyLengthOfInsts = tinyInsts.length;
        for (
          let j = 0;
          j < tinyLengthOfInsts;
          j++ // console.log(insts[i].programId.toString() == PUMPFUN_MANAGER);
        ) {
          if (
            tinyInsts[j].programId.toString() === raydiumLP.toString() &&
            (tinyInsts[j] as PartiallyDecodedInstruction).accounts &&
            (tinyInsts[j] as PartiallyDecodedInstruction).data
          ) {
            const accountsList = (tinyInsts[j] as PartiallyDecodedInstruction)
              .accounts;
            const data = (tinyInsts[j] as PartiallyDecodedInstruction).data;
            if (
              accountsList.length >= 17 &&
              accountsList[1].toString() === poolPK.toString()
            ) {
              const res = analyzeData(preBal, postBal);

              // Determin buy or sell
              console.log(signature);
              console.log(
                `wallet: ${accountsList[accountsList.length - 1].toString()}, ${
                  res.swap
                }, ${res.amount}, ${convertAsDateFormat(blockTime)}`
              );
              console.log("\n");
              if (res.amount >= minimumTradeAmount) {
                const sheetValue = [
                  convertAsDateFormat(blockTime),
                  accountsList[accountsList.length - 1].toString(),
                  res.swap,
                  res.amount.toString(),
                ];
                appendToSpreadsheet([sheetValue]);
              }
              return;
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("error to catch", e);
  }
}
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function callMint() {
  while (true) {
    if (raydiumSignatureList.length > 0) {
      getTransactionOfToken(raydiumSignatureList[0]);
      raydiumSignatureList.shift();
    }
    await sleep(50);
  }
}

export async function main() {
  getLogs();
  callMint();
}
