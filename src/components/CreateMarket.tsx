import {
  ACCOUNT_SIZE,
  createInitializeAccountInstruction,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  getMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token-2";
import { DexInstructions, Market } from "@project-serum/serum";

import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  EVENT_QUEUE_LENGTH,
  getVaultOwnerAndNonce,
  ORDERBOOK_LENGTH,
  REQUEST_QUEUE_LENGTH,
} from "../../utils/serum";
import BN from "bn.js";

import {
  sendSignedTransaction,
  signTransactions,
  TransactionWithSigners,
} from "../../utils/transaction";
import { OpenBookV2Client } from "@openbook-dex/openbook-v2";
import { SubmitHandler, useForm } from "react-hook-form";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { useSerum } from "../../context";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { tokenAtomicsToPrettyDecimal } from "../../utils/numerical";

import React, { useEffect, useState } from "react";
import useSerumMarketAccountSizes from "../../hooks/useSerumMarketAccountSizes";
import TransactionToast from "../../components/common/Toasts/TransactionToast";

import {
  addLookupTableInfo,
  buildAndSendTx,
  getWalletTokenAccount,
  sendTransactions,
  wallet,
} from "utils/util";
import useRentExemption from "../../hooks/useRentExemption";
import ExistingMintForm from "../../components/createMarket/ExistingMintForm";
import TickerForm from "../../components/createMarket/TickerForm";
import AdvancedOptionsForm from "../../components/createMarket/AdvancedOptionsForm";

const TRANSACTION_MESSAGES = [
  {
    sendingMessage: "Creating mints.",
    successMessage: "Created mints successfully.",
  },
  {
    sendingMessage: "Creating vaults.",
    successMessage: "Created vaults successfully.",
  },
  {
    sendingMessage: "Creating market.",
    successMessage: "Created market successfully.",
  },
];

type NewMintFormValues = {
  baseDecimals: number;
  quoteDecimals: number;
  baseAuthority: string;
  quoteAuthority: string;
};

type ExistingMintFormValues = {
  baseMint: string;
  quoteMint: string;
};

export type CreateMarketFormValues = {
  createMint: boolean;
  newMints?: NewMintFormValues;
  existingMints?: ExistingMintFormValues;
  lotSize: number;
  useAdvancedOptions: boolean;
  tickSize: number;
  eventQueueLength: number;
  requestQueueLength: number;
  orderbookLength: number;
};

