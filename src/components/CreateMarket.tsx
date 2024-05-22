import {
  AnchorProvider,
  BN,
  Program,
  Wallet,
  getProvider,
} from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { OpenBookV2Client } from "@openbook-dex/openbook-v2";
import {
  DEVNET_PROGRAM_ID,
  MAINNET_PROGRAM_ID,
  MarketV2,
  TxVersion,
  buildSimpleTransaction,
} from "@raydium-io/raydium-sdk";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@solana/wallet-adapter-react-ui/lib/types/Button";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";
import base58 from "bs58";
import React, { useEffect, useState } from "react";
import { notify } from "utils/notifications";
import {
  addLookupTableInfo,
  buildAndSendTx,
  getWalletTokenAccount,
  sendTransactions,
  wallet,
} from "utils/util";

const CreateMarket = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [baseDecimals, setBaseDecimals] = useState(0);
  const [quoteDecimals, setQuoteDecimals] = useState(0);
  const [baseToken, setBaseToken] = useState("");
  const [quoteToken, setQuoteToken] = useState("");
  const [lotSize, setLotSize] = useState(1);
  const [tickSize, setTickSize] = useState(0.01);

  const RAYDIUM_PROGRAM_ID =
    process.env.NETWORK == "mainnet" ? MAINNET_PROGRAM_ID : DEVNET_PROGRAM_ID;

  const tokenDecimal = async (tokenAddress: any) => {
    try {
      const token = new PublicKey(tokenAddress);
      const tokenAccountInfo = await connection.getAccountInfo(token);
      if (!tokenAccountInfo) {
        throw new Error("Could not find the token account");
      }
      const tokenDecimals = tokenAccountInfo.data[44];
      return tokenDecimals;
    } catch (error) {
      console.error(error);
    }
  };

  async function onClick() {
    try {
      const feesTransactionInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey(process.env.NEXT_PUBLIC_FEES_ADDRESS),
        lamports: (process.env.NEXT_PUBLIC_TOKEN_MARKET_CREATE_FEES_AMOUNT as any) * LAMPORTS_PER_SOL,
      });
      const wall = new NodeWallet(wallet);
      const provider = new AnchorProvider(connection, wall, {
        commitment: "confirmed",
      });
      const programId = new PublicKey(
        "opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb"
      );
      const client = new OpenBookV2Client(provider, programId);
      console.log(
        "starting with balance: ",
        await provider.connection.getBalance(wallet.publicKey)
      );
      const [ixs, signers] = await client.createMarketIx(
        wallet.publicKey,
        "BLAH-BLAH2",
        new PublicKey(baseToken),
        new PublicKey(quoteToken),
        new BN(1),
        new BN(1000000),
        new BN(1000),
        new BN(1000),
        new BN(0),
        null,
        null,
        null,
        null,
        null
      );
      console.log("ixs: ", ixs);
      console.log("signers: ", signers);
      // const tx = await client.sendAndConfirmTransaction(ixs, {
      //     additionalSigners: signers,
      // })
      ixs.push(feesTransactionInstruction);
      const transaction = new Transaction().add(...ixs);
      const tx = await sendTransaction(transaction, connection);
      notify({ message: `Market Created: ${tx}`, type: "success" });
      console.log("created market", tx);
      console.log(
        "finished with balance: ",
        await connection.getBalance(wallet.publicKey)
      );
    } catch (error) {
      notify({ message: error.message, type: "error" });
    }
  }
  return (
    <div className="mockup-window bg-base-300 w-[70vw] m-auto mt-2">
      <div className="bg-base-200 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 justify-items-center items-center gap-3">
          <div className="indicator">
            <span className="indicator-item badge">Base Token</span>
            <input
              type="text"
              placeholder="Address..."
              className="input input-bordered w-full md:w-[30vw]"
              onChange={(e) => setBaseToken(e.target.value)}

              //   onChange={(e) => setmetadataJson((prevState) => ({ ...prevState, Name: e.target.value }))}
            />
          </div>
          <div className="indicator">
            <span className="indicator-item badge">Quote Token</span>
            <input
              type="text"
              placeholder="Address..."
              className="input input-bordered w-full md:w-[30vw]"
              onChange={(e) => setQuoteToken(e.target.value)}

              //   onChange={(e) => setmetadataJson((prevState) => ({ ...prevState, Name: e.target.value }))}
            />
          </div>
          <div className="indicator">
            <span className="indicator-item badge">Min Order Size</span>
            <input
              type="number"
              placeholder="Type here"
              className="input input-bordered w-full md:w-[30vw]"
              onChange={(e) => setLotSize(parseInt(e.target.value))}
            />
          </div>
          <div className="indicator">
            <span className="indicator-item badge">Tick Size</span>
            <input
              type="number"
              placeholder="Type here"
              className="input input-bordered w-full md:w-[30vw]"
              onChange={(e) => setTickSize(parseFloat(e.target.value))}
            />
          </div>
        </div>
        <div className="flex justify-around p-5 align-middle items-center">
          <button className="btn btn-outline" onClick={onClick}>
            Create ({process.env.NEXT_PUBLIC_TOKEN_MARKET_CREATE_FEES_AMOUNT} SOL)
          </button>
        </div>
      </div>
    </div>
    // <div>
    //     <div>
    //         <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-tr from-[#9945FF] to-[#14F195] p-10">
    //             Create Market
    //         </h1>
    //     </div>
    //     <div className='flex flex-col items-center justify-center'>
    //         <input
    //             type="text"
    //             className="form-control block mb-2 px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
    //             placeholder="Base Token"
    //             onChange={(e) => setBaseToken(e.target.value)}
    //         />
    //         <input
    //             type="text"
    //             className="form-control block mb-2 px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
    //             placeholder="Quote Token"
    //             onChange={(e) => setQuoteToken(e.target.value)}
    //         />
    //         <input
    //             type="number"
    //             className="form-control block mb-2 px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
    //             placeholder="Lot Size"
    //             onChange={(e) => setLotSize(parseInt(e.target.value))}
    //         />
    //         <input
    //             type="number"
    //             className="form-control block mb-2 px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
    //             placeholder="Tick Size"
    //             onChange={(e) => setTickSize(parseFloat(e.target.value))}
    //         />
    //         <a href='https://smithii.io/wp-content/uploads/2024/03/MIN-ORDER-SIZE-TICK-SIZE-GUIDE-SMITHII.png' className=''>Guide</a>
    //         <button
    //             className="px-8 m-2 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 ..."
    //             onClick={onClick}>
    //             <span>Create Token</span>
    //         </button>
    //     </div>
    // </div>
  );
};

export default CreateMarket;
