import { AppProps } from "next/app";
import Head from "next/head";
import { FC } from "react";
import { ContextProvider } from "../contexts/ContextProvider";
import { AppBar } from "../components/AppBar";
import { ContentContainer } from "../components/ContentContainer";
import { Footer } from "../components/Footer";
import Notifications from "../components/Notification";
import { SerumProvider } from "../../context";

require("@solana/wallet-adapter-react-ui/styles.css");
require("../styles/globals.css");

const App: FC<AppProps> = ({ Component, pageProps }) => {
  return (
    <>
      <Head>
        <title>Solana Token Maker</title>
      </Head>

      <ContextProvider>
        <SerumProvider>
          <div className="flex flex-col h-screen">
            <Notifications />
            <AppBar />
            <ContentContainer>
              <Component {...pageProps} />
            </ContentContainer>
            <Footer />
          </div>
        </SerumProvider>
      </ContextProvider>
    </>
  );
};

export default App;
