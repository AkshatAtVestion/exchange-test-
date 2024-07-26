import React, { useState, useEffect } from 'react';
import './App.css';
import Web3Modal from "web3modal";
import { ethers } from "ethers";
import { Web3Provider } from "@ethersproject/providers";
import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import Exchange_abi from "./Exchange_abi.json";
import { Analytics } from "@vercel/analytics/react";

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
  const [balance, setBalane] = useState('');
  const [contract, setContract] = useState(null);
  const [VESprice, setVESprice] = useState(null);
  const [rate, setRate] = useState(null);
  const [tokensToBuy, setTokensToBuy] = useState('');
  const [buyingError, setBuyingError] = useState('');
  const [transactionStatus, setTransactionStatus] = useState('');
  const [displayedPrice, setDisplayedPrice] = useState('rate');
  const [totalSupply, setTotalSupply] = useState('');
  const [cost, setCost] = useState('');
  const [inputValue, setInputValue] = useState('')
  const [transactionDetails, setTransactionDetails] = useState('', '');
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
        console.log("transaction details: ", buyer, Number(tokensBought));
        setTransactionDetails(buyer, tokensBought);
      };

      contract.on("tokensBought", handleTokensBought);

      return () => {
        contract.off("tokensBought", handleTokensBought);
      };
    }
  }, [contract]);

  useEffect(() => {
    let interval;
    if (connected) {
      interval = setInterval(() => {
        setDisplayedPrice(prev => prev === 'rate' ? 'price' : 'rate');
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [connected]);

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
      const rateValue = await getRate(Contract);
      const priceValue = await getPrice(Contract);
      setRate(rateValue);
      setVESprice(priceValue);
      const supply = await getTotalSupply(Contract);
      console.log(supply);
      setTotalSupply(supply);
      getWalletBalance(web3ModalProvider);
    } catch (error) {
      console.error(error);
    }
  }

  async function getWalletBalance(provider) {
    try {
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);
      const balanceInEther = parseFloat(balance.toString() / (10 ** 18));
      setBalane(balanceInEther);
    } catch (error) {
      console.error("error getting the balance: ", error);
    }

  }

  const getPrice = async (contract) => {
    try {
      let currentPrice = await contract.getPrice();
      //return currentPrice.toString();
      let priceInEth = Number(currentPrice) / 10 ** 18;
      return priceInEth;
    } catch (error) {
      console.error("error getting the price: ", error);
      return null;
    }
  }

  const getRate = async (contract) => {
    try {
      let currentRate = await contract.rate();
      const temp = 1 / Number(currentRate);
      return temp.toString();
    } catch (error) {
      console.error("error getting the rate:", error);
      return null;
    }
  }

  const getAmount = async (tokensToBuy) => {
    try {
      setTokensToBuy(tokensToBuy);
      let amount = await contract.getAmount(tokensToBuy);
      console.log('calculating amount to pay...')
      let amountToPay = Number(amount);
      setCost(amountToPay);
      console.log(amountToPay);
      //return amount; 
    } catch (error) {
      console.error('error getting the amoount: ', error);
    }
  }

  const getTotalSupply = async (contract) => {
    try {
      let currentSupply = await contract.totalDeposited();
      return Number(currentSupply);
    } catch (error) {
      console.error("error getting the total supply", error);
      return null;
    }
  }

  const handleBuyTokens = async (event) => {
    event.preventDefault();
    setBuyingError('');
    setTransactionStatus("transaction pending...");
    try {
      const value = await contract.getAmount(tokensToBuy);
      await contract.buyTokens(tokensToBuy, { value });
      setTokensToBuy('');
      const updatedSupply = await getTotalSupply(contract);
      setTotalSupply(updatedSupply);
      setTransactionStatus('transaction successful');

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
          {connected ? 'Wallet Connected!' : 'Connect Wallet'}
        </button>
        {balance && <p>{balance} ETH</p>}
        {connected && <p>VES price = {displayedPrice === 'rate' ? `$ ${rate}` : `${VESprice} ETH`}</p>}
        {connected && <p>Total Supply = {totalSupply}</p>}
        <form onSubmit={handleBuyTokens}>
          <input
            type='number'
            placeholder='Enter the amount of tokens to buy'
            value={tokensToBuy}
            onChange={(e) => getAmount(e.target.value)}
            required />
          <button type='submit'>Buy</button>
        </form>
        {cost && <p>{cost} Wei</p>}
        {buyingError && <p>Error: {buyingError}</p>}
        {transactionStatus && <p>{transactionStatus}</p>}
        {transactionDetails && <p>{transactionDetails[1]} || {transactionDetails[2]}</p>}
        <Analytics />
      </header>
    </div>
  );
}

export default App;
