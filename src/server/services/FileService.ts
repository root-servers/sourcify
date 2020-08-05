import { FileObject } from '../../common/types';
import { getChainId } from '../../common/Utils';
import dirTree from 'directory-tree';
import path from 'path';
import fs from 'fs';

export interface IFileService {
    getTreeByChainAndAddress(chainId: any, address: string): Promise<Array<string>>;
    getByChainAndAddress(chainId: any, address: string): Promise<Array<FileObject>>;
}

export class FileService implements IFileService {

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
