import {
    AnchorProvider,
    BN,
    Program,
    Wallet,
    getProvider,
  } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { OpenBookV2Client } from '@openbook-dex/openbook-v2';
import { DEVNET_PROGRAM_ID, MAINNET_PROGRAM_ID, MarketV2, TxVersion, buildSimpleTransaction } from '@raydium-io/raydium-sdk'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Button } from '@solana/wallet-adapter-react-ui/lib/types/Button';
import { Connection, Keypair, PublicKey, Transaction, clusterApiUrl } from '@solana/web3.js'
import base58 from 'bs58';
import React, { useEffect, useState } from 'react'
import { notify } from 'utils/notifications';
import { addLookupTableInfo, buildAndSendTx, getWalletTokenAccount, sendTransactions, wallet } from 'utils/util';
// import dotenv from 'dotenv'
// dotenv.config()

const CreateMarket = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const [baseDecimals, setBaseDecimals] = useState(0);
    const [quoteDecimals, setQuoteDecimals] = useState(0);
    const [baseToken, setBaseToken] = useState('');
    const [quoteToken, setQuoteToken] = useState('');
    const [lotSize, setLotSize] = useState(1);
    const [tickSize, setTickSize] = useState(0.01);

    const RAYDIUM_PROGRAM_ID = process.env.NETWORK == 'mainnet' ? MAINNET_PROGRAM_ID : DEVNET_PROGRAM_ID

    const tokenDecimal = async (tokenAddress: any) => {
        try {
            const token = new PublicKey(tokenAddress);
            const tokenAccountInfo = await connection.getAccountInfo(token);
            if (!tokenAccountInfo) {
                throw new Error('Could not find the token account');
            }
            const tokenDecimals = tokenAccountInfo.data[44];
            return tokenDecimals;
        } catch (error) {
            console.error(error)
        }
    }

    // async function onCLick() {
    //     try {
    //         const createMarketInstruments = await MarketV2.makeCreateMarketInstructionSimple({
    //             makeTxVersion: TxVersion.V0,
    //             connection: connection,
    //             wallet: wallet.publicKey,
    //             baseInfo: {
    //                 mint: new PublicKey(baseToken),
    //                 decimals: 9
    //             },
    //             quoteInfo: {
    //                 mint: new PublicKey(quoteToken),
    //                 decimals: 9
    //             },
    //             lotSize: lotSize,
    //             tickSize: tickSize,
    //             dexProgramId: RAYDIUM_PROGRAM_ID.OPENBOOK_MARKET
    //         })
    //         const marketId = createMarketInstruments.address.marketId;
    //         console.log('inner transactions :', createMarketInstruments.innerTransactions)
    //         const txids = await buildAndSendTx(createMarketInstruments.innerTransactions, { skipPreflight: true });

    //         console.log('Market Created')
    //         console.log('Create Market Transactions :', txids)
    //         console.log('Market Address :', marketId.toString())
    //     } catch (error) {
    //         notify({
    //             message: 'Error creating market',
    //             description: error.message,
    //             type: 'error',
    //         });
    //     }
    // }

    // async function onClick() {
    //     try {
    //         // -------- step 1: make instructions --------
    //         const marketInstructions = await MarketV2.makeCreateMarketInstructionSimple({
    //             makeTxVersion: TxVersion.V0,
    //             connection,
    //             wallet: publicKey,
    //             baseInfo: {
    //                 mint: new PublicKey('EgmaVvE8cEXGH2eKSVPhDCwEaz5XeTR1jk6564XzxVJk'),
    //                 decimals: 9
    //             },
    //             quoteInfo: {
    //                 mint: new PublicKey('Abi6fLGeFShKjBWy88Nd7YUV5sHKBCPpEyoVwbeViPTw'),
    //                 decimals: 9
    //             },
    //             lotSize: 1, // default 1
    //             tickSize: 0.00001, // default 0.00001
    //             dexProgramId: new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX')
    //         })
    //         // -------- step 2: build transaction --------
    //         const transactions = await buildSimpleTransaction({
    //             connection,
    //             makeTxVersion: TxVersion.V0,
    //             payer: publicKey,
    //             innerTransactions: marketInstructions.innerTransactions,
    //             addLookupTableInfo: addLookupTableInfo,
    //         });
    //         // -------- step 3: send transaction --------
    //         // const txids = await sendTransaction(transactions[0], connection);
    //         // const txids = await sendTransactions(sendTransaction, transactions, connection);
    //         // console.log('Market Created')
    //         // console.log('Create Market Transactions :', txids)
    //         console.log(marketInstructions.innerTransactions)
    //         return { txids: await buildAndSendTx(marketInstructions.innerTransactions) }

    //         // const tokenAccounts = await getWalletTokenAccount(connection, new PublicKey('6YTgVdkjrirrFKrCvVs6w5rF5MMjEkD4w44L1gAzvA6x'));
    //         // console.log('mintAddress :', tokenAccounts[20].accountInfo.mint.toString())
    //         // console.log('amountOfTokenWithDecimals :', tokenAccounts[20].accountInfo.amount.toString())
    //         // console.log('accountAddress: ', tokenAccounts[20].pubkey.toString())
    //     } catch (error) {
    //         console.error(error);
    //     }}

    async function onClick() {
        const wall = new NodeWallet(wallet);
        const provider = new AnchorProvider(connection, wall, {
            commitment: "confirmed",
        })
        const programId = new PublicKey(
            "opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb"
        );
        const client = new OpenBookV2Client(provider, programId)
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
        )
        console.log("ixs: ", ixs)
        console.log("signers: ", signers)
        // const tx = await client.sendAndConfirmTransaction(ixs, {
        //     additionalSigners: signers,
        // })
        // console.log("created market", tx);
        // console.log(
        //     "finished with balance: ",
        //     await connection.getBalance(wallet.publicKey)
        // );
    }
    return (
        <div>
            <div>
                <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-tr from-[#9945FF] to-[#14F195] p-10">
                    Create Market
                </h1>
            </div>
            <div className='flex flex-col items-center justify-center'>
                <input
                    type="text"
                    className="form-control block mb-2 px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
                    placeholder="Base Token"
                    onChange={(e) => setBaseToken(e.target.value)}
                />
                <input
                    type="text"
                    className="form-control block mb-2 px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
                    placeholder="Quote Token"
                    onChange={(e) => setQuoteToken(e.target.value)}
                />
                <input
                    type="number"
                    className="form-control block mb-2 px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
                    placeholder="Lot Size"
                    onChange={(e) => setLotSize(parseInt(e.target.value))}
                />
                <input
                    type="number"
                    className="form-control block mb-2 px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
                    placeholder="Tick Size"
                    onChange={(e) => setTickSize(parseFloat(e.target.value))}
                />
                <a href='https://smithii.io/wp-content/uploads/2024/03/MIN-ORDER-SIZE-TICK-SIZE-GUIDE-SMITHII.png' className=''>Guide</a>
                <button
                    className="px-8 m-2 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 ..."
                    onClick={onClick}>
                    <span>Create Token</span>
                </button>
            </div>
        </div>
    )

}

export default CreateMarket