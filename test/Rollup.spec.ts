import * as utils from "../scripts/helpers/utils";
import { ethers } from "ethers";
import * as walletHelper from "../scripts/helpers/wallet";
const RollupCore = artifacts.require("Rollup");
const TestToken = artifacts.require("TestToken");
const DepositManager = artifacts.require("DepositManager");
const IMT = artifacts.require("IncrementalTree");
const RollupUtils = artifacts.require("RollupUtils");
// const EcVerify = artifacts.require("ECVerify");
import * as ethUtils from "ethereumjs-util";

contract("Rollup", async function (accounts) {
  var wallets: any;
  // Contract Instances
  let depositManagerInstance: any;
  let testTokenInstance: any;
  let rollupCoreInstance: any;
  let testToken: any;
  let RollupUtilsInstance: any;
  let tokenRegistryInstance: any;
  let IMTInstance: any;

  let aa: any;
  let ab: any;
  let ac: any;
  // Users
  let Alice: any;

  let Bob: any;


  before(async function () {
    wallets = walletHelper.generateFirstWallets(walletHelper.mnemonics, 10);
    depositManagerInstance = await DepositManager.deployed();
    testTokenInstance = await TestToken.deployed();
    rollupCoreInstance = await RollupCore.deployed();
    testToken = await TestToken.deployed();
    RollupUtilsInstance = await RollupUtils.deployed();
    tokenRegistryInstance = await utils.getTokenRegistry();
    IMTInstance = await IMT.deployed();

    Alice = {
      Address: wallets[0].getAddressString(),
      Pubkey: wallets[0].getPublicKeyString(),
      Amount: 10,
      TokenType: 1,
      AccID: 1,
      Path: "2",
    };

    Bob = {
      Address: wallets[1].getAddressString(),
      Pubkey: wallets[1].getPublicKeyString(),
      Amount: 10,
      TokenType: 1,
      AccID: 2,
      Path: "3",
    };
  });
  
  // test if we are able to create append a leaf
  it("make a deposit of 2 accounts", async function () {
    await tokenRegistryInstance.requestTokenRegistration(testToken.address, {
      from: wallets[0].getAddressString(),
    });
    await tokenRegistryInstance.finaliseTokenRegistration(testToken.address, {
      from: wallets[0].getAddressString(),
    });
    await testToken.approve(
      depositManagerInstance.address,
      web3.utils.toWei("1"),
      {
        from: wallets[0].getAddressString(),
      }
    );

    var coordinator =
      "0x012893657d8eb2efad4de0a91bcd0e39ad9837745dec3ea923737ea803fc8e3d";
    var maxSize = 4;

    await testTokenInstance.transfer(Alice.Address, 100);
    var AliceAccountLeaf = utils.CreateAccountLeaf(
      Alice.AccID,
      Alice.Amount,
      0,
      Alice.TokenType
    );
    await depositManagerInstance.deposit(
      Alice.Amount,
      Alice.TokenType,
      Alice.Pubkey
    );
    var BobAccountLeaf = utils.CreateAccountLeaf(
      Bob.AccID,
      Bob.Amount,
      0,
      Bob.TokenType
    );
    await depositManagerInstance.depositFor(
      Bob.Address,
      Bob.Amount,
      Bob.TokenType,
      Bob.Pubkey
    );

    var subtreeDepth = 1;

    // finalise the deposit back to the state tree
    var path = "001";
    var defaultHashes = await utils.defaultHashes(maxSize);
    var siblingsInProof = [
      utils.getParentLeaf(coordinator, defaultHashes[0]),
      defaultHashes[2],
      defaultHashes[3],
    ];

    var _zero_account_mp = {
      accountIP: {
        pathToAccount: path,
        account: {
          ID: 0,
          tokenType: 0,
          balance: 0,
          nonce: 0,
        },
      },
      siblings: siblingsInProof,
    };

    // var newRoot = await utils.genMerkleRootFromSiblings(
    //   siblingsInProof,
    //   path,
    //   utils.getParentLeaf(AliceAccountLeaf, BobAccountLeaf)
    // );

    // // TODO make this 0
    // var txs: string[] = [
    //   "0x012893657d8eb2efad4de0a91bcd0e39ad9837745dec3ea923737ea803fc8e3d",
    // ];

    await rollupCoreInstance.finaliseDepositsAndSubmitBatch(
      subtreeDepth,
      _zero_account_mp
    );
  });

  it("submit new 1st batch", async function () {
    var MTutilsInstance = await utils.getMerkleTreeUtils();
    var Alice = {
      Address: wallets[0].getAddressString(),
      Pubkey: wallets[0].getPublicKeyString(),
      Amount: 10,
      TokenType: 1,
      AccID: 2,
      Path: "2",
    };
    var Bob = {
      Address: wallets[1].getAddressString(),
      Pubkey: wallets[1].getPublicKeyString(),
      Amount: 10,
      TokenType: 1,
      AccID: 3,
      Path: "3",
    };
    console.log(Alice)
    console.log(Bob)
    var coordinator =
      "0x012893657d8eb2efad4de0a91bcd0e39ad9837745dec3ea923737ea803fc8e3d";
    var coordinatorPubkeyHash =
      "0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563";
    var maxSize = 4;
    var AliceAccountLeaf = utils.CreateAccountLeaf(
      Alice.AccID,
      Alice.Amount,
      0,
      Alice.TokenType
    );
    var BobAccountLeaf = utils.CreateAccountLeaf(
      Bob.AccID,
      Bob.Amount,
      0,
      Bob.TokenType
    );

    // make a transfer between alice and bob's account
    var tranferAmount = 1;
    // var NewAliceAccountLeaf = utils.CreateAccountLeaf(
    //   Alice.AccID,
    //   Alice.Amount - tranferAmount,
    //   1,
    //   Alice.TokenType
    // );

    // var NewBobAccountLeaf = utils.CreateAccountLeaf(
    //   Bob.AccID,
    //   Bob.Amount + tranferAmount,
    //   1,
    //   Bob.TokenType
    // );

    // prepare data for process Tx
    var currentRoot = await rollupCoreInstance.getLatestBalanceTreeRoot();
    console.log("currentRoot", currentRoot)

    var accountRoot = await IMTInstance.getTreeRoot();
    var zeroHashes: any = await utils.defaultHashes(maxSize);

    var AlicePDAsiblings = [
      utils.PubKeyHash(Bob.Pubkey),
      utils.getParentLeaf(coordinatorPubkeyHash, coordinatorPubkeyHash),
      zeroHashes[2],
      zeroHashes[3],
    ];

    var BobPDAsiblings = [
      utils.PubKeyHash(Alice.Pubkey),
      utils.getParentLeaf(
        coordinatorPubkeyHash,
        utils.PubKeyHash(Alice.Pubkey)
      ),
      zeroHashes[2],
      zeroHashes[3],
    ];
    console.log(AlicePDAsiblings, BobPDAsiblings)

    var alicePDAProof = {
      _pda: {
        pathToPubkey: "2",
        pubkey_leaf: { pubkey: Alice.Pubkey },
      },
      siblings: AlicePDAsiblings,
    };

    var isValid = await MTutilsInstance.verifyLeaf(
      accountRoot,
      utils.PubKeyHash(Alice.Pubkey),
      "2",
      AlicePDAsiblings
    );
    assert.equal(isValid, true, "pda proof wrong");

    var bobPDAProof = {
      _pda: {
        pathToPubkey: "2",
        pubkey_leaf: { pubkey: Bob.Pubkey },
      },
      siblings: BobPDAsiblings,
    };

    var tx = {
      fromIndex: Alice.AccID,
      toIndex: Bob.AccID,
      tokenType: Alice.TokenType,
      // tokenType: "2",
      amount: tranferAmount,
      // amount: 0,
      signature:
        "0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563",
    };
    var dataToSign = await RollupUtilsInstance.getTxHash(
      tx.fromIndex,
      tx.toIndex,
      tx.tokenType,
      tx.amount
    );

    const h = ethUtils.toBuffer(dataToSign);
    var signature = ethUtils.ecsign(h, wallets[0].getPrivateKey());
    tx.signature = ethUtils.toRpcSig(signature.v, signature.r, signature.s);

    // alice balance tree merkle proof
    var AliceAccountSiblings: Array<string> = [
      BobAccountLeaf,
      utils.getParentLeaf(coordinator, zeroHashes[0]),
      zeroHashes[2],
      zeroHashes[3],
    ];
    var leaf = AliceAccountLeaf;
    var AliceAccountPath: string = "2";
    var isValid = await MTutilsInstance.verifyLeaf(
      currentRoot,
      leaf,
      AliceAccountPath,
      AliceAccountSiblings
    );
    expect(isValid).to.be.deep.eq(true);
    var AliceAccountMP = {
      accountIP: {
        pathToAccount: AliceAccountPath,
        account: {
          ID: Alice.AccID,
          tokenType: Alice.TokenType,
          balance: Alice.Amount,
          nonce: 0,
        },
      },
      siblings: AliceAccountSiblings,
    };

    var UpdatedAliceAccountLeaf = utils.CreateAccountLeaf(
      Alice.AccID,
      Alice.Amount - tx.amount,
      0,
      Alice.TokenType
    );
    aa = UpdatedAliceAccountLeaf;
    console.log("UpdatedAliceAccountLeaf", aa)

    // bob balance tree merkle proof
    var BobAccountSiblings: Array<string> = [
      UpdatedAliceAccountLeaf,
      utils.getParentLeaf(coordinator, zeroHashes[0]),
      zeroHashes[2],
      zeroHashes[3],
    ];
    var leaf = BobAccountLeaf;
    var BobAccountPath: string = "3";
    var isBobValid = await MTutilsInstance.verifyLeaf(
      currentRoot,
      leaf,
      BobAccountPath,
      BobAccountSiblings
    );

    var BobAccountMP = {
      accountIP: {
        pathToAccount: BobAccountPath,
        account: {
          ID: Bob.AccID,
          tokenType: Bob.TokenType,
          balance: Bob.Amount,
          nonce: 0,
        },
      },
      siblings: BobAccountSiblings,
    };

    // process transaction validity with process tx
    var result = await rollupCoreInstance.processTx(
      currentRoot,
      accountRoot,
      tx,
      alicePDAProof,
      AliceAccountMP,
      BobAccountMP
    );

    console.log("result from processTx: " + JSON.stringify(result));

    var compressedTx = await utils.compressTx(
      tx.fromIndex,
      tx.toIndex,
      tx.amount,
      tx.tokenType,
      tx.signature
    );
    let compressedTxs: string[] = [];
    compressedTxs.push(compressedTx);
    console.log("compressedTx: " + JSON.stringify(compressedTxs));
    console.log("result", result);

    // submit batch for that transactions
    await rollupCoreInstance.submitBatch(
      compressedTxs,
      "0xb6b4b5c6cb43071b3913b1d500b33c52392f7aa85f8a451448e20c3967f2b21a"
    );
  });

  it("submit new 2nd batch", async function () {
    var MTutilsInstance = await utils.getMerkleTreeUtils();
    var Alice = {
      Address: wallets[0].getAddressString(),
      Pubkey: wallets[0].getPublicKeyString(),
      Amount: 9,
      TokenType: 1,
      AccID: 2,
      Path: "2",
    };
    var Bob = {
      Address: wallets[1].getAddressString(),
      Pubkey: wallets[1].getPublicKeyString(),
      Amount: 11,
      TokenType: 1,
      AccID: 3,
      Path: "3",
    };
    console.log(Alice)
    console.log(Bob)
    var coordinator =
      "0x012893657d8eb2efad4de0a91bcd0e39ad9837745dec3ea923737ea803fc8e3d";
    var coordinatorPubkeyHash =
      "0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563";
    var maxSize = 4;
    var AliceAccountLeaf = utils.CreateAccountLeaf(
      Alice.AccID,
      Alice.Amount,
      0,
      Alice.TokenType
    );
    var BobAccountLeaf = utils.CreateAccountLeaf(
      Bob.AccID,
      Bob.Amount,
      0,
      Bob.TokenType
    );
    ab = AliceAccountLeaf;
    console.log("AliceAccountLeaf", ab)
    console.log(aa == ab)
    
    // make a transfer between alice and bob's account
    var tranferAmount = 1;
    // var NewAliceAccountLeaf = utils.CreateAccountLeaf(
    //   Alice.AccID,
    //   Alice.Amount - tranferAmount,
    //   1,
    //   Alice.TokenType
    // );

    // var NewBobAccountLeaf = utils.CreateAccountLeaf(
    //   Bob.AccID,
    //   Bob.Amount + tranferAmount,
    //   1,
    //   Bob.TokenType
    // );

    // prepare data for process Tx
    var currentRoot = await rollupCoreInstance.getLatestBalanceTreeRoot();
    console.log("currentRoot", currentRoot)
    var accountRoot = await IMTInstance.getTreeRoot();
    var zeroHashes: any = await utils.defaultHashes(maxSize);

    var AlicePDAsiblings = [
      utils.PubKeyHash(Bob.Pubkey),
      utils.getParentLeaf(coordinatorPubkeyHash, coordinatorPubkeyHash),
      zeroHashes[2],
      zeroHashes[3],
    ];

    var BobPDAsiblings = [
      utils.PubKeyHash(Alice.Pubkey),
      utils.getParentLeaf(
        coordinatorPubkeyHash,
        utils.PubKeyHash(Alice.Pubkey)
      ),
      zeroHashes[2],
      zeroHashes[3],
    ];
    console.log(AlicePDAsiblings, BobPDAsiblings)

    var alicePDAProof = {
      _pda: {
        pathToPubkey: "2",
        pubkey_leaf: { pubkey: Alice.Pubkey },
      },
      siblings: AlicePDAsiblings,
    };

    var isValid = await MTutilsInstance.verifyLeaf(
      accountRoot,
      utils.PubKeyHash(Alice.Pubkey),
      "2",
      AlicePDAsiblings
    );
    assert.equal(isValid, true, "pda proof wrong");

    var bobPDAProof = {
      _pda: {
        pathToPubkey: "2",
        pubkey_leaf: { pubkey: Bob.Pubkey },
      },
      siblings: BobPDAsiblings,
    };

    var tx = {
      fromIndex: Alice.AccID,
      toIndex: Bob.AccID,
      tokenType: Alice.TokenType,
      // tokenType: "2",
      amount: tranferAmount,
      // amount: 0,
      signature:
        "0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563",
    };
    var dataToSign = await RollupUtilsInstance.getTxHash(
      tx.fromIndex,
      tx.toIndex,
      tx.tokenType,
      tx.amount
    );

    const h = ethUtils.toBuffer(dataToSign);
    var signature = ethUtils.ecsign(h, wallets[0].getPrivateKey());
    tx.signature = ethUtils.toRpcSig(signature.v, signature.r, signature.s);

    // alice balance tree merkle proof
    var AliceAccountSiblings: Array<string> = [
      BobAccountLeaf,
      utils.getParentLeaf(coordinator, zeroHashes[0]),
      zeroHashes[2],
      zeroHashes[3],
    ];
    var leaf = AliceAccountLeaf;
    var AliceAccountPath: string = "2";
    var isValid = await MTutilsInstance.verifyLeaf(
      currentRoot,
      leaf,
      AliceAccountPath,
      AliceAccountSiblings
    );
    console.log("isValid", isValid)
    expect(isValid).to.be.deep.eq(true);
    var AliceAccountMP = {
      accountIP: {
        pathToAccount: AliceAccountPath,
        account: {
          ID: Alice.AccID,
          tokenType: Alice.TokenType,
          balance: Alice.Amount,
          nonce: 0,
        },
      },
      siblings: AliceAccountSiblings,
    };

    var UpdatedAliceAccountLeaf = utils.CreateAccountLeaf(
      Alice.AccID,
      Alice.Amount - tx.amount,
      0,
      Alice.TokenType
    );

    // bob balance tree merkle proof
    var BobAccountSiblings: Array<string> = [
      UpdatedAliceAccountLeaf,
      utils.getParentLeaf(coordinator, zeroHashes[0]),
      zeroHashes[2],
      zeroHashes[3],
    ];
    var leaf = BobAccountLeaf;
    var BobAccountPath: string = "3";
    var isBobValid = await MTutilsInstance.verifyLeaf(
      currentRoot,
      leaf,
      BobAccountPath,
      BobAccountSiblings
    );

    var BobAccountMP = {
      accountIP: {
        pathToAccount: BobAccountPath,
        account: {
          ID: Bob.AccID,
          tokenType: Bob.TokenType,
          balance: Bob.Amount,
          nonce: 0,
        },
      },
      siblings: BobAccountSiblings,
    };

    // process transaction validity with process tx
    var result = await rollupCoreInstance.processTx(
      currentRoot,
      accountRoot,
      tx,
      alicePDAProof,
      AliceAccountMP,
      BobAccountMP
    );

    console.log("result from processTx: " + JSON.stringify(result));

    var compressedTx = await utils.compressTx(
      tx.fromIndex,
      tx.toIndex,
      tx.amount,
      tx.tokenType,
      tx.signature
    );
    let compressedTxs: string[] = [];
    compressedTxs.push(compressedTx);
    console.log("compressedTx: " + JSON.stringify(compressedTxs));
    console.log("result", result);

    // submit batch for that transactions
    await rollupCoreInstance.submitBatch(
      compressedTxs,
      "0xb6b4b5c6cb43071b3913b1d500b33c52392f7aa85f8a451448e20c3967f2b21a"
    );
  });
});
