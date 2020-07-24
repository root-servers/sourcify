import {SERVER_URL} from "../common/constants";

type ResponseBody =  {
    error?: string,
    result?: [
        {address?: string, status?: string}
    ]
}

type VerificationResult = {
    status: string,
    error: string,
    address: string
}

export const verify = async (formData: any): Promise<VerificationResult> => {
    const data:VerificationResult = {
        status: "",
        error: "",
        address: ""
    }

    try {
        const response = await fetch(SERVER_URL, {
            method: "POST",
            body: formData
        })
        const body: ResponseBody = await response.json();

        if (body.error) {
            data.error = body.error;
        } else {
            data.address = body.result[0].address;
            data.status = body.result[0].status;
        }

    } catch (e) {
        console.log(e);
        data.error = e.message;
    }
    return data;
}

type CheckAddressesResult = {
    successful: string[],
    unsuccessful: string[]
}

type CheckAddressesBody = [
    {
        address: string,
        status: string
    }
]

export const checkddresses = async (addresses: string, chainIds: string): Promise<CheckAddressesResult> => {
    const data: CheckAddressesResult = {
        successful: [],
        unsuccessful: []
    }

    try {
        const response = await fetch(`http://localhost:2000/checkByAddresses?addresses=${addresses}&chainIds=${chainIds}`)
        const body: CheckAddressesBody = await response.json();

        data.successful = body.filter(value => value.status === 'perfect').map(e => e.address);
        data.unsuccessful = body.filter(value => value.status === 'false').map(e => e.address);

        return data;
    } catch (e) {
        console.log(e.messages)
    }
}