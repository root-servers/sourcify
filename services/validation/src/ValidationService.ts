import bunyan from 'bunyan';
import Web3 from 'web3';
import { Logger, StringMap } from 'sourcify-core'
import util from 'util';
import AdmZip from 'adm-zip';
import fs from 'fs';
import Path from 'path';

export interface CheckFileResponse {
    files: any,
    error: string
}

export interface IValidationService {
    checkFiles(files: any): CheckFileResponse;
}

export class ValidationService implements IValidationService {
    logger: bunyan;

    constructor(logger?: bunyan) {
        this.logger = logger || Logger("ValidationService");
    }

    checkFiles(files: any) {
        const sanitizedFiles = this.sanitizeInputFiles(this.findInputFiles(files))
        const metadataFiles = this.findMetadataFiles(sanitizedFiles);
        let sources: any = [];
        let error;
        metadataFiles.forEach(metadata => {
            try {
                sources.push(
                    {
                        metadata: metadata,
                        solidity: this.rearrangeSources(metadata, sanitizedFiles)
                    })
            } catch (err) {
                error = err.message;
            }

        });
        const response: CheckFileResponse = {
            files: sources,
            error: error
        }
        return response;
    }

    private findInputFiles(files: any): any {
        const inputs: any = [];

        if (files && files.files) {
            // Case: <UploadedFile[]>
            if (Array.isArray(files.files)) {
                files.files.forEach((file: { data: any; }) => {
                    inputs.push(file.data)
                })
                return inputs;

                // Case: <UploadedFile>
            } else if (files.files["data"]) {
                inputs.push(files.files["data"]);
                return inputs;
            }

            // Case: default
            const msg = `Invalid file(s) detected: ${util.inspect(files.files)}`;
            this.logger.error(msg);
            throw new Error(msg);
        } else if (files) {
            const truffleFiles: any[] = this.attemptTruffleExtraction(files[0]);
            if (truffleFiles) {
                files = truffleFiles;
            }

            files.forEach((file: { data: any; }) => {
                inputs.push(file.data);
            });

            return inputs;
        }

        // If we reach this point, an address has been submitted and searched for
        // but there are no files associated with the request.
        const msg = 'Address for specified chain not found in repository';
        this.logger.info(msg);
        throw new Error(msg);
    }

    private sanitizeInputFiles(inputs: any): string[] {
        const files = [];
        if (!inputs.length) {
            const msg = 'Unable to extract any files. Your request may be misformatted ' +
                'or missing some contents.';
            this.logger.error(msg);
            throw new Error(msg);

        }

        for (const data of inputs) {
            try {
                const val = JSON.parse(data.toString());
                const type = Object.prototype.toString.call(val);

                (type === '[object Object]')
                    ? files.push(JSON.stringify(val))  // JSON formatted metadata
                    : files.push(val);                 // Stringified metadata

            } catch (err) {
                files.push(data.toString())          // Solidity files
            }

        }
        return files;
    }

    /**
     * Selects metadata files from an array of files that may include sources, etc
     * @param  {string[]} files
     * @return {string[]}         metadata
     */
    private findMetadataFiles(files: string[]): any[] {
        const metadataFiles = [];

        for (const i in files) {
            try {
                const m = JSON.parse(files[i])

                // TODO: this might need a stronger validation check.
                //       many assumptions are made about structure of
                //       metadata object after this selection step.
                if (m['language'] === 'Solidity') {
                    metadataFiles.push(m);
                }
            } catch (err) { /* ignore */ }
        }

        if (!metadataFiles.length) {
            const msg = "Metadata file not found. Did you include \"metadata.json\"?";
            this.logger.error(msg);
            throw new Error(msg);
        }

        return metadataFiles;
    }

    /**
     * Validates metadata content keccak hashes for all files and
     * returns mapping of file contents by file name
     * @param  {any}       metadata
     * @param  {string[]}  files    source files
     * @return {StringMap}
     */
    private rearrangeSources(metadata: any, files: string[]): StringMap {
        const sources: StringMap = {}
        const byHash = this.storeByHash(files);

        for (const fileName in metadata.sources) {
            let content: string = metadata.sources[fileName].content;
            const hash: string = metadata.sources[fileName].keccak256;
            if (content) {
                if (Web3.utils.keccak256(content) != hash) {
                    const msg = `Invalid content for file ${fileName}`;
                    this.logger.error(msg);
                    throw new Error(msg);
                }
            } else {
                content = byHash[hash];
            }
            if (!content) {
                const msg = `The metadata file mentions a source file called "${fileName}" ` +
                    `that cannot be found in your upload.\nIts keccak256 hash is ${hash}. ` +
                    `Please try to find it and include it in the upload.`;
                this.logger.error(msg);
                throw new Error(msg);
            }
            sources[fileName] = content;
        }
        return sources;
    }

