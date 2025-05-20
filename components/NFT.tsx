"use client";

import { Contract, ethers, JsonRpcProvider } from "ethers";
import { useEffect, useState } from "react";
import React from "react";
import axios, { AxiosResponse } from "axios";

type NFTMeta = {
  name: string;
  img: string;
  tokenId: number;
  desc: string;
  balance: bigint;
};

type Metadata = {
  name?: string;
  image?: string;
  description?: string;
};

export default function NFT() {
  const NFTCollection = [
    "function uri(uint256 tokenId) view returns (string memory)",
    "function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])",
  ];

  const [walletAddress, setwalletAddress] = useState<string>("");

  const [contractAddress, setContractAddress] = useState<string>("");

  const knownTokenIds = [...Array(10).keys()];

  const [nfts, setNfts] = useState<NFTMeta[]>([]);
  const [loadingState, setLoadingState] = useState(false);

  useEffect(() => {
    const savedWallet = localStorage.getItem("walletAddress");
    if (savedWallet) {
      setwalletAddress(savedWallet);
    }
    const savedContract = localStorage.getItem("contractAddress");
    if (savedContract) {
      setContractAddress(savedContract);
    }
  }, []);

  useEffect(() => {
    if (ethers.isAddress(contractAddress) && ethers.isAddress(walletAddress)) {
      localStorage.setItem("walletAddress", walletAddress);
      localStorage.setItem("contractAddress", contractAddress);
      generateNft();
    }
  }, [contractAddress, walletAddress]);

  async function fetchMetadata(uri: string): Promise<Metadata | null> {
    try {
      const cleanUri = ipfsToHttp(uri);
      const response: AxiosResponse<Metadata> = await axios.get(cleanUri);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch metadata:", error);
      return null; // Ou gérer l'erreur autrement
    }
  }

  const ipfsToHttp = (uri: string) =>
    uri.replace("ipfs://", "https://ipfs.io/ipfs/");

  async function generateNft() {
    setLoadingState(true);
    const provider = new JsonRpcProvider("https://1rpc.io/sepolia");
    const contract = new Contract(contractAddress, NFTCollection, provider);

    const addresses = knownTokenIds.map(() => walletAddress); // même wallet pour chaque tokenId

    const balances = await contract.balanceOfBatch(addresses, knownTokenIds);

    const itemArray = [];

    console.log(balances);

    //Fetch uri
    for (let i = 0; i < knownTokenIds.length; i++) {
      const balance = balances[i];

      const balanceBigInt = BigInt(balance.toString());
      console.log(balanceBigInt);

      if (balanceBigInt > BigInt(0)) {
        const uri = await contract.uri(i);
        const uriUpdate = uri.replace("{id}", i) ?? "";

        console.log(uri);
        const metadata = await fetchMetadata(uriUpdate);
        console.log(metadata);

        const image = ipfsToHttp(metadata?.image ?? "");
        const name = metadata?.name ?? "No name";
        const desc = metadata?.description ?? "No description";

        itemArray.push({
          name: name,
          img: image,
          tokenId: i,
          desc,
          balance: balanceBigInt,
        });
      }
    }

    setNfts(itemArray);
    setLoadingState(false);
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-6">NFT Collection</h1>
      {loadingState ? (
        <p>Chargement des NFTs...</p>
      ) : (
        <div className="flex flex-col w-full">
          <div className="mb-6">
            <label
              htmlFor="contract"
              className="block text-sm font-medium  mb-1"
            >
              Adresse du wallet
            </label>
            <input
              id="contract"
              type="text"
              value={walletAddress}
              onChange={(e) => setwalletAddress(e.target.value)}
              placeholder="0x..."
              className="w-full border rounded-md px-4 py-2 shadow-sm focus:ring focus:ring-blue-300"
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="contract"
              className="block text-sm font-medium  mb-1"
            >
              Adresse du contrat
            </label>
            <input
              id="contract"
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              placeholder="0x..."
              className="w-full border rounded-md px-4 py-2 shadow-sm focus:ring focus:ring-blue-300"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-black">
            {nfts.map((nft) => (
              <div
                key={nft.tokenId}
                className="border rounded-xl shadow-md p-4 bg-white"
              >
                <img
                  src={nft.img}
                  alt={nft.name}
                  className="rounded-lg  w-full aspect-square object-cover mb-4"
                />
                <h2 className="text-xl font-semibold">{nft.name}</h2>
                <p className="text-sm ">ID: {nft.tokenId}</p>
                <p className="text-gray-700">Desc: {nft.desc}</p>
                <p className="text-gray-700">Amount: {"x " + nft.balance}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
