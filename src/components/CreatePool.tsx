import { DEVNET_PROGRAM_ID, Liquidity, TxVersion } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'
import React from 'react'
import { connection, wallet } from 'utils/util'
import BN from 'bn.js'
import { setAuthority } from '@solana/spl-token'

const CreatePool = () => {
    async function onClick() {
        const initPoolInstructionResponse = await Liquidity.makeCreatePoolV4InstructionV2Simple({
            connection: connection,
            programId: DEVNET_PROGRAM_ID.AmmV4,
            marketInfo: {
                marketId: new PublicKey("3MZYsHL2awnpSDu5myz6mUSJCDHqmgr84rMFVfphzQjn"),
                programId: DEVNET_PROGRAM_ID.OPENBOOK_MARKET
            },
            baseMintInfo: {
                mint: new PublicKey('6zTrCXKnsAbuuAze1zRCi1NS31DdyQZQoiTzARBqhcQF'),
                decimals: 9
            },
            quoteMintInfo: {
                mint: new PublicKey('42W5wAaUu1DkaHNVJfRPbKFPJEtcdWDfpTFEbF8oBcU1'),
                decimals: 9
            },
            baseAmount: 100,
            quoteAmount: 100,
            startTime: new BN(Math.floor(Date.now() / 1000)),
            ownerInfo: {
                feePayer: wallet.publicKey,
                wallet: wallet.publicKey,
                tokenAccounts: [],
                useSOLBalance: true,
              },
            associatedOnly: false,
            checkCreateATAOwner: true,
            makeTxVersion: TxVersion.V0,
            feeDestinationId: wallet.publicKey
        })
    }
  return (
    <div>CreatePool</div>
  )
}

export default CreatePool