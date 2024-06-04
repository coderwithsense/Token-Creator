import { token } from "@coral-xyz/anchor/dist/cjs/utils";
import { TOKEN_PROGRAM_ID, createRevokeInstruction, createSetAuthorityInstruction } from "@solana/spl-token-2";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import React, { useEffect, useState } from "react";
import { notify } from "utils/notifications";

const Revoke = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokens, setSplTokens] = useState([]);

  const revoke = async () => {
    try {
      // const instruction = createRevokeInstruction(
      //   new PublicKey(tokenAddress),
      //   publicKey
      // );
      // console.log(instruction);
      // const transaction = new Transaction().add(instruction);
      // await sendTransaction(transaction, connection);
      const instruction = createRevokeInstruction(
        new PublicKey(tokenAddress),
        publicKey,
      )
      console.log(instruction);
      const transaction = new Transaction().add(instruction);
      await sendTransaction(transaction, connection);
      notify({ message: "Access revoked", type: "success" });
    } catch (error) {
      notify({ message: "Failed to revoke access", type: "error" });
    }
  };

  const getSplTokensFromWallet = async () => {
    if(!publicKey) return;
    const splTokens = await connection.getTokenAccountsByOwner(publicKey, {
      programId: TOKEN_PROGRAM_ID,
    });
    setSplTokens(splTokens.value as any);
    console.log(tokens);
    return splTokens;
  }

  useEffect(() => {
    getSplTokensFromWallet()
  }, [publicKey])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="md:w-1/2 mr-4">
        <input
          type="text"
          className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
          placeholder="Token Address"
          onChange={(e) => setTokenAddress(e.target.value)}
        />
        <button
          className="px-8 m-2 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 ..."
          onClick={revoke}
        >
          Revoke Access
        </button>
      </div>
    </div>
  );
};

export default Revoke;
