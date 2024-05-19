import { FC, useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";
import { createCreateMetadataAccountV3Instruction, PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { notify } from "utils/notifications";
import { WebBundlr } from "@bundlr-network/client";

export const CreateToken: FC = () => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [tokenName, setTokenName] = useState("");
  const [symbol, setSymbol] = useState("");

  const [logo, setLogo] = useState("");
  const [amount, setAmount] = useState("");
  const [decimals, setDecimals] = useState("");
  const [isSocialsEnabled, setisSocialsEnabled] = useState(false);
  const [metaUri, setmetaUri] = useState("1");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [bundlr, setBundlr] = useState(null);
  const [provider, setProvider] = useState(null);
  const [metadataJson, setmetadataJson] = useState({
    Name: "",
    Symbol: "",
    amount: 1,
    decimals: 1,
    description: "",
    imageUrl: "",
  });
  const [socialsMeta, setsocialsMeta] = useState({
    website: "",
    telegram: "",
    twitter: "",
    discord: "",
  });

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

    const imageResult = await bundlr.uploader.upload(imageFile, [{ name: "Content-Type", value: "image/png" }]);

    const arweaveImageUrl = `https://arweave.net/${imageResult.data.id}?ext=png`;

    if (arweaveImageUrl) {
      setmetadataJson((prevState) => ({ ...prevState, imageUrl: arweaveImageUrl }));
    }
  };

  const uploadMetadata = async () => {
    let localmeta;
    if (isSocialsEnabled) {
      localmeta = {...metadataJson, ...socialsMeta}
    } else {
      localmeta = metadataJson
    } 
    const price = await bundlr.utils.getPrice("solana", JSON.stringify(localmeta).length);
    let amount = bundlr.utils.unitConverter(price);
    amount = amount.toNumber();

    const loadedBalance = await bundlr.getLoadedBalance();
    let balance = bundlr.utils.unitConverter(loadedBalance.toNumber());
    balance = balance.toNumber();

    if (balance < amount) {
      await bundlr.fund(LAMPORTS_PER_SOL / 10);
    }

    const metadataResult = await bundlr.uploader.upload(JSON.stringify(localmeta), [
      { name: "Content-Type", value: "application/json" },
    ]);
    const arweaveMetadataUrl = `https://arweave.net/${metadataResult.data.id}`;
    setmetaUri(arweaveMetadataUrl);
    return arweaveMetadataUrl;
  };
  const handleImageChange = async (event) => {
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
  });

  useEffect(() => {
    const initializeBundlr = async () => {
      // initialise a bundlr client
      let bundler = new WebBundlr(`https://devnet.bundlr.network`, "solana", provider, { providerUrl: "https://api.devnet.solana.com" });

      console.log(bundler);

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
      notify({
        type: "success",
        message: `Connected to Devnet`,
      });
      setBundlr(bundler);
    };
    initializeBundlr();
  }, [provider]);

  const onClick = useCallback(
    async (form) => {
      try {
        const lamports = await getMinimumBalanceForRentExemptMint(connection);
        const mintKeypair = Keypair.generate();
        const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, publicKey);

        const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
          {
            metadata: PublicKey.findProgramAddressSync(
              [Buffer.from("metadata"), PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
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
          lamports: (process.env.NEXT_PUBLIC_TOKEN_CREATE_FEES_AMOUNT as any) * LAMPORTS_PER_SOL,
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
          createInitializeMintInstruction(mintKeypair.publicKey, form.decimals, publicKey, publicKey, TOKEN_PROGRAM_ID),
          createAssociatedTokenAccountInstruction(publicKey, tokenATA, publicKey, mintKeypair.publicKey),
          createMintToInstruction(mintKeypair.publicKey, tokenATA, publicKey, form.amount * Math.pow(10, form.decimals)),
          createMetadataInstruction
        );
        const transaction = await sendTransaction(createNewTokenTransaction, connection, { signers: [mintKeypair] });
        notify({ message: "Token created: " + transaction + " ", type: "success" });
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
      setLogo("https://img.freepik.com/free-vector/illustration-gallery-icon_53876-27002.jpg");
      console.error("Failed to fetch logo:", error);
    }
  }, []);

  // useEffect(() => {
  //   if (metadata) {
  //     fetchLogo(metadata);
  //   }
  // }, [metadata, fetchLogo]);

  return (
    <div className='mockup-window bg-base-300 w-[70vw] m-auto mt-2'>
      <div className='bg-base-200 p-5'>
        <div className='grid grid-cols-1 md:grid-cols-2 justify-items-center items-center gap-3'>
          <div className='indicator'>
            <span className='indicator-item badge'>Token</span>
            <input
              type='text'
              placeholder='Put the name of your token'
              className='input input-bordered w-full md:w-[30vw]'
              onChange={(e) => setmetadataJson((prevState) => ({ ...prevState, Name: e.target.value }))}
            />
          </div>
          <div className='indicator'>
            <span className='indicator-item badge'>Symbol</span>
            <input
              type='text'
              placeholder='Put the symbol of your token'
              className='input input-bordered w-full md:w-[30vw]'
              onChange={(e) => setmetadataJson((prevState) => ({ ...prevState, Symbol: e.target.value }))}
            />
          </div>
          <div className='indicator'>
            <span className='indicator-item badge'>Decimals</span>
            <input
              type='number'
              placeholder='Eg: 0.000001'
              className='input input-borderedw-full md:w-[30vw]'
              onChange={(e) => setmetadataJson((prevState) => ({ ...prevState, decimals: Number(e.target.value) }))}
            />
          </div>
          <div className='indicator'>
            <span className='indicator-item badge'>Supply</span>
            <input
              type='number'
              placeholder='Eg: 1'
              className='input input-bordered w-full md:w-[30vw]'
              onChange={(e) => setmetadataJson((prevState) => ({ ...prevState, amount: Number(e.target.value) }))}
            />
          </div>
          <div className='indicator block md:flex'>
            <div>
              <span className='indicator-item indicator-top indicator-start badge'>Image</span>
              <div className='mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-1'>
                {!metadataJson.imageUrl ? (
                  <div className='mt-1 sm:mt-0 sm:col-span-1'>
                    <div className='max-w-[14rem] md:max-w-[32rem] flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md'>
                      <div className='space-y-1 text-center'>
                        <svg
                          className='mx-auto h-12 w-12 text-gray-400'
                          stroke='currentColor'
                          fill='none'
                          viewBox='0 0 48 48'
                          aria-hidden='true'>
                          <path
                            d='M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02'
                            strokeWidth={2}
                            strokeLinecap='round'
                            strokeLinejoin='round'
                          />
                        </svg>
                        <div className='flex text-sm text-gray-600'>
                          <label
                            htmlFor='image-upload'
                            className='relative cursor-pointer bg-white rounded-md font-medium text-purple-500 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500'>
                            <span>Upload an image</span>
                            <input id='image-upload' name='image-upload' type='file' className='sr-only' onChange={handleImageChange} />
                          </label>
                          <p className='pl-1'>or drag and drop</p>
                        </div>
                        {!selectedImage ? null : <p className='text-sm text-gray-500'>{selectedImage}</p>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className='px-4 py-5 bg-white space-y-6 sm:p-6'>
                    <a href={metadataJson.imageUrl} target='_blank' rel='noreferrer'>
                      {metadataJson.imageUrl}
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div className='mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-1'>
              <div className='px-4 py-5 space-y-6 sm:p-6'>
                {!metadataJson.imageUrl && (
                  <button
                    className='px-8 m-2 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 ...'
                    onClick={async () => uploadImage()}
                    disabled={!bundlr}>
                    Upload Image
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className='indicator'>
            <span className='indicator-item badge'>Description</span>
            <textarea
              className='textarea textarea-bordered w-full md:w-[30vw]'
              placeholder='Bio'
              onChange={(e) => setmetadataJson((prevState) => ({ ...prevState, description: e.target.value }))}></textarea>
          </div>
        </div>
        <div className='form-control pl-[2rem] w-52'>
          <label className='cursor-pointer label'>
            <span className='label-text'>Add Social Links</span>
            <input
              type='checkbox'
              className='toggle toggle-primary'
              onChange={(e) => {
                setisSocialsEnabled((prev) => !prev);
              }}
            />
          </label>
        </div>
        <div className='p-5 grid gap-3 grid-cols-1 md:grid-cols-4'>
          <div className='indicator'>
            <span className='indicator-item badge'>Website</span>
            <input
              type='text'
              placeholder='Put your website'
              className='input input-bordered w-full md:w-[15vw]'
              onChange={(e) => setsocialsMeta((prevState) => ({ ...prevState, website: e.target.value }))}
            />
          </div>
          <div className='indicator'>
            <span className='indicator-item badge'>Twitter</span>
            <input
              type='text'
              placeholder='Put your twitter'
              className='input input-bordered w-full md:w-[15vw]'
              onChange={(e) => setsocialsMeta((prevState) => ({ ...prevState, x: e.target.value }))}
            />
          </div>
          <div className='indicator'>
            <span className='indicator-item badge'>Telegram</span>
            <input
              type='text'
              placeholder='Put your telegram'
              className='input input-bordered w-full md:w-[15vw]'
              onChange={(e) => setsocialsMeta((prevState) => ({ ...prevState, telegram: e.target.value }))}
            />
          </div>
          <div className='indicator'>
            <span className='indicator-item badge'>Discord</span>
            <input
              type='text'
              placeholder='Put your discord'
              className='input input-bordered w-full md:w-[15vw]'
              onChange={(e) => setsocialsMeta((prevState) => ({ ...prevState, discord: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <div className='mockup-code bg-primary text-primary-content'>
            <div className='px-5'>
              <h1 className='font-semibold'>Revoke Authorities</h1>
              <div className='px-5'>
                <p className='font-extrathin'>
                  Solana Token have 3 Authorities. Freeze Authority, Mint Authority and Update Authority. Revoke them to attrack more
                  investors.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className='flex justify-center p-5'>
          <button
            className='btn btn-outline'
            onClick={async () => {
              const metadata = await uploadMetadata();
              onClick({
                decimals: metadataJson.decimals,
                amount: metadataJson.amount,
                metadata: metadata,
                symbol: metadataJson.Symbol,
                tokenName: metadataJson.Name,
              });
            }}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
};
