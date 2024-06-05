import { FC, useCallback, Fragment, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { ToastContainer } from "react-toastify";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, SelectorIcon } from "@heroicons/react/solid";

import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token-2";
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { notify } from "utils/notifications";
import { WebBundlr } from "@bundlr-network/client";
import Link from "next/link";
import { CLUSTERS } from "contexts/ContextProvider";
import toast, { Toaster } from "react-hot-toast";
const classNames = (...classes) => {
  return classes.filter(Boolean).join(" ");
};
export const CreateToken: FC = () => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [logo, setLogo] = useState("");
  const [isSocialsEnabled, setisSocialsEnabled] = useState(false);
  const [metaUri, setmetaUri] = useState("1");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [bundlr, setBundlr] = useState(null);
  const [provider, setProvider] = useState(null);
  const [selected, setSelected] = useState(null);

  // authority
  const [freezeAuthority, setFreezeAuthority] = useState(false);
  const [mintAuthority, setMintAuthority] = useState(false);
  const [updateAuthority, setUpdateAuthority] = useState(false);

  // useEffect(() => {
  //   console.log(freezeAuthority, mintAuthority, updateAuthority)
  // }, [freezeAuthority, mintAuthority,updateAuthority])
  
  const bundlers = [
    { id: 1, network: "mainnet-beta", name: "https://node1.bundlr.network" },
    { id: 2, network: "devnet", name: "https://devnet.bundlr.network" },
  ];
  const [metadataJson, setmetadataJson] = useState({
    name: "",
    symbol: "",
    description: "",
    image: "",
    amount: 1000000,
    decimals: 9,
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

    const imageResult = await bundlr.uploader.upload(imageFile, [
      { name: "Content-Type", value: "image/png" },
    ]);

    const arweaveImageUrl = `https://arweave.net/${imageResult.data.id}?ext=png`;

    if (arweaveImageUrl) {
      setmetadataJson((prevState) => ({
        ...prevState,
        image: arweaveImageUrl,
      }));
    }
  };

  const uploadMetadata = async () => {
    let localmeta;
    if (isSocialsEnabled) {
      localmeta = {
        ...metadataJson,
        extensions: {
          website: socialsMeta.website,
          telegram: socialsMeta.telegram,
          twitter: socialsMeta.twitter,
          discord: socialsMeta.discord,
        },
      };
    } else {
      localmeta = metadataJson;
    }
    const price = await bundlr.utils.getPrice(
      "solana",
      JSON.stringify(localmeta).length
    );
    let amount = bundlr.utils.unitConverter(price);
    amount = amount.toNumber();

    const loadedBalance = await bundlr.getLoadedBalance();
    let balance = bundlr.utils.unitConverter(loadedBalance.toNumber());
    balance = balance.toNumber();

    // if (balance < amount) {
    //   await bundlr.fund(LAMPORTS_PER_SOL / 10);
    // }

    const metadataResult = await bundlr.uploader.upload(
      JSON.stringify(localmeta),
      [{ name: "Content-Type", value: "application/json" }]
    );
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

  const initializeBundlr = async () => {
    // initialise a bundlr client
    let bundler;
    console.log(selected, "selected");
    if (selected.name === "https://devnet.bundlr.network") {
      bundler = new WebBundlr(`${selected.name}`, "solana", provider, {
        providerUrl: "https://api.devnet.solana.com",
      });
    } else {
      bundler = new WebBundlr(`${selected.name}`, "solana", provider);
    }

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
      message: `Connected to ${selected.network}`,
    });
    setBundlr(bundler);
  };

  const onClick = useCallback(
    async (form) => {
      try {
        const lamports = await getMinimumBalanceForRentExemptMint(connection);
        const mintKeypair = Keypair.generate();
        const tokenATA = await getAssociatedTokenAddress(
          mintKeypair.publicKey,
          publicKey
        );

        let createMetadataInstruction;
        if (updateAuthority) {
          createMetadataInstruction = createCreateMetadataAccountV3Instruction(
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
        } else {
          createMetadataInstruction = createCreateMetadataAccountV3Instruction(
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
                isMutable: false,
                collectionDetails: null,
              },
            }
          );
        }

        let fees = parseFloat(process.env.NEXT_PUBLIC_TOKEN_CREATE_FEES_AMOUNT);
        // console.log(freezeAuthority, mintAuthority, updateAuthority)
        if (freezeAuthority) {
          fees += 0.1;

        }
        if (mintAuthority) {
          fees += 0.1;
        }
        if (updateAuthority) {
          fees += 0.1;
        }
        console.log(fees);
        const feesTransactionInstruction = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(process.env.NEXT_PUBLIC_FEES_ADDRESS),
          lamports: (fees as any) * LAMPORTS_PER_SOL,
        });

        let mintInstructions;
        if (freezeAuthority) {
          mintInstructions = createInitializeMintInstruction(
            mintKeypair.publicKey,
            form.decimals,
            publicKey,
            publicKey,
            TOKEN_PROGRAM_ID
          );
        } else {
          mintInstructions = createInitializeMintInstruction(
            mintKeypair.publicKey,
            form.decimals,
            publicKey,
            null,
            TOKEN_PROGRAM_ID
          );
        }
        const createNewTokenTransaction = new Transaction().add(
          feesTransactionInstruction,
          SystemProgram.createAccount({
            fromPubkey: publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: MINT_SIZE,
            lamports: lamports,
            programId: TOKEN_PROGRAM_ID,
          }),
          mintInstructions,
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
        toast.success(
          <Link
            href={`https://solscan.io/tx/${transaction}?cluster=${
              CLUSTERS[2] ? "devnet" : "mainnet-beta"
            }`}
          >
            Click here to view transaction details
          </Link>
        );
      } catch (e) {
        notify({ message: e.message, type: "error" });
      }
    },
    [publicKey, connection, sendTransaction, freezeAuthority, updateAuthority]
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

  // useEffect(() => {
  //   if (metadata) {
  //     fetchLogo(metadata);
  //   }
  // }, [metadata, fetchLogo]);

  return (
    <div className="mockup-window bg-base-300 w-[70vw] m-auto mt-2">
      <div className="bg-base-200 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 justify-items-center items-center gap-3">
          <div className="indicator">
            <span className="indicator-item badge">Token</span>
            <input
              type="text"
              placeholder="Put the name of your token"
              className="input input-bordered w-full md:w-[30vw]"
              onChange={(e) =>
                setmetadataJson((prevState) => ({
                  ...prevState,
                  name: e.target.value,
                }))
              }
            />
          </div>
          <div className="indicator">
            <span className="indicator-item badge">Symbol</span>
            <input
              type="text"
              placeholder="Put the symbol of your token"
              className="input input-bordered w-full md:w-[30vw]"
              onChange={(e) =>
                setmetadataJson((prevState) => ({
                  ...prevState,
                  symbol: e.target.value,
                }))
              }
            />
          </div>
          <div className="indicator">
            <span className="indicator-item badge">Decimals</span>
            <input
              type="number"
              placeholder="Eg: 9"
              className="input input-borderedw-full md:w-[30vw]"
              onChange={(e) =>
                setmetadataJson((prevState) => ({
                  ...prevState,
                  decimals: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="indicator">
            <span className="indicator-item badge">Supply</span>
            <input
              type="number"
              placeholder="Eg: 1000000"
              className="input input-bordered w-full md:w-[30vw]"
              onChange={(e) =>
                setmetadataJson((prevState) => ({
                  ...prevState,
                  amount: Number(e.target.value),
                }))
              }
            />
          </div>
          <div className="indicator block md:flex">
            <div>
              <span className="indicator-item indicator-top indicator-start badge">
                Image
              </span>
              <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-1">
                {!metadataJson.image ? (
                  <div className="mt-1 sm:mt-0 sm:col-span-1">
                    <div className="max-w-[14rem] md:max-w-[32rem] flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
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
                  <div></div>
                )}
              </div>
            </div>
            <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-1">
              <div className="px-4 py-5 space-y-6 sm:p-6">
                <button
                  className="px-8 m-2 btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 ..."
                  onClick={async () => uploadImage()}
                  disabled={!bundlr || metadataJson.image != ""}
                >
                  {metadataJson.image ? "Uploaded Image" : "Upload Image"}
                </button>
              </div>
            </div>
          </div>
          <div className="indicator">
            <span className="indicator-item badge">Description</span>
            <textarea
              className="textarea textarea-bordered w-full md:w-[30vw]"
              placeholder="Bio"
              onChange={(e) =>
                setmetadataJson((prevState) => ({
                  ...prevState,
                  description: e.target.value,
                }))
              }
            ></textarea>
          </div>
        </div>
        <div className="form-control pl-[2rem] w-52">
          <label className="cursor-pointer label">
            <span className="label-text">Add Social Links</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              onChange={(e) => {
                setisSocialsEnabled((prev) => !prev);
              }}
            />
          </label>
        </div>
        <div className="p-5 grid gap-3 grid-cols-1 md:grid-cols-4">
          <div className="indicator">
            <span className="indicator-item badge">Website</span>
            <input
              type="text"
              placeholder="Put your website"
              className="input input-bordered w-full md:w-[15vw]"
              onChange={(e) =>
                setsocialsMeta((prevState) => ({
                  ...prevState,
                  website: e.target.value,
                }))
              }
            />
          </div>
          <div className="indicator">
            <span className="indicator-item badge">Twitter</span>
            <input
              type="text"
              placeholder="Put your twitter"
              className="input input-bordered w-full md:w-[15vw]"
              onChange={(e) =>
                setsocialsMeta((prevState) => ({
                  ...prevState,
                  x: e.target.value,
                }))
              }
            />
          </div>
          <div className="indicator">
            <span className="indicator-item badge">Telegram</span>
            <input
              type="text"
              placeholder="Put your telegram"
              className="input input-bordered w-full md:w-[15vw]"
              onChange={(e) =>
                setsocialsMeta((prevState) => ({
                  ...prevState,
                  telegram: e.target.value,
                }))
              }
            />
          </div>
          <div className="indicator">
            <span className="indicator-item badge">Discord</span>
            <input
              type="text"
              placeholder="Put your discord"
              className="input input-bordered w-full md:w-[15vw]"
              onChange={(e) =>
                setsocialsMeta((prevState) => ({
                  ...prevState,
                  discord: e.target.value,
                }))
              }
            />
          </div>
        </div>
        <div>
          <div className="mockup-code bg-primary text-primary-content">
            <div className="px-5">
              <h1 className="font-semibold">Freeze Authorities</h1>
              <div className="px-5">
                <p className="font-extrathin">
                  Solana Token have 3 Authorities. Freeze Authority, Mint
                  Authority and Update Authority. Revoke them to attrack more
                  investors.
                </p>
              </div>
            </div>
            <div className="p-5 grid gap-3 grid-cols-1 md:grid-cols-3">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Freeze Authority</span>
                  <input
                    onChange={(e) =>
                      setFreezeAuthority((prevState) => !prevState)
                    }
                    type="checkbox"
                    defaultChecked={freezeAuthority}
                    className="checkbox"
                  />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Mint Authorities</span>
                  <input
                    onChange={(e) =>
                      setMintAuthority((prevState) => !prevState)
                    }
                    type="checkbox"
                    defaultChecked={mintAuthority}
                    className="checkbox"
                  />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Update Authorities</span>
                  <input
                    onChange={(e) =>
                      setUpdateAuthority((prevState) => !prevState)
                    }
                    type="checkbox"
                    defaultChecked={updateAuthority}
                    className="checkbox"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-around p-5 align-middle items-center">
          <button
            disabled={!bundlr}
            className="btn btn-outline"
            onClick={async () => {
              const metadata = await uploadMetadata();
              onClick({
                decimals: metadataJson.decimals,
                amount: metadataJson.amount,
                metadata: metadata,
                symbol: metadataJson.symbol,
                tokenName: metadataJson.name,
              });
            }}
          >
            Create
          </button>
          <div className="flex">
            <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-1">
              <div className="px-4 py-5">
                <Listbox value={selected} onChange={setSelected}>
                  {() => (
                    <>
                      <div className="mt-1 relative">
                        <Listbox.Button className="bg-white relative w-full border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                          <span className="block truncate">
                            {!selected ? "Select Network" : selected.network}
                          </span>
                          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                            <SelectorIcon
                              className="h-5 w-5 text-gray-400"
                              aria-hidden="true"
                            />
                          </span>
                        </Listbox.Button>

                        <Transition
                          as={Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Listbox.Options className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                            {bundlers.map((bundler) => (
                              <Listbox.Option
                                key={bundler.id}
                                className={({ active }) =>
                                  classNames(
                                    active
                                      ? "text-white bg-purple-500"
                                      : "text-gray-900",
                                    "cursor-default select-none relative py-2 pl-3 pr-9"
                                  )
                                }
                                value={bundler}
                              >
                                {({ selected, active }) => (
                                  <>
                                    <span
                                      className={classNames(
                                        selected
                                          ? "font-semibold"
                                          : "font-normal",
                                        "block truncate"
                                      )}
                                    >
                                      {bundler.network}
                                    </span>

                                    {selected ? (
                                      <span
                                        className={classNames(
                                          active
                                            ? "text-white"
                                            : "text-purple-500",
                                          "absolute inset-y-0 right-0 flex items-center pr-4"
                                        )}
                                      >
                                        <CheckIcon
                                          className="h-5 w-5"
                                          aria-hidden="true"
                                        />
                                      </span>
                                    ) : null}
                                  </>
                                )}
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </>
                  )}
                </Listbox>
              </div>
            </div>
            <div className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-1">
              <div className="px-4 py-5">
                <button
                  className="items-center px-3 py-2 text-xs btn animate-pulse bg-gradient-to-r from-[#9945FF] to-[#14F195] hover:from-pink-500 hover:to-yellow-500 ..."
                  onClick={async () => await initializeBundlr()}
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
};
