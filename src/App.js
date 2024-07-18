import React, { useState, useEffect } from 'react';
import './App.css';
import Web3Modal from "web3modal";
import { ethers } from "ethers";
import { Web3Provider } from "@ethersproject/providers";
import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import Exchange_abi from "./Exchange_abi.json";

const providerOptions = {
  walletlink: {
    package: CoinbaseWalletSDK,
    options: {
      appName: "Web3 Modal",
      infuraId: process.env.REACT_APP_INFURA_ID
    }
  }
};

function App() {
  const [provider, setProvider] = useState(null);
  const [connected, setConnected] = useState(false);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [VESprice, setVESprice] = useState(null);
  const [tokensToBuy, setTokensToBuy] = useState('');
  const [buyingError, setBuyingError] = useState('');
  const [transactionStatus, setTransactionStatus] = useState('');
  const contractAddress = "0xEB4d6210e4076aF5347Ab98625b5Bc0C7E71cFB7";

  useEffect(() => {
    if (provider) {
      console.log('Provider:', provider);
    }
  }, [provider]);

  useEffect(() => {
    if (contract) {
      const handleTokensBought = (buyer, tokensBought) => {
        setTransactionStatus('Transaction successful!');
      };

      contract.on("tokensBought", handleTokensBought);

      return () => {
        contract.off("tokensBought", handleTokensBought);
      };
    }
  }, [contract]);

  async function connectWallet() {
    try {
      const web3Modal = new Web3Modal({
        cacheProvider: false,
        providerOptions,
      });
      const web3ModalInstance = await web3Modal.connect();
      const web3ModalProvider = new Web3Provider(web3ModalInstance);
      const signer = web3ModalProvider.getSigner();
      const Contract = new ethers.Contract(contractAddress, Exchange_abi, signer);
      setProvider(web3ModalProvider);
      setSigner(signer);
      setContract(Contract);
      setConnected(true);
    } catch (error) {
      console.error(error);
    }
  }

  const getPrice = async () => {        // returns the price of VES token in eth
    try {
      let Currentprice = await contract.getPrice();
      setVESprice(Currentprice);
    } catch (error) {
      console.error("error getting the price: ", error);
    }
  }

  const handleBuyTokens = async (event) => {
    event.preventDefault();
    setBuyingError('');
    setTransactionStatus("transaction pending...");
    try {
      //const amountToBuy = ethers.utils.parseUnits(tokensToBuy, 18);
      const value = await contract.getAmount(tokensToBuy);
      console.log(value);
      await contract.buyTokens(tokensToBuy, { value });
      setTokensToBuy('');
    } catch (error) {
      console.error("error buying tokens: ", error);
      setBuyingError(error.message);
      setTransactionStatus('transaction failed');
    }
  };



  return (
    <div className="App">
      <header className="app-header">
        <h1>VES</h1>
        <button onClick={connectWallet}>
          {connected ? 'Wallet Connected!' : 'connect Wallet'}
        </button>
        <button onClick={getPrice}>Get VES price </button>
        <p>{VESprice ? `${VESprice} Wei` : ''}</p>
        <form onSubmit={handleBuyTokens}>
          <input
            type='number'
            placeholder='enter the amount of tokens to buy'
            value={tokensToBuy}
            onChange={(e) => setTokensToBuy(e.target.value)}
            required />
          <button type='submit'> Buy </button>
        </form>
        {buyingError && <p>Error: {buyingError}</p>}
        {transactionStatus && <p>{transactionStatus}</p>}
      </header>
    </div>
  );
}

export default App;