const CreateMarket = () => {
  const router = useRouter();

  const { connection } = useConnection();
  const wallet = useWallet();

  const { programID } = useSerum();

  const { register, handleSubmit, watch, setValue, formState, clearErrors } =
    useForm<CreateMarketFormValues>({
      defaultValues: {
        createMint: true,
      },
    });

  const createMint = watch("createMint");
  const useAdvancedOptions = watch("useAdvancedOptions");

  const eventQueueLength = watch("eventQueueLength");
  const requestQueueLength = watch("requestQueueLength");
  const orderbookLength = watch("orderbookLength");

  const mintRent = useRentExemption(createMint ? MINT_SIZE : 0);
  const vaultRent = useRentExemption(ACCOUNT_SIZE);

  const {
    marketRent,
    totalEventQueueSize,
    totalOrderbookSize,
    totalRequestQueueSize,
  } = useSerumMarketAccountSizes({
    eventQueueLength,
    requestQueueLength,
    orderbookLength,
  });

  useEffect(() => {
    if (!useAdvancedOptions) {
      setValue("eventQueueLength", EVENT_QUEUE_LENGTH);
      setValue("requestQueueLength", REQUEST_QUEUE_LENGTH);
      setValue("orderbookLength", ORDERBOOK_LENGTH);
    }
  }, [useAdvancedOptions, setValue]);

  useEffect(() => {
    if (createMint) {
      setValue("existingMints", undefined);
      clearErrors("existingMints");
    } else {
      setValue("newMints", undefined);
      clearErrors("newMints");
    }
  }, [createMint, setValue, clearErrors]);

  // TODO: refactor somewhere else
  const handleCreateMarket: SubmitHandler<CreateMarketFormValues> = async (
    data
  ) => {
    if (!wallet || !wallet.publicKey) {
      toast.error("Wallet not connected");
      return;
    }

    let baseMintKeypair: Keypair | undefined;
    let baseMint: PublicKey;
    let baseMintDecimals: number;

    let quoteMintKeypair: Keypair | undefined;
    let quoteMint: PublicKey;
    let quoteMintDecimals: number;

    const mintInstructions: TransactionInstruction[] = [];
    const mintSigners: Keypair[] = [];

    const vaultInstructions: TransactionInstruction[] = [];
    const vaultSigners: Keypair[] = [];

    const marketInstructions: TransactionInstruction[] = [];
    const marketSigners: Keypair[] = [];

    // validate existing mints
      try {
        const baseMintInfo = await getMint(
          connection,
          new PublicKey(data.existingMints!.baseMint)
        );
        baseMint = baseMintInfo.address;
        baseMintDecimals = baseMintInfo.decimals;

        const quoteMintInfo = await getMint(
          connection,
          new PublicKey(data.existingMints!.quoteMint)
        );
        quoteMint = quoteMintInfo.address;
        quoteMintDecimals = quoteMintInfo.decimals;
      } catch (e) {
        toast.error("Invalid mints provided.");
        return;
      }

    const marketAccounts = {
      market: Keypair.generate(),
      requestQueue: Keypair.generate(),
      eventQueue: Keypair.generate(),
      bids: Keypair.generate(),
      asks: Keypair.generate(),
      baseVault: Keypair.generate(),
      quoteVault: Keypair.generate(),
    };

    const [vaultOwner, vaultOwnerNonce] = await getVaultOwnerAndNonce(
      marketAccounts.market.publicKey,
      programID
    );

    // create vaults
    vaultInstructions.push(
      ...[
        SystemProgram.createAccount({
          fromPubkey: wallet.publicKey,
          newAccountPubkey: marketAccounts.baseVault.publicKey,
          lamports: await connection.getMinimumBalanceForRentExemption(
            ACCOUNT_SIZE
          ),
          space: ACCOUNT_SIZE,
          programId: TOKEN_PROGRAM_ID,
        }),
        SystemProgram.createAccount({
          fromPubkey: wallet.publicKey,
          newAccountPubkey: marketAccounts.quoteVault.publicKey,
          lamports: await connection.getMinimumBalanceForRentExemption(
            ACCOUNT_SIZE
          ),
          space: ACCOUNT_SIZE,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeAccountInstruction(
          marketAccounts.baseVault.publicKey,
          baseMint,
          vaultOwner
        ),
        createInitializeAccountInstruction(
          marketAccounts.quoteVault.publicKey,
          quoteMint,
          vaultOwner
        ),
      ]
    );

    vaultSigners.push(marketAccounts.baseVault, marketAccounts.quoteVault);

    // tickSize and lotSize here are the 1e^(-x) values, so no check for ><= 0
    const baseLotSize = Math.round(
      10 ** baseMintDecimals * Math.pow(10, -1 * data.lotSize)
    );
    const quoteLotSize = Math.round(
      10 ** quoteMintDecimals *
        Math.pow(10, -1 * data.lotSize) *
        Math.pow(10, -1 * data.tickSize)
    );

    // create market account
    marketInstructions.push(
      SystemProgram.createAccount({
        newAccountPubkey: marketAccounts.market.publicKey,
        fromPubkey: wallet.publicKey,
        space: Market.getLayout(programID).span,
        lamports: await connection.getMinimumBalanceForRentExemption(
          Market.getLayout(programID).span
        ),
        programId: programID,
      })
    );

    // create request queue
    marketInstructions.push(
      SystemProgram.createAccount({
        newAccountPubkey: marketAccounts.requestQueue.publicKey,
        fromPubkey: wallet.publicKey,
        space: totalRequestQueueSize,
        lamports: await connection.getMinimumBalanceForRentExemption(
          totalRequestQueueSize
        ),
        programId: programID,
      })
    );

    // create event queue
    marketInstructions.push(
      SystemProgram.createAccount({
        newAccountPubkey: marketAccounts.eventQueue.publicKey,
        fromPubkey: wallet.publicKey,
        space: totalEventQueueSize,
        lamports: await connection.getMinimumBalanceForRentExemption(
          totalEventQueueSize
        ),
        programId: programID,
      })
    );

    const orderBookRentExempt =
      await connection.getMinimumBalanceForRentExemption(totalOrderbookSize);

    // create bids
    marketInstructions.push(
      SystemProgram.createAccount({
        newAccountPubkey: marketAccounts.bids.publicKey,
        fromPubkey: wallet.publicKey,
        space: totalOrderbookSize,
        lamports: orderBookRentExempt,
        programId: programID,
      })
    );

    // create asks
    marketInstructions.push(
      SystemProgram.createAccount({
        newAccountPubkey: marketAccounts.asks.publicKey,
        fromPubkey: wallet.publicKey,
        space: totalOrderbookSize,
        lamports: orderBookRentExempt,
        programId: programID,
      })
    );

    marketSigners.push(
      marketAccounts.market,
      marketAccounts.requestQueue,
      marketAccounts.eventQueue,
      marketAccounts.bids,
      marketAccounts.asks
    );

    marketInstructions.push(
      DexInstructions.initializeMarket({
        market: marketAccounts.market.publicKey,
        requestQueue: marketAccounts.requestQueue.publicKey,
        eventQueue: marketAccounts.eventQueue.publicKey,
        bids: marketAccounts.bids.publicKey,
        asks: marketAccounts.asks.publicKey,
        baseVault: marketAccounts.baseVault.publicKey,
        quoteVault: marketAccounts.quoteVault.publicKey,
        baseMint,
        quoteMint,
        baseLotSize: new BN(baseLotSize),
        quoteLotSize: new BN(quoteLotSize),
        feeRateBps: 150, // Unused in v3
        quoteDustThreshold: new BN(500), // Unused in v3
        vaultSignerNonce: vaultOwnerNonce,
        programId: programID,
      })
    );

    const transactionWithSigners: TransactionWithSigners[] = [];
    if (mintInstructions.length > 0) {
      transactionWithSigners.push({
        transaction: new Transaction().add(...mintInstructions),
        signers: mintSigners,
      });
    }
    transactionWithSigners.push(
      {
        transaction: new Transaction().add(...vaultInstructions),
        signers: vaultSigners,
      },
      {
        transaction: new Transaction().add(...marketInstructions),
        signers: marketSigners,
      }
    );

    try {
      const signedTransactions = await signTransactions({
        transactionsAndSigners: transactionWithSigners,
        wallet,
        connection,
      });

      // looping creates weird indexing issue with transactionMessages
      await sendSignedTransaction({
        signedTransaction: signedTransactions[0],
        connection,
        skipPreflight: false,
        successCallback: async (txSig) => {
          toast(
            () => (
              <TransactionToast
                txSig={txSig}
                message={
                  signedTransactions.length > 2
                    ? TRANSACTION_MESSAGES[0].successMessage
                    : TRANSACTION_MESSAGES[1].successMessage
                }
              />
            ),
            { autoClose: 5000 }
          );
        },
        sendingCallback: async () => {
          toast.info(
            signedTransactions.length > 2
              ? TRANSACTION_MESSAGES[0].sendingMessage
              : TRANSACTION_MESSAGES[1].sendingMessage,
            {
              autoClose: 2000,
            }
          );
        },
      });
      await sendSignedTransaction({
        signedTransaction: signedTransactions[1],
        connection,
        skipPreflight: false,
        successCallback: async (txSig) => {
          toast(
            () => (
              <TransactionToast
                txSig={txSig}
                message={
                  signedTransactions.length > 2
                    ? TRANSACTION_MESSAGES[1].successMessage
                    : TRANSACTION_MESSAGES[2].successMessage
                }
              />
            ),
            { autoClose: 5000 }
          );
        },
        sendingCallback: async () => {
          toast.info(
            signedTransactions.length > 2
              ? TRANSACTION_MESSAGES[1].sendingMessage
              : TRANSACTION_MESSAGES[2].sendingMessage,
            {
              autoClose: 2000,
            }
          );
        },
      });

      if (signedTransactions.length > 2) {
        await sendSignedTransaction({
          signedTransaction: signedTransactions[2],
          connection,
          skipPreflight: false,
          successCallback: async (txSig) => {
            toast(
              () => (
                <TransactionToast
                  txSig={txSig}
                  message={TRANSACTION_MESSAGES[2].successMessage}
                />
              ),
              { autoClose: 5000 }
            );
          },
          sendingCallback: async () => {
            toast.info(TRANSACTION_MESSAGES[2].sendingMessage, {
              autoClose: 2000,
            });
          },
        });
      }

      router.push({
        pathname: `market/${marketAccounts.market.publicKey.toBase58()}`,
        query: router.query,
      });
    } catch (e) {
      console.error("[explorer]: ", e);
      toast.error("Failed to create market.");
    }
  };
  return (
    <form onSubmit={handleSubmit(handleCreateMarket)}>
      <div className="mockup-window bg-base-300 w-[82vw] m-auto mt-2 md:w-[85vw]">
        <div className="bg-base-200 p-5">
          <div>
            <div>
              <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-tr from-[#9945FF] to-[#14F195] p-10">
                Create Market
              </h1>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5">
            <ExistingMintForm register={register} formState={formState} />
            <TickerForm register={register} />
            <div className="grid grid-cols-1 md:grid-cols-2 justify-center items-center align-middle">
              <AdvancedOptionsForm
                useAdvancedOptions={useAdvancedOptions}
                register={register}
                setValue={setValue}
                formState={formState}
                totalMarketAccountSizes={{
                  totalEventQueueSize,
                  totalRequestQueueSize,
                  totalOrderbookSize,
                }}
              />
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-slate-200">
                  Advanced Options
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Configure sizes for the different accounts used to create the
                  market to adjust rent cost.
                </p>
                <div className="mt-6">
                  <div className="mb-1 flex items-center space-x-1">
                    <p className="text-xs text-slate-300">
                      Total Rent Estimate{" "}
                    </p>
                  </div>

                  <p className="text-lg text-cyan-400">
                    {tokenAtomicsToPrettyDecimal(
                      new BN(marketRent + vaultRent * 2 + mintRent * 2),
                      9
                    )}{" "}
                    SOL{" "}
                  </p>
                </div>
                <div className="flex justify-end w-full">
                  <button className="w-full md:max-w-xs rounded-lg p-2 bg-cyan-500 hover:bg-cyan-600 transition-colors disabled:opacity-20">
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* <div className="form-control pl-[6rem] w-[20%]">
            <label className="cursor-pointer label">
              <span className="label-text">Advance Options</span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                // onChange={(e) => {
                //   setisSocialsEnabled((prev) => !prev);
                // }}
              />
            </label>
          </div> */}
          {/* <div className="indicator">
              <span className="indicator-item badge">Event Queue Length</span>
              <input
                type="number"
                placeholder="Type here"
                className="input input-bordered w-full md:w-[19vw]"
                onChange={(e) => setTickSize(parseFloat(e.target.value))}
              />
            </div>
            <div className="indicator">
              <span className="indicator-item badge">Request Length</span>
              <input
                type="number"
                placeholder="Type here"
                className="input input-bordered w-full md:w-[19vw]"
                onChange={(e) => setTickSize(parseFloat(e.target.value))}
              />
            </div>
            <div className="indicator">
              <span className="indicator-item badge">Orderbook Length</span>
              <input
                type="number"
                placeholder="Type here"
                className="input input-bordered w-full md:w-[19vw]"
                onChange={(e) => setTickSize(parseFloat(e.target.value))}
              />
            </div>
          </div>
          <div className="flex justify-around p-5 align-middle items-center">
            <button className="btn btn-outline" onClick={onClick}>
              Create ({process.env.NEXT_PUBLIC_TOKEN_MARKET_CREATE_FEES_AMOUNT}{" "}
              SOL)
            </button>
          </div>
        </div> */}
        </div>
      </div>
    </form>
  );
};

export default CreateMarket;
