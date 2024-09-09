import { Connection, PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
const wssURL = process.env.WSS_URL;
const httpsURL = process.env.HTTPS_URL ? process.env.HTTPS_URL : "";
export const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

export const wssConnection: Connection = new Connection(httpsURL, {
  wsEndpoint: wssURL,
  commitment: "confirmed",
});
export const httpsConnection: Connection = new Connection(
  httpsURL,
  "confirmed"
);

export const poolPK: PublicKey = new PublicKey(
  "H34a1DtzusexYuXet2z91AvwMs5hvw4TAxMgpj4PDVyf"
);
export const mintPK: PublicKey = new PublicKey(
  "7b36cKRYFZsMp3vLByVwfVQxW2ndcYth5rhPnyypump"
);
export const SOL_ADDRESS: string =
  "So11111111111111111111111111111111111111112";
export const RAYDIUM_LP_V4 = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
export const minimumTradeAmount: number = 1;
export const RAYDIUM_AUTHORITY: string =
  "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1";
