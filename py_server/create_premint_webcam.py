from datetime import datetime
import time
import os
import io
import logging

import requests
import nft_storage
from nft_storage.api import nft_storage_api
from eth_account import Account
import cv2
import json
from eth_account.messages import encode_structured_data
from dotenv import load_dotenv
from web3 import Web3


load_dotenv()

CONTRACTS = dict(
    fixedPriceMinter="0x04E2516A2c207E84a1839755675dfd8eF6302F0a",
    preminterContract="0x7777773606e7e46C8Ba8B98C08f5cD218e31d340",
)

ZORA_API_BASE = "https://api.zora.co/premint/"

ZORA_MAINNET = dict(
    rpc="https://rpc.zora.energy/",
    chainId=7777777,
    chainName="ZORA-MAINNET",
    isTestnet=False,
    zoraChainPrefix="zora",
)
ZORA_TESTNET = dict(
    rpc="https://testnet.rpc.zora.energy/",
    chainId=999,
    chainName="ZORA-GOERLI",
    isTestnet=True,
    zoraChainPrefix="zgor",
)

# only zora mainnet works right now
NETWORK = ZORA_TESTNET

OPEN_EDITION_MINT_SIZE = 18446744073709551615

TOKEN_CONFIG = dict(
    maxSupply=OPEN_EDITION_MINT_SIZE,  # number of mints
    mintDuration=60 * 60 * 24 * 3,  # in seconds (currently 7 days)
    pricePerToken=0,  # in wei
    maxTokensPerAddress=0,  # 0=limited, any other # is a limit
    mintStart=0,  # set a mint start in the future, set to 0 for immediate minting allowed
    royaltyBPS=1000,  # BPS royalty amount (1000 = 10% resale royalty suggestion)
)


PREMINTER_EXECUTOR_ABI = None
with open("./premint_abi.json") as f:
    PREMINTER_EXECUTOR_ABI = json.load(f)


def take_photo():
    camera = cv2.VideoCapture(0)
    ret, frame = camera.read()
    time.sleep(2)
    ret, frame = camera.read()
    camera.release()
    del camera
    if ret:
        ret, encoded = cv2.imencode(".jpg", frame)
        if ret:
            return io.BytesIO(encoded.tobytes())
        else:
            raise RuntimeError("No image")


def upload_photo(photo):
    with nft_storage.ApiClient(
        nft_storage.Configuration(access_token=os.environ.get("NFT_STORAGE_API_KEY"))
    ) as api_client:
        api_instance = nft_storage_api.NFTStorageAPI(api_client)
        try:
            image_stored = api_instance.store(photo, _check_return_type=False)
            print(image_stored)
            if not image_stored["ok"]:
                raise RuntimeError()
            image_cid = image_stored["value"]["cid"]
            metadata = json.dumps(
                dict(
                    name=f"SCREENSHOT AT {datetime.now().isoformat()}",
                    description="a thing",
                    image=f"ipfs://{image_cid}",
                )
            )
            metadata_io = io.StringIO(metadata)
            metadata_io.name = "metadata.json"
            metadata_stored = api_instance.store(metadata_io, _check_return_type=False)
            if not metadata_stored["ok"]:
                raise RuntimeError()
            metadata_cid = metadata_stored["value"]["cid"]
            return f"ipfs://{metadata_cid}"
        except nft_storage.ApiException as e:
            logging.error("Exception when calling NFTStorageAPI->store: %s" % e)


def get_preminter_contract(w3: Web3):
    return w3.eth.contract(CONTRACTS["preminterContract"], abi=PREMINTER_EXECUTOR_ABI)


def get_target_contract_address(w3: Web3, **contractData):
    return get_preminter_contract(w3).caller.getContractAddress(contractData)


def get_next_uid(verifying_address: str, chain_name: str):
    next_uid_response = requests.get(
        f"{ZORA_API_BASE}signature/{chain_name}/{verifying_address.lower()}/next_uid"
    ).json()
    logging.info("getting next uid : ", extra=next_uid_response)
    return next_uid_response["next_uid"]


def get_minting_url(premint_response):
    contract_address = premint_response["contract_address"]
    uid = premint_response["api_data"]["premint"]["uid"]
    zora_chain_prefix = NETWORK["zoraChainPrefix"]
    domain = "zora.co"
    if NETWORK["isTestnet"]:
        domain = "testnet.zora.co"
    return (
        f"https://{domain}/collect/{zora_chain_prefix}:{contract_address}/premint-{uid}"
    )


