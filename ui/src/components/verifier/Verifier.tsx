import React, {useEffect, useReducer, useState} from "react";
import {verifierReducer} from "../../reducers/verifierReducer";
import {VerifierState} from "../../types";
import {
    CHAIN_OPTIONS as chainOptions,
    REPOSITORY_URL_FULL_MATCH,
    REPOSITORY_URL_PARTIAL_MATCH
} from "../../common/constants";
import {FileUpload, AddressInput} from "./form";
import Dropdown from "../Dropdown";
import LoadingOverlay from "../LoadingOverlay";
import {useDispatchContext} from "../../state/State";
import {checkAddresses, verify} from "../../api/verifier";
import Web3 from "web3-utils";
import {getChainIds} from "../../utils";

const initialState: VerifierState = {
    loading: false,
    address: "",
    chain: chainOptions[0],
    files: []
}

const Verifier: React.FC = () => {
    const [state, dispatch] = useReducer(verifierReducer, initialState);
    const [error, setError] = useState(new Set());
    const [loadingAddress, setLoadingAddress] = useState(false);
    const globalDispatch = useDispatchContext();
    const [isValidationError, setIsValidationError] = useState(false);

    useEffect(() => {

        // reset values
        error.clear();
        setError(error);
        setLoadingAddress(false);

        // check if input is empty
        if (state.address.length > 0) {
            const addresses = state.address.split(',');

            // check if inputted addresses are valid
            addresses.forEach(address => {
                if (!Web3.isAddress(address)) {
                    error.add(address);
                    setError(error);
                }
            });

            // check if there is any address that doesn't pass validation
            if (error.size >= 1) {
                console.log('There is error');
                setIsValidationError(true)
                return;
            }

            setIsValidationError(false);
            setLoadingAddress(true);

            console.log('Fire api call');
            checkAddresses(addresses.join(','), getChainIds()).then(data => {
                // if there are addresses that doesn't exist in repo
                if (data.unsuccessful.length > 0) {
                    globalDispatch({
                        type: "SHOW_NOTIFICATION",
                        payload: {type: "error", content: data.unsuccessful.join(',')}
                    });
                } else {
                    globalDispatch({
                        type: "SHOW_NOTIFICATION",
                        payload: {type: "success", content: 'Addresses successfully verified!'}
                    });
                }
                setLoadingAddress(false);
            });
        }
    }, [state.address])

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(
            {type: "SET_ADDRESS", payload: e.target.value}
        )
    }

    const handleFiles = (files: []) => {
        dispatch(
            {type: "SET_FILES", payload: files}
        )
    }

    const clearFiles = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
        event.preventDefault();
        dispatch(
            {type: "CLEAR_FILES"}
        );
    }

    const handleOnSelect = (chain: any) => {
        dispatch(
            {type: "SET_CHAIN", payload: chain}
        )
    }

    const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        globalDispatch({type: "REMOVE_NOTIFICATION"});

        dispatch({type: "SET_LOADING", payload: true})

        const formData = new FormData();
        formData.append("address", state.address);
        formData.append("chain", state.chain.id.toString());

        if (state.files.length > 0) {
            state.files.forEach(file => formData.append('files', file));
        }

        const data = await verify(formData);

        if (data.error) {
            globalDispatch({type: "SHOW_NOTIFICATION", payload: {type: "error", content: data.error}});
            dispatch({type: "SET_LOADING", payload: false});
            return;
        }

        if (data.status === 'partial') {
            globalDispatch({
                type: "SHOW_NOTIFICATION", payload: {
                    type: "success",
                    content: () => <p>Contract partially verified! View the assets in the <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href={`${REPOSITORY_URL_PARTIAL_MATCH}/${state.chain.id}/${data.address}`}>file explorer.</a>
                    </p>
                }
            });
            dispatch({type: "SET_LOADING", payload: false});
            return;
        }

        globalDispatch({
            type: "SHOW_NOTIFICATION", payload: {
                type: "success",
                content: () => <p>Contract successfully verified! View the assets in the <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`${REPOSITORY_URL_FULL_MATCH}/${state.chain.id}/${data.address}`}>file explorer.</a>
                </p>
            }
        });

        dispatch({type: "SET_LOADING", payload: false});
    }

    return (
        <div className="form-container">
            {state.loading && <LoadingOverlay/>}
            <div className="form-container__header">
                <h3>VERIFIER</h3>
            </div>
            <div className="form-container__middle">
                <form className="form" onSubmit={onSubmit}>
                    <Dropdown items={chainOptions} initialValue={chainOptions[0]} onSelect={handleOnSelect}/>
                    <div>
                        <AddressInput onChange={handleAddressChange}/>
                        {loadingAddress && <span>Verifying</span>}
                    </div>
                    {isValidationError && error.size === 1 &&
                        <span className="validation validation--error">Address is not valid</span>
                    }
                    {isValidationError && error.size > 1 &&
                    <span className="validation validation--error">Some of the addresses are not valid</span>
                    }
                    {
                        state.files.length > 0 && <div className="form__file-upload-header">
                            <span>FILES ({state.files.length})</span>
                            <button onClick={clearFiles}>CLEAR ALL</button>
                        </div>
                    }
                    <FileUpload handleFiles={handleFiles} files={state.files}/>
                    <button type="submit"
                            className={`form__submit-btn ${!state.address ? `form__submit-btn--disabled` : ""}`}
                            disabled={!state.address}>VERIFY
                    </button>
                </form>
            </div>
        </div>
    )
}

export default Verifier;