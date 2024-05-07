import {
    buildSimpleTransaction,
    findProgramAddress,
    InnerSimpleV0Transaction,
    LOOKUP_TABLE_CACHE,
    SPL_ACCOUNT_LAYOUT,
    TOKEN_PROGRAM_ID,
    TokenAccount,
    TxVersion,
} from '@raydium-io/raydium-sdk';
import {
    clusterApiUrl,
    Connection,
    Keypair,
    PublicKey,
    SendOptions,
    Signer,
    Transaction,
    VersionedTransaction,
} from '@solana/web3.js';

import base58 from 'bs58';

export const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const makeTxVersion = TxVersion.V0;
export const wallet = Keypair.fromSecretKey(
    base58.decode("5DtdZ9pjiyyEXBNcUqjiy4LC9Up7asg5cEAaTVNVBwvnB2umB3QFP2XrkLPQ9kkHgCsWDNEEcFoeaEqswT7ZyxYL")
);

export const addLookupTableInfo = process.env.NEXT_PUBLIC_NETWORK == 'beta-mainnet' ? LOOKUP_TABLE_CACHE : undefined;

export const getDecimals = async (tokenAddress: any) => {
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

export async function sendTx(
    connection: Connection,
    payer: Keypair | Signer,
    txs: (VersionedTransaction | Transaction)[],
    options?: SendOptions
): Promise<string[]> {
    const txids: string[] = [];
    for (const iTx of txs) {
        if (iTx instanceof VersionedTransaction) {
            iTx.sign([payer]);
            txids.push(await connection.sendTransaction(iTx, options));
        } else {
            txids.push(await connection.sendTransaction(iTx, [payer], options));
        }
    }
    return txids;
}

export async function getWalletTokenAccount(connection: Connection, wallet: PublicKey): Promise<TokenAccount[]> {
    const walletTokenAccount = await connection.getTokenAccountsByOwner(wallet, {
        programId: TOKEN_PROGRAM_ID,
    });
    return walletTokenAccount.value.map((i) => ({
        pubkey: i.pubkey,
        programId: i.account.owner,
        accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
    }));
}

export async function sendTransactions(sendTransaction, transactions, CONNECTION){
    try {
        const txids = []
    for (const transaction of transactions) {
        const txid = await sendTransaction(transaction, CONNECTION)
        console.log(`Transaction sent: ${txid}`)
        txids.push(txid)
    }
    return txids
    } catch (error) {
        console.error(`ERROR SENDING TRANSACTIONS: ${error}`)
    }
}

export async function buildAndSendTx(innerSimpleV0Transaction: InnerSimpleV0Transaction[], options?: SendOptions) {
    const willSendTx = await buildSimpleTransaction({
        connection,
        makeTxVersion,
        payer: wallet.publicKey,
        innerTransactions: innerSimpleV0Transaction,
        addLookupTableInfo: addLookupTableInfo,
    })

    return await sendTx(connection, wallet, willSendTx, options)
}

export function getATAAddress(programId: PublicKey, owner: PublicKey, mint: PublicKey) {
    const { publicKey, nonce } = findProgramAddress(
        [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
        new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
    );
    return { publicKey, nonce };
}

export async function sleepTime(ms: number) {
    console.log((new Date()).toLocaleString(), 'sleepTime', ms)
    return new Promise(resolve => setTimeout(resolve, ms))
}