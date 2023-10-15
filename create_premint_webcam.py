from datetime import datetime
import time
import os
import io
import pprint

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
    rpc="https://rpc.zora.energy/", chainId=777777, chainName="ZORA-MAINNET"
)
ZORA_TESTNET = dict(
    rpc="https://testnet.rpc.zora.energy/", chainId=999, chainName="ZORA-GOERLI"
)

NETWORK = ZORA_TESTNET



PREMINTER_EXECUTOR_ABI = None
with open('./premint_abi.json') as f:
    PREMINTER_EXECUTOR_ABI = json.read(f)

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
            print("Exception when calling NFTStorageAPI->store: %s\n" % e)


def get_verifying_address(w3: Web3, **contractData):
    preminter_contract = w3.eth.contract(
        CONTRACTS["preminterContract"], abi=PREMINTER_GET_CONTRACT_ADDRESS_ABI
    )
    return preminter_contract.caller.getContractAddress(contractData)


def get_next_uid(verifying_address: str, chain_name: str):
    next_uid_response = requests.get(
        f"{ZORA_API_BASE}signature/{chain_name}/{verifying_address}/next_uid"
    ).json()
    print(next_uid_response)
    return next_uid_response["next_uid"]


def create_premint_data(metadata_url):
    w3 = Web3(Web3.HTTPProvider(NETWORK["rpc"]))

    account = Account.create(os.getenv("SIGNING_USER_PRIVATE_KEY"))
    sender_address = account.address

    collection_data = dict(
        contractAdmin=sender_address,
        contractURI=os.getenv("TARGET_CONTRACT_METADATA"),
        contractName=os.getenv("TARGET_CONTRACT_NAME"),
    )

    # web3py get verifying address
    verifying_address = get_verifying_address(w3=w3, **collection_data)

    uid = get_next_uid(verifying_address, NETWORK["chainName"])

    print("verifying address", verifying_address)

    # centralized ZORA get nonce

    message_data = dict(
        tokenConfig=dict(
            tokenURI=metadata_url,
            maxSupply=18446744073709551615,
            maxTokensPerAddress=0,
            pricePerToken=0,
            mintStart=0,
            # one week
            mintDuration=60 * 60 * 24 * 7,
            royaltyMintSchedule=0,
            royaltyBPS=1000,
            royaltyRecipient=sender_address,
            fixedPriceMinter=CONTRACTS["fixedPriceMinter"],
        ),
        uid=uid,
        version=1,
        deleted=False,
    )

    pprint.pprint(message_data)

    message = encode_structured_data(
        dict(
            domain=dict(
                chainId=7777777,
                name="Preminter",
                verifyingContract=verifying_address,
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
    sig = Account.sign_message(
        signable_message=message,
        private_key=os.getenv("SIGNING_USER_PRIVATE_KEY"),
    )

    api_data = dict(
        collection=collection_data,
        premint=message_data,
        chain_name=NETWORK["chainName"],
        signature=Web3.to_hex(sig.signature),
    )

    pprint.pprint(api_data)

    api_response = requests.post(
        f"{ZORA_API_BASE}signature",
        json=api_data,
    ).json()

    pprint.pprint(api_response)


def main():
    # frame = take_photo()
    # pprint.pprint(frame)
    # photo_url = upload_photo(frame)
    # print(photo_url)
    # return
    photo_metadata = (
        "ipfs://bafkreid6qa3z5qbiamt24rj2hskfg6nnqrieznexwzefcpb4c7zlb66l7u"
    )
    create_premint_data(photo_metadata)


if __name__ == "__main__":
    main()