    /**
     * Generates a map of files indexed by the keccak hash of their contents
     * @param  {string[]}  files sources
     * @return {StringMap}
     */
    private storeByHash(files: string[]): StringMap {
        const byHash: StringMap = {};

        for (const i in files) {
            byHash[Web3.utils.keccak256(files[i])] = files[i]
        }
        return byHash;
    }

    /**
     * Checks whether the provided file is zipped and whether it contains a Truffle project.
     * If so, returns the contained .sol and .json files.
     * 
     * @param zipFile an object containing a data parameter that is actually a Buffer
     * @returns null if not given a zipped project; array of .sol and .json files otherwise
     */
    private attemptTruffleExtraction(zipFile: { data: Buffer }): any[] {
        const timestamp = Date.now().toString();
        const tmpDir = `tmp_unzipped_${timestamp}`;

        try {
            const zip = new AdmZip(zipFile.data);
            zip.extractAllTo(tmpDir);

            let files = fs.readdirSync(tmpDir);
            let prefix = tmpDir;

            const innerDirPath = Path.join(prefix, files[0]);
            if (files.length === 1 && fs.lstatSync(innerDirPath).isDirectory()) { // zip contains one dir in root
                prefix = innerDirPath;
            }

            const truffleConfigPath = Path.join(prefix, "truffle-config.js");
            if (!fs.existsSync(truffleConfigPath)) {
                return null;
            }

            let retFiles: any[] = [];

            const contractsPath = Path.join(prefix, "contracts");
            this.addFilesWithExtension(".sol", contractsPath, retFiles);

            const builtContractsPath = Path.join(prefix, "build", "contracts");
            this.addFilesWithExtension(".json", builtContractsPath, retFiles, this.extractMetadataFromJson);

            retFiles = retFiles.filter(f => f.name !== "Migrations.sol" && f.name !== "Migrations.json");

            return retFiles;

        } catch (err) { // not a zipped truffle project structure
            return null;
        } finally {
            if (fs.existsSync(tmpDir)) {
                this.deleteDirRecursively(tmpDir);
            }
        }
    }

    /**
     * Adds all files with the provided extension from dirPath to the provided ret.
     * Optionally performs a buffer to buffer function on each file.
     * 
     * @param extension all files having this extension will be added to ret
     * @param dirPath the path of the directory to be searched
     * @param ret the array to fill with files
     * @param worker work to perform on each file
     */
    private addFilesWithExtension(extension: string, dirPath: string, ret: any[], worker?: (input: Buffer) => Buffer): void {
        const fileNames = fs.readdirSync(dirPath);

        for (const fileName of fileNames) {
            if (fileName.endsWith(extension)) {
                const filePath = Path.join(dirPath, fileName);
                let file = fs.readFileSync(filePath);
                if (worker) {
                    file = worker(file);
                }
                ret.push({ name: fileName, data: file });
            }
        }
    }

    /**
     * Extracts metadata from the provided input buffer. The Buffer is expected to contain a JSON object.
     * @param input the input buffer containing a stringified JSON object with metadata property
     * @returns a buffer containing the extracted metadata
     */
    private extractMetadataFromJson(input: Buffer): Buffer {
        const parsed = JSON.parse(input.toString()); // TODO encoding?
        if (!parsed.metadata) {
            throw Error("No property named 'metadata' in the provided object.");
        }
        const metadataStr = parsed.metadata;
        return Buffer.from(metadataStr);
    }

    /**
     * Deletes the provided directory and its content.
     * 
     * @param dirPath the path of the dir to be deleted
     */
    private deleteDirRecursively(dirPath: string) {
        if (!fs.existsSync(dirPath)) {
            return;
        }

        fs.readdirSync(dirPath).forEach(nestedName => {
            const nestedPath = Path.join(dirPath, nestedName);
            if (fs.lstatSync(nestedPath).isDirectory()) {
                this.deleteDirRecursively(nestedPath);
            } else {
                fs.unlinkSync(nestedPath);
            }
        });

        fs.rmdirSync(dirPath);
    }
}