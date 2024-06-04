import { FC } from "react";
import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useAutoConnect } from "../contexts/AutoConnectProvider";

import { Popover } from "@headlessui/react";
import Example from "./modal";

export const AppBar: FC = (props) => {
  const { autoConnect, setAutoConnect } = useAutoConnect();

  return (
    <div>
      {/* NavBar / Header */}
      <div className="navbar flex flex-row md:mb-2 shadow-lg bg-neutral text-neutral-content">
        <div className="navbar-start">
          <div className="hidden sm:inline w-22 h-22 md:p-2">
            <h1>Cyber Tools</h1>
          </div>
        </div>

        {/* Wallet & Settings */}
        <div className="navbar-end">
          <Link href="/">
            <a className="mr-8">Token Creator</a>
          </Link>
          <Link href="/update">
            <a className="mr-4">Update Metadata</a>
          </Link>
          <Link href="/uploader">
            <a className="mr-8">Upload Onchain</a>
          </Link>
          <Link href="/metadata">
            <a className="mr-4">Token Metadata</a>
          </Link>
          {/* <Link href="/revoke">
            <a className="mr-4">Revoke</a>
          </Link> */}
          <Link href="/market">
            <a className="mr-4">Market</a>
          </Link>
          <Example />
          <WalletMultiButton className="btn btn-ghost mr-4" />
        </div>
      </div>
      {props.children}
    </div>
  );
};
