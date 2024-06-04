import { AuthorityType, createRevokeInstruction, createSetAuthorityInstruction, setAuthority } from '@solana/spl-token-2';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import React from 'react'
import { notify } from 'utils/notifications';

const Authority = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const onClick = async () => {
    try {
        const transactionInstruction: TransactionInstruction =  createRevokeInstruction(
            new PublicKey('8FjTMfqgvmB2M1svkSZe9i8MCjAzsioiJHsatfakBfmQ'),
            new PublicKey('8m64XuP8T9M5h59NBw1X5PRhQwXhTRZmJzB51LEAVUwo'),
        )
        const transaction = new Transaction().add(transactionInstruction);
        const txid = await sendTransaction(transaction, connection);
        notify({
            message: 'Success',
            description: 'Mint Authority Revoked',
            type: 'success',
            txid: txid
        })
    } catch (error) {
        notify({
            message: 'Error',
            description: 'Error in revoking mint authority',
            type: 'error'
        })
        console.error(`ERROR REVOKING MINT AUTHORITY: ${error}`);
    }
  }
  return (
    <div>
        <div>
            <h1 className="text-center text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-tr from-[#9945FF] to-[#14F195] p-10">
                Revoke Mint Authority
            </h1>
            <button onClick={onClick} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Revoke Mint Authority
            </button>
        </div>
        <div>
            <h1 className="text-center text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-tr from-[#9945FF] to-[#14F195] p-10">
                Revoke Freeze Authority
            </h1>  
        </div>
    </div>
  )
}

export default Authority