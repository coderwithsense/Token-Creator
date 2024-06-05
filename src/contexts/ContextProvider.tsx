import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  GlowWalletAdapter,
  PhantomWalletAdapter,
  SlopeWalletAdapter,
  SolflareWalletAdapter,
  SolletExtensionWalletAdapter,
  SolletWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { useRouter } from "next/router";
import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { WalletAdapterNetwork, WalletError } from "@solana/wallet-adapter-base";
import { AutoConnectProvider, useAutoConnect } from "./AutoConnectProvider";
import { notify } from "../utils/notifications";

export type ClusterType = "mainnet-beta" | "testnet" | "devnet" | "custom";

export type SolanaCluster = {
  label: string;
  network: ClusterType;
  endpoint: string;
};

type SolanaContextType = {
  cluster: SolanaCluster;
  setCluster: (cluster: SolanaCluster) => void;
  customEndpoint: string;
  setCustomEndpoint: (endpoint: string) => void;
  isActiveCluster: (selectedCluster: SolanaCluster) => boolean;
};

type SolanaProviderProps = {
  children: ReactNode;
};

const SolanaContext = createContext<SolanaContextType | null>(null);

export const CLUSTER_LOCAL_STORAGE_KEY = "cluster-serum-explorer";

export const LOCALNET_URL = "http://localhost:8899/";

export const CLUSTERS: SolanaCluster[] = [
  {
    label: "Mainnet Beta",
    network: "mainnet-beta",
    endpoint:
      process.env.NEXT_PUBLIC_MAINNET_URL || clusterApiUrl("mainnet-beta"),
  },
  {
    label: "Testnet",
    network: "testnet",
    endpoint: clusterApiUrl("testnet"),
  },
  {
    label: "Devnet",
    network: "devnet",
    endpoint: clusterApiUrl("devnet"),
  },
  {
    label: "Custom RPC",
    network: "custom",
    endpoint: LOCALNET_URL,
  },
];

export const CUSTOM_RPC_CLUSTER = CLUSTERS[CLUSTERS.length - 1];

const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
  const [cluster, _setCluster] = useState(CLUSTERS[2]);
  const [customEndpoint, _setCustomEndpoint] = useState(LOCALNET_URL);

  const router = useRouter();
  const { autoConnect } = useAutoConnect();

  const endpoint = useMemo(() => {
    if (cluster.network === "custom") {
      return customEndpoint;
    }
    return cluster.endpoint;
  }, [cluster, customEndpoint]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new GlowWalletAdapter(),
      new SlopeWalletAdapter(),
      new TorusWalletAdapter(),
      new SolflareWalletAdapter(),
      new SolletWalletAdapter({ network: WalletAdapterNetwork.Devnet }),
      new SolletExtensionWalletAdapter({
        network: WalletAdapterNetwork.Devnet,
      }),
    ],
    []
  );

  const isActiveCluster = (selectedCluster: SolanaCluster): boolean => {
    return selectedCluster.label === cluster.label;
  };

  const setCluster = (cluster: SolanaCluster) => {
    const newQuery: {
      network?: string;
      customRPC?: string;
    } = {
      ...router.query,
      network: cluster.network,
    };

    if (cluster.network === "mainnet-beta") delete newQuery.network;

    if (cluster.network === "custom") newQuery.customRPC = LOCALNET_URL;
    else delete newQuery.customRPC;

    router.replace({
      query: newQuery,
    });
  };

  const setCustomEndpoint = (endpoint: string) => {
    if (cluster.network !== "custom") return;
    const newQuery: {
      customRPC?: string;
    } = {
      ...router.query,
      customRPC: endpoint,
    };
    router.replace({
      query: newQuery,
    });
  };

  const onError = useCallback((error: WalletError) => {
    notify({
      type: "error",
      message: error.message ? `${error.name}: ${error.message}` : error.name,
    });
    console.error(error);
  }, []);

  useEffect(() => {
    if (router.query.network) {
      _setCluster(
        CLUSTERS.filter((c) => c.network === router.query.network)[0]
      );
    } else _setCluster(CLUSTERS[0]);
  }, [router.query.network]);

  useEffect(() => {
    if (router.query.customRPC) {
      _setCluster({
        ...CLUSTERS[2],
        endpoint: router.query.customRPC as string,
      });
      _setCustomEndpoint(router.query.customRPC as string);
    }
  }, [router.query.customRPC]);
  useEffect(() => {
    console.log(cluster);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        onError={onError}
        autoConnect={autoConnect}
      >
        <WalletModalProvider>
          <SolanaContext.Provider
            value={{
              cluster,
              setCluster,
              customEndpoint,
              setCustomEndpoint,
              isActiveCluster,
            }}
          >
            {children}
          </SolanaContext.Provider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export const useSolana = () => {
  const solana = useContext(SolanaContext);

  if (!solana)
    throw new Error("Make sure you wrap your component with SolanaProvider");

  return solana;
};

export const ContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <AutoConnectProvider>
      <SolanaProvider>{children}</SolanaProvider>
    </AutoConnectProvider>
  );
};
