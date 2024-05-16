import { FC, useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WebBundlr } from "@bundlr-network/client";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { notify } from "utils/notifications";

export const CreateToken: FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [tokenName, setTokenName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [metadata, setMetadata] = useState("");
  const [logo, setLogo] = useState("");
  const [amount, setAmount] = useState("");
  const [decimals, setDecimals] = useState("");

  const createMetadataJson = async () => {};

  const onClick = useCallback(
    async (form) => {
      try {
        const lamports = await getMinimumBalanceForRentExemptMint(connection);
        const mintKeypair = Keypair.generate();
        const tokenATA = await getAssociatedTokenAddress(
          mintKeypair.publicKey,
          publicKey
        );

        const createMetadataInstruction =
          createCreateMetadataAccountV3Instruction(
            {
              metadata: PublicKey.findProgramAddressSync(
                [
                  Buffer.from("metadata"),
                  PROGRAM_ID.toBuffer(),
                  mintKeypair.publicKey.toBuffer(),
                ],
                PROGRAM_ID
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
            }
          );

        const feesTransactionInstruction = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(process.env.NEXT_PUBLIC_FEES_ADDRESS),
          lamports:
            (process.env.NEXT_PUBLIC_TOKEN_CREATE_FEES_AMOUNT as any) *
            LAMPORTS_PER_SOL,
        });

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
            TOKEN_PROGRAM_ID
          ),
          createAssociatedTokenAccountInstruction(
            publicKey,
            tokenATA,
            publicKey,
            mintKeypair.publicKey
          ),
          createMintToInstruction(
            mintKeypair.publicKey,
            tokenATA,
            publicKey,
            form.amount * Math.pow(10, form.decimals)
          ),
          createMetadataInstruction
        );
        const transaction = await sendTransaction(
          createNewTokenTransaction,
          connection,
          { signers: [mintKeypair] }
        );
        notify({
          message: "Token created: " + transaction + " ",
          type: "success",
        });
      } catch (e) {
        notify({ message: e.message, type: "error" });
      }
    },
    [publicKey, connection, sendTransaction]
  );

  const fetchLogo = useCallback(async (metadataUrl) => {
    try {
      const response = await fetch(metadataUrl);
      const data = await response.json();
      console.log(data);
      setLogo(data.image);
    } catch (error) {
      setLogo(
        "https://img.freepik.com/free-vector/illustration-gallery-icon_53876-27002.jpg"
      );
      console.error("Failed to fetch logo:", error);
    }
  }, []);

  //Inits
  const wallet = useWallet();
  const [provider, setProvider] = useState(null);
  const [bundlr, setBundlr] = useState(null);
  const [address, setAddress] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const uploadImage = async () => {
    const price = await bundlr.utils.getPrice("solana", imageFile.length);
    let amount = bundlr.utils.unitConverter(price);
    amount = amount.toNumber();
    const loadedBalance = await bundlr.getLoadedBalance();
    let balance = bundlr.utils.unitConverter(loadedBalance.toNumber());
    balance = balance.toNumber();

    if (balance < amount) {
      await bundlr.fund(LAMPORTS_PER_SOL / 10);
    }

    const imageResult = await bundlr.uploader.upload(imageFile, [
      { name: "Content-Type", value: "image/png" },
    ]);

    const arweaveImageUrl = `https://arweave.net/${imageResult.data.id}?ext=png`;

    if (arweaveImageUrl) {
      setImageUrl(arweaveImageUrl);
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    let reader = new FileReader();
    if (file) {
      setSelectedImage(file.name);
      reader.onload = function () {
        if (reader.result) {
          setImageFile(Buffer.from(reader.result as ArrayBuffer));
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };
  useEffect(() => {
    if (wallet && wallet.connected) {
      async function connectProvider() {
        console.log(wallet);
        await wallet.connect();
        const provider = wallet.wallet.adapter;
        await provider.connect();
        setProvider(provider);
      }
      connectProvider();
    }
    const initialiseBundler = async () => {
      let bundler = new WebBundlr(
        `https://devnet.bundlr.network`,
        "solana",
        provider,
        {
          providerUrl: "https://api.devnet.solana.com",
        }
      );
      try {
        // Check for valid bundlr node
        await bundler.utils.getBundlerAddress("solana");
      } catch (err) {
        notify({ type: "error", message: `${err}` });
        return;
      }
      try {
        await bundler.ready();
      } catch (err) {
        notify({ type: "error", message: `${err}` });
        return;
      } //@ts-ignore
      if (!bundler.address) {
        notify({
          type: "error",
          message: "Unexpected error: bundlr address not found",
        });
      }
      // notify({
      //   type: "success",
      //   message: `Connected to devnet`,
      // });
      setAddress(bundler?.address);
      setBundlr(bundler);
    };
    initialiseBundler();
  }, []);

  useEffect(() => {
    if (metadata) {
      fetchLogo(metadata);
    }
  }, [metadata, fetchLogo]);

  return (
    <div>
      <div className="text-center">
        <h1>Easily Create Token</h1>
      </div>
      <div className="pt-10 grid gap-10">
        <div className="grid grid-cols-2">
          <label className="form-control m-auto w-[60%]">
            <span className="label-text-alt">Alt label</span>
            <input
              type="text"
              placeholder="Name"
              className="input input-bordered w-full max-w-md"
            />
          </label>

          <label className="form-control m-auto w-[60%] ">
            <span className="label-text-alt">Alt label</span>

            <input
              type="text"
              placeholder="Symbol"
              className="input input-bordered w-full max-w-md"
            />
          </label>
        </div>
        <div className="grid grid-cols-2">
          <label className="form-control m-auto w-[60%]">
            <span className="label-text-alt">Alt label</span>
            <input
              type="number"
              placeholder="Decimals"
              className="input input-bordered w-full max-w-md"
            />
          </label>

          <label className="form-control m-auto w-[60%]">
            <span className="label-text-alt">Alt label</span>

            <input
              type="text"
              placeholder="Supply"
              className="input input-bordered w-full max-w-md"
            />
          </label>
        </div>
        <div className="flex justify-around">
          <label className="form-control">
            <div className="flex">
              <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-1">
                {!imageUrl ? (
                  <div className="mt-1 sm:mt-0 sm:col-span-1">
                    <div className="max-w-lg flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                          aria-hidden="true"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="image-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-purple-500 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                          >
                            <span>Upload an image</span>
                            <input
                              id="image-upload"
                              name="image-upload"
                              type="file"
                              className="sr-only"
                              onChange={handleImageChange}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        {!selectedImage ? null : (
                          <p className="text-sm text-gray-500">
                            {selectedImage}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                    <a href={imageUrl} target="_blank" rel="noreferrer">
                      {imageUrl}
                    </a>
                  </div>
                )}
              </div>
              <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-1">
                <div className="px-4 py-5 space-y-6 sm:p-6">
                  {!imageUrl && (
                    <button
                      className="px-8 m-2 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 ..."
                      onClick={async () => uploadImage()}
                      disabled={!bundlr}
                    >
                      Upload Image
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="label">
              <span className="label-text-alt">
                Most meme coins use a squared of 1000*1000 logo
              </span>
            </div>
          </label>
          <div className="w-[30rem]">
            <label className="form-control">
              <div className="label">
                <span className="label-text">Description</span>
              </div>
              <textarea
                className="textarea textarea-bordered textarea-lg w-full max-w-md"
                placeholder="Put the description of your token"
              ></textarea>
            </label>
          </div>
        </div>
      </div>
      {/* <div className="md:w-1/2 mr-4">
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
      </div> */}

      {/* Preview Section */}
      {/* <div className="md:w-1/2 mt-4 mx-auto bg-white shadow-lg rounded-lg overflow-hidden text-black">
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
      </div> */}
    </div>
  );
};
