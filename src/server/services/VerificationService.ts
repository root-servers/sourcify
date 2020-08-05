import { FileObject } from '../../common/types';
import { getChainId } from '../../common/Utils';
import dirTree from 'directory-tree';
import path from 'path';
import fs from 'fs';

export interface IVerificationService {
    getTreeByChainAndAddress(chainId: any, address: string): Promise<Array<string>>;
    getByChainAndAddress(chainId: any, address: string): Promise<Array<FileObject>>;
}

export class VerificationService implements IVerificationService {

    async getTreeByChainAndAddress(chainId: any, address: string): Promise<string[]> {
        chainId = getChainId(chainId);
        return this.fetchAllFileUrls(chainId, address);
    }
    
    async getByChainAndAddress(chainId: any, address: string): Promise<FileObject[]> {
        chainId = getChainId(chainId);
        return this.fetchAllFileContents(chainId, address);
    }

    fetchAllFileUrls(chain: string, address: string): Array<string> {
        const files: Array<FileObject> = this.fetchAllFilePaths(chain, address);
        const urls: Array<string> = [];
        files.forEach((file) => {
          const relativePath = file.path.split('/repository')[1].substr(1);
          urls.push(`${process.env.REPOSITORY_URL}${relativePath}`);
        });
        return urls;
      }
      
    fetchAllFilePaths(chain: string, address: string): Array<FileObject>{
        const fullPath: string = path.resolve(__dirname, `../../../repository/contract/${chain}/${address}/`);
        const files: Array<FileObject> = [];
        dirTree(fullPath, {}, (item) => {
          files.push({"name": item.name, "path": item.path});
        });
        return files;
      }
      
    fetchAllFileContents(chain: string, address: string): Array<FileObject>{
        const files = this.fetchAllFilePaths(chain, address);
          for(const file in files){
            const loadedFile = fs.readFileSync(files[file].path)
            files[file].content = loadedFile.toString();
        }

        return files;    
    }

}









/* tslint:enable:no-unused-variable */
app.post('/', (req, res, next) => {
    const inputData: InputData = {
      repository: repository,
      files: [],
      addresses: [req.body.address],
      chain: getChainId(req.body.chain)
    }
  
    // Try to find by address, return on success.
    try {
      const result = findByAddress(req.body.address, inputData.chain, repository);
      res.status(200).send({result});
      return;
    } catch(err) {
      const msg = "Could not find file in repository, proceeding to recompilation"
      log.info({loc:'[POST:VERIFICATION_BY_ADDRESS_FAILED]'}, msg);
    }
  
    // Try to organize files for submission, exit on error.
    try {
      const files = findInputFiles(req, log);
      inputData.files = sanitizeInputFiles(files, log);
    } catch (err) {
      return next(err);
    }
  
    // Injection
    const promises: Promise<Match>[] = [];
    promises.push(injector.inject(inputData));
  
    // This is so we can have multiple parallel injections, logic still has to be completely implemented
    Promise.all(promises).then((result) => {
      res.status(200).send({result});
    }).catch(err => {
      next(err); // Just forward it to error middelware
    })
  })
