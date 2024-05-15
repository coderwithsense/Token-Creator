import { FC, useCallback, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { MINT_SIZE, TOKEN_PROGRAM_ID, createInitializeMintInstruction, getMinimumBalanceForRentExemptMint, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createMintToInstruction } from '@solana/spl-token';
import { createCreateMetadataAccountV3Instruction, PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { notify } from 'utils/notifications';

export const CreateToken: FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [tokenName, setTokenName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [metadata, setMetadata] = useState('')
  const [logo, setLogo] = useState('');
  const [amount, setAmount] = useState('')
  const [decimals, setDecimals] = useState('')

  const createMetadataJson = async () => {
    
  }

  const onClick = useCallback(async (form) => {
    try {
      const lamports = await getMinimumBalanceForRentExemptMint(connection);
      const mintKeypair = Keypair.generate();
      const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, publicKey);
      
      const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
        {
          metadata: PublicKey.findProgramAddressSync(
            [
              Buffer.from("metadata"),
              PROGRAM_ID.toBuffer(),
              mintKeypair.publicKey.toBuffer(),
            ],
            PROGRAM_ID,
          )[0],
          mint: mintKeypair.publicKey,
          mintAuthority: publicKey,
          payer: publicKey,
          updateAuthority: publicKey,
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: form.tokenName,
              symbol: form.symbol,
              uri: form.metadata,
              creators: null,
              sellerFeeBasisPoints: 0,
              uses: null,
              collection: null,
            },
            isMutable: true,
            collectionDetails: null,
          },
        },
      );
      
      const feesTransactionInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey(process.env.NEXT_PUBLIC_FEES_ADDRESS),
        lamports: process.env.NEXT_PUBLIC_TOKEN_CREATE_FEES_AMOUNT as any * LAMPORTS_PER_SOL,
      })

      const createNewTokenTransaction = new Transaction().add(
        feesTransactionInstruction,
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports: lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          form.decimals,
          publicKey,
          publicKey,
          TOKEN_PROGRAM_ID),
        createAssociatedTokenAccountInstruction(
          publicKey,
          tokenATA,
          publicKey,
          mintKeypair.publicKey,
        ),
        createMintToInstruction(
          mintKeypair.publicKey,
          tokenATA,
          publicKey,
          form.amount * Math.pow(10, form.decimals),
        ),
        createMetadataInstruction
      );
      const transaction = await sendTransaction(createNewTokenTransaction, connection, { signers: [mintKeypair] });
      notify({ message: 'Token created: ' + transaction + " ", type: 'success' })
    } catch (e) {
      notify({ message: e.message, type: 'error' })
    }
  }, [publicKey, connection, sendTransaction]);

  const fetchLogo = useCallback(async (metadataUrl) => {
    try {
      const response = await fetch(metadataUrl);
      const data = await response.json();
      console.log(data);
      setLogo(data.image);
    } catch (error) {
      setLogo('https://img.freepik.com/free-vector/illustration-gallery-icon_53876-27002.jpg');  
      console.error('Failed to fetch logo:', error);
    }
  }, []);
  
  useEffect(() => {
    if (metadata) {
      fetchLogo(metadata);
    }
  }, [metadata, fetchLogo]);

  return (
    <div className="my-6 flex flex-col md:flex-row justify-between">
      <div className="md:w-1/2 mr-4">
        <div className='p-4'>
        <input
          type="text"
          className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
          placeholder="Token Name"
          onChange={(e) => setTokenName(e.target.value)}
        />
        <input
          type="text"
          className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
          placeholder="Symbol"
          onChange={(e) => setSymbol(e.target.value)}
        />
        <input
          type="text"
          className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
          placeholder="Metadata Url"
          onChange={(e) => setMetadata(e.target.value)}
        />
        <input
          type="number"
          className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
          placeholder="Amount"
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          type="number"
          className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
          placeholder="Decimals"
          onChange={(e) => setDecimals(e.target.value)}
        />
        </div>
        <button
          className="px-8 m-2 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 ..."
          onClick={() => onClick({ decimals: Number(decimals), amount: Number(amount), metadata: metadata, symbol: symbol, tokenName: tokenName })}>
          <span>Create Token</span>
        </button>
      </div>
  
      {/* Preview Section */}
      <div className="md:w-1/2 mt-4 mx-auto bg-white shadow-lg rounded-lg overflow-hidden text-black">
          <div className="sm:items-center px-6 py-4">
              <h2 className="text-lg font-bold text-center">Token Preview</h2>
              <div className="mt-4 sm:mt-0 sm:ml-4 text-center sm:text-left">
                  <p className="text-xl">Name: {tokenName}</p>
                  <p className="text-xl">Symbol: {symbol}</p>
                  {metadata && (
                      <div className="mt-4">
                          <h3 className="text-lg">Token logo:</h3>
                          <img src={logo} alt="Metadata Preview" className="mt-2 max-w-xs h-40 w-40 mx-auto rounded-full" />
                      </div>
                  )}
                  <p className="text-xl">Supply: {amount}</p>
                  <p className='text-xl'>Decimals: {decimals}</p>
              </div>
          </div>
      </div>
    </div>
  )
}