def create_premint_data(metadata_url):
    w3 = Web3(Web3.HTTPProvider(NETWORK["rpc"]))
    private_key = os.getenv("SIGNING_USER_PRIVATE_KEY")

    account = Account.from_key(private_key)

    sender_address = account.address

    collection_data = dict(
        contractAdmin=sender_address,
        contractURI=os.getenv("TARGET_CONTRACT_METADATA"),
        contractName=os.getenv("TARGET_CONTRACT_NAME"),
    )

    # web3py get verifying address
    target_contract_address = get_target_contract_address(w3=w3, **collection_data)

    # centralized ZORA get nonce
    uid = get_next_uid(target_contract_address, NETWORK["chainName"])

    logging.info(f"Signing with uid {uid} and sender address {sender_address}")

    # setup signing message data
    message_data = dict(
        tokenConfig=dict(
            tokenURI=metadata_url,
            maxSupply=TOKEN_CONFIG["maxSupply"],
            maxTokensPerAddress=TOKEN_CONFIG["maxTokensPerAddress"],
            pricePerToken=TOKEN_CONFIG["pricePerToken"],
            mintStart=TOKEN_CONFIG["mintStart"],
            # one week
            mintDuration=TOKEN_CONFIG["mintDuration"],
            royaltyMintSchedule=0,
            royaltyBPS=TOKEN_CONFIG["royaltyBPS"],
            royaltyRecipient=sender_address,
            fixedPriceMinter=CONTRACTS["fixedPriceMinter"],
        ),
        uid=uid,
        version=1,
        deleted=False,
    )

    message = encode_structured_data(
        dict(
            domain=dict(
                chainId=NETWORK["chainId"],
                name="Preminter",
                verifyingContract=target_contract_address,
                version="1",
            ),
            message=message_data,
            primaryType="CreatorAttribution",
            types={
                "EIP712Domain": [
                    {"name": "name", "type": "string"},
                    {"name": "version", "type": "string"},
                    {"name": "chainId", "type": "uint256"},
                    {"name": "verifyingContract", "type": "address"},
                ],
                "CreatorAttribution": [
                    {"name": "tokenConfig", "type": "TokenCreationConfig"},
                    {"name": "uid", "type": "uint32"},
                    {"name": "version", "type": "uint32"},
                    {"name": "deleted", "type": "bool"},
                ],
                "TokenCreationConfig": [
                    {"name": "tokenURI", "type": "string"},
                    {"name": "maxSupply", "type": "uint256"},
                    {"name": "maxTokensPerAddress", "type": "uint64"},
                    {"name": "pricePerToken", "type": "uint96"},
                    {"name": "mintStart", "type": "uint64"},
                    {"name": "mintDuration", "type": "uint64"},
                    {"name": "royaltyMintSchedule", "type": "uint32"},
                    {"name": "royaltyBPS", "type": "uint32"},
                    {"name": "royaltyRecipient", "type": "address"},
                    {"name": "fixedPriceMinter", "type": "address"},
                ],
            },
        )
    )
    signature = account.sign_message(
        signable_message=message,
    ).signature.hex()

    api_data = dict(
        collection=collection_data,
        premint=message_data,
        chain_name=NETWORK["chainName"],
        signature=signature,
    )

    print(collection_data, message_data, signature)
    # for debugging when API says invalid
    contract_response = get_preminter_contract(w3).caller.isValidSignature(
        collection_data, message_data, signature
    )
    print(contract_response)
    logging.info(f"Contract response {contract_response}")

    api_response = requests.post(
        f"{ZORA_API_BASE}signature",
        json=api_data,
    )

    if api_response.status_code != 200:
        print(api_response.content)
        print(api_response.headers)
        logging.error(
            "Error getting API premint status",
            extra=dict(content=api_response.content, headers=api_response.headers),
        )
        raise RuntimeError("Cannot mint")

    api_json = api_response.json()

    return dict(
        api_response=api_json,
        api_data=api_data,
        contract_address=target_contract_address,
    )


# example usage
def main():
    # frame = take_photo()
    # photo_metadata = upload_photo(frame)
    # demo
    photo_metadata = (
        "ipfs://bafkreid6qa3z5qbiamt24rj2hskfg6nnqrieznexwzefcpb4c7zlb66l7u"
    )
    premint_signature_data = create_premint_data(photo_metadata)
    minting_url = get_minting_url(premint_signature_data)
    print(minting_url)


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    main()
